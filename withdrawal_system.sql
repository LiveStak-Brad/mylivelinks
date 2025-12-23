-- ============================================================================
-- MyLiveLinks: Withdrawal System (Ready for Stripe Connect)
-- ============================================================================
-- 
-- Enables streamers to cash out diamonds/earnings to real money
-- Designed for Stripe Connect integration (can adapt to other providers)
-- ============================================================================

-- ============================================================================
-- 1. ADD WITHDRAWAL FIELDS TO PROFILES
-- ============================================================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS withdrawal_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS total_withdrawn BIGINT DEFAULT 0 CHECK (total_withdrawn >= 0),
ADD COLUMN IF NOT EXISTS pending_withdrawal_amount BIGINT DEFAULT 0 CHECK (pending_withdrawal_amount >= 0),
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50), -- SSN/EIN for 1099s
ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payout_method VARCHAR(50) DEFAULT 'stripe' CHECK (payout_method IN ('stripe', 'paypal', 'ach', 'wire'));

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect_account_id ON profiles(stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_withdrawal_enabled ON profiles(withdrawal_enabled) WHERE withdrawal_enabled = TRUE;

COMMENT ON COLUMN profiles.stripe_connect_account_id IS 'Stripe Connect account ID for payouts';
COMMENT ON COLUMN profiles.withdrawal_enabled IS 'User has completed KYC and can request withdrawals';
COMMENT ON COLUMN profiles.total_withdrawn IS 'Lifetime total withdrawn (in cents/diamonds)';
COMMENT ON COLUMN profiles.pending_withdrawal_amount IS 'Amount currently pending in withdrawal requests';
COMMENT ON COLUMN profiles.tax_id IS 'Tax ID (SSN/EIN) for 1099 reporting';
COMMENT ON COLUMN profiles.kyc_verified IS 'KYC/identity verification completed';

-- ============================================================================
-- 2. CREATE WITHDRAWALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS withdrawals (
    id BIGSERIAL PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Amounts (all in diamonds/cents)
    diamonds_requested BIGINT NOT NULL CHECK (diamonds_requested > 0),
    platform_fee_amount BIGINT NOT NULL CHECK (platform_fee_amount >= 0), -- Platform fee (e.g., 5-10%)
    net_payout_amount BIGINT NOT NULL CHECK (net_payout_amount > 0), -- Amount after fees
    usd_amount DECIMAL(10, 2) NOT NULL CHECK (usd_amount > 0), -- USD equivalent
    -- Payment processing
    stripe_connect_account_id VARCHAR(255), -- Stripe Connect account
    stripe_payout_id VARCHAR(255) UNIQUE, -- Stripe payout ID (when processed)
    payout_method VARCHAR(50) NOT NULL DEFAULT 'stripe' CHECK (payout_method IN ('stripe', 'paypal', 'ach', 'wire')),
    -- Status workflow: pending -> processing -> completed/failed/cancelled
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'rejected')),
    -- Admin workflow
    requires_approval BOOLEAN DEFAULT FALSE, -- High-value withdrawals need approval
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Admin who approved
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT, -- If rejected
    -- Processing timestamps
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    -- Metadata
    failure_reason TEXT, -- If failed
    metadata JSONB, -- Additional payment provider data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_withdrawals_profile_id ON withdrawals(profile_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_withdrawals_requested_at ON withdrawals(requested_at DESC);
CREATE INDEX idx_withdrawals_profile_status ON withdrawals(profile_id, status);
CREATE INDEX idx_withdrawals_stripe_payout_id ON withdrawals(stripe_payout_id) WHERE stripe_payout_id IS NOT NULL;
CREATE INDEX idx_withdrawals_stripe_connect_account_id ON withdrawals(stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;

-- Enable RLS on withdrawals
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view own withdrawals
CREATE POLICY "Users can view own withdrawals"
    ON withdrawals FOR SELECT
    USING (auth.uid() = profile_id);

-- RLS Policy: Users can insert own withdrawal requests
CREATE POLICY "Users can request own withdrawals"
    ON withdrawals FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

-- RLS Policy: Admins can view all withdrawals (for admin dashboard)
-- Note: You'll need to add admin role check or use service role key for admin queries

COMMENT ON TABLE withdrawals IS 'Withdrawal requests for cashing out diamonds to real money. Status: pending -> processing -> completed/failed.';

-- ============================================================================
-- 3. CREATE WITHDRAWAL CONFIG TABLE (Platform Settings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS withdrawal_config (
    id BIGSERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Insert default withdrawal settings
INSERT INTO withdrawal_config (config_key, config_value, description) VALUES
    ('min_withdrawal_diamonds', '10000', 'Minimum diamonds required for withdrawal (e.g., 10,000 = $100 at 1 diamond = $0.01)'),
    ('platform_fee_percent', '5', 'Platform fee percentage on withdrawals (e.g., 5 = 5%)'),
    ('max_withdrawal_diamonds', '10000000', 'Maximum single withdrawal (e.g., 10M = $100k)'),
    ('requires_approval_threshold_diamonds', '1000000', 'Withdrawals above this require admin approval (e.g., 1M = $10k)'),
    ('processing_fee_diamonds', '0', 'Fixed processing fee in diamonds (e.g., 0 = no fixed fee)'),
    ('stripe_connect_enabled', 'true', 'Stripe Connect integration enabled'),
    ('payout_schedule', 'daily', 'Payout schedule: daily, weekly, monthly, instant'),
    ('kyc_required', 'true', 'KYC verification required before withdrawals')
ON CONFLICT (config_key) DO NOTHING;

COMMENT ON TABLE withdrawal_config IS 'Platform-wide withdrawal settings. Update via admin panel.';

-- ============================================================================
-- 4. CREATE RPC: REQUEST WITHDRAWAL
-- ============================================================================

CREATE OR REPLACE FUNCTION request_withdrawal(
    p_profile_id UUID,
    p_diamonds_requested BIGINT,
    p_payout_method VARCHAR(50) DEFAULT 'stripe'
)
RETURNS BIGINT AS $$
DECLARE
    v_withdrawal_id BIGINT;
    v_diamond_balance BIGINT;
    v_pending_withdrawal BIGINT;
    v_min_withdrawal BIGINT;
    v_max_withdrawal BIGINT;
    v_platform_fee_percent DECIMAL(5, 2);
    v_platform_fee_amount BIGINT;
    v_net_payout BIGINT;
    v_usd_amount DECIMAL(10, 2);
    v_requires_approval_threshold BIGINT;
    v_requires_approval BOOLEAN;
    v_withdrawal_enabled BOOLEAN;
    v_kyc_verified BOOLEAN;
    v_stripe_account_id VARCHAR(255);
    v_diamond_to_usd_rate DECIMAL(10, 4) := 0.01; -- 1 diamond = $0.01 (adjust as needed)
BEGIN
    -- Check if withdrawal is enabled for user
    SELECT withdrawal_enabled, kyc_verified, stripe_connect_account_id
    INTO v_withdrawal_enabled, v_kyc_verified, v_stripe_account_id
    FROM profiles
    WHERE id = p_profile_id;
    
    IF NOT v_withdrawal_enabled THEN
        RAISE EXCEPTION 'Withdrawal not enabled. Please complete KYC verification first.';
    END IF;
    
    IF NOT v_kyc_verified THEN
        RAISE EXCEPTION 'KYC verification required before withdrawals.';
    END IF;
    
    -- Get withdrawal config
    SELECT config_value::BIGINT INTO v_min_withdrawal FROM withdrawal_config WHERE config_key = 'min_withdrawal_diamonds';
    SELECT config_value::BIGINT INTO v_max_withdrawal FROM withdrawal_config WHERE config_key = 'max_withdrawal_diamonds';
    SELECT config_value::DECIMAL INTO v_platform_fee_percent FROM withdrawal_config WHERE config_key = 'platform_fee_percent';
    SELECT config_value::BIGINT INTO v_requires_approval_threshold FROM withdrawal_config WHERE config_key = 'requires_approval_threshold_diamonds';
    
    -- Validate minimum withdrawal
    IF p_diamonds_requested < v_min_withdrawal THEN
        RAISE EXCEPTION 'Minimum withdrawal is % diamonds', v_min_withdrawal;
    END IF;
    
    -- Validate maximum withdrawal
    IF p_diamonds_requested > v_max_withdrawal THEN
        RAISE EXCEPTION 'Maximum withdrawal is % diamonds', v_max_withdrawal;
    END IF;
    
    -- Check diamond balance
    SELECT earnings_balance, pending_withdrawal_amount
    INTO v_diamond_balance, v_pending_withdrawal
    FROM profiles
    WHERE id = p_profile_id;
    
    IF v_diamond_balance < (p_diamonds_requested + v_pending_withdrawal) THEN
        RAISE EXCEPTION 'Insufficient diamond balance. Available: %, Requested: %, Pending: %', 
            v_diamond_balance, p_diamonds_requested, v_pending_withdrawal;
    END IF;
    
    -- Calculate fees and net payout
    v_platform_fee_amount := FLOOR(p_diamonds_requested * (v_platform_fee_percent / 100.0));
    v_net_payout := p_diamonds_requested - v_platform_fee_amount;
    v_usd_amount := v_net_payout * v_diamond_to_usd_rate;
    
    -- Check if requires approval
    v_requires_approval := p_diamonds_requested >= v_requires_approval_threshold;
    
    -- Insert withdrawal request
    INSERT INTO withdrawals (
        profile_id,
        diamonds_requested,
        platform_fee_amount,
        net_payout_amount,
        usd_amount,
        stripe_connect_account_id,
        payout_method,
        status,
        requires_approval
    )
    VALUES (
        p_profile_id,
        p_diamonds_requested,
        v_platform_fee_amount,
        v_net_payout,
        v_usd_amount,
        v_stripe_account_id,
        p_payout_method,
        CASE WHEN v_requires_approval THEN 'pending' ELSE 'pending' END,
        v_requires_approval
    )
    RETURNING id INTO v_withdrawal_id;
    
    -- Deduct diamonds from balance and add to pending
    UPDATE profiles
    SET earnings_balance = earnings_balance - p_diamonds_requested,
        pending_withdrawal_amount = pending_withdrawal_amount + p_diamonds_requested,
        last_transaction_at = CURRENT_TIMESTAMP
    WHERE id = p_profile_id;
    
    -- Record in ledger
    INSERT INTO coin_ledger (profile_id, amount, asset_type, type, ref_type, ref_id, description)
    VALUES (p_profile_id, -p_diamonds_requested, 'diamond', 'admin_adjustment', 'withdrawal', v_withdrawal_id,
            'Withdrawal request: ' || p_diamonds_requested || ' diamonds');
    
    RETURN v_withdrawal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION request_withdrawal IS 'Request withdrawal: deducts diamonds, creates withdrawal record. Returns withdrawal_id.';

-- ============================================================================
-- 5. CREATE RPC: APPROVE WITHDRAWAL (Admin)
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_withdrawal(
    p_withdrawal_id BIGINT,
    p_admin_id UUID
)
RETURNS void AS $$
DECLARE
    v_profile_id UUID;
    v_status VARCHAR(20);
BEGIN
    -- Get withdrawal details
    SELECT profile_id, status INTO v_profile_id, v_status
    FROM withdrawals
    WHERE id = p_withdrawal_id;
    
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Withdrawal not found';
    END IF;
    
    IF v_status != 'pending' THEN
        RAISE EXCEPTION 'Withdrawal is not pending. Current status: %', v_status;
    END IF;
    
    -- Update withdrawal status
    UPDATE withdrawals
    SET status = 'processing',
        approved_by = p_admin_id,
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_withdrawal_id;
    
    -- Note: Actual payout processing happens via Stripe Connect API call (outside SQL)
    -- This function just marks it as approved/processing
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION approve_withdrawal IS 'Admin function: Approve withdrawal request. Actual payout via Stripe Connect API.';

-- ============================================================================
-- 6. CREATE RPC: COMPLETE WITHDRAWAL (After Stripe Payout)
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_withdrawal(
    p_withdrawal_id BIGINT,
    p_stripe_payout_id VARCHAR(255),
    p_metadata JSONB DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_profile_id UUID;
    v_diamonds_requested BIGINT;
    v_status VARCHAR(20);
BEGIN
    -- Get withdrawal details
    SELECT profile_id, diamonds_requested, status INTO v_profile_id, v_diamonds_requested, v_status
    FROM withdrawals
    WHERE id = p_withdrawal_id;
    
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Withdrawal not found';
    END IF;
    
    IF v_status != 'processing' THEN
        RAISE EXCEPTION 'Withdrawal is not processing. Current status: %', v_status;
    END IF;
    
    -- Update withdrawal as completed
    UPDATE withdrawals
    SET status = 'completed',
        stripe_payout_id = p_stripe_payout_id,
        processed_at = CURRENT_TIMESTAMP,
        completed_at = CURRENT_TIMESTAMP,
        metadata = COALESCE(p_metadata, metadata),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_withdrawal_id;
    
    -- Update profile: remove from pending, add to total_withdrawn
    UPDATE profiles
    SET pending_withdrawal_amount = pending_withdrawal_amount - v_diamonds_requested,
        total_withdrawn = total_withdrawn + v_diamonds_requested,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION complete_withdrawal IS 'Mark withdrawal as completed after Stripe payout succeeds. Call from webhook handler.';

-- ============================================================================
-- 7. CREATE RPC: FAIL WITHDRAWAL (If Stripe Payout Fails)
-- ============================================================================

CREATE OR REPLACE FUNCTION fail_withdrawal(
    p_withdrawal_id BIGINT,
    p_failure_reason TEXT
)
RETURNS void AS $$
DECLARE
    v_profile_id UUID;
    v_diamonds_requested BIGINT;
    v_status VARCHAR(20);
BEGIN
    -- Get withdrawal details
    SELECT profile_id, diamonds_requested, status INTO v_profile_id, v_diamonds_requested, v_status
    FROM withdrawals
    WHERE id = p_withdrawal_id;
    
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Withdrawal not found';
    END IF;
    
    IF v_status NOT IN ('processing', 'pending') THEN
        RAISE EXCEPTION 'Withdrawal cannot be failed. Current status: %', v_status;
    END IF;
    
    -- Update withdrawal as failed
    UPDATE withdrawals
    SET status = 'failed',
        failure_reason = p_failure_reason,
        failed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_withdrawal_id;
    
    -- Refund diamonds back to balance
    UPDATE profiles
    SET earnings_balance = earnings_balance + v_diamonds_requested,
        pending_withdrawal_amount = pending_withdrawal_amount - v_diamonds_requested,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_profile_id;
    
    -- Record refund in ledger
    INSERT INTO coin_ledger (profile_id, amount, asset_type, type, ref_type, ref_id, description)
    VALUES (v_profile_id, v_diamonds_requested, 'diamond', 'admin_adjustment', 'withdrawal', p_withdrawal_id,
            'Withdrawal failed - refunded: ' || v_diamonds_requested || ' diamonds');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION fail_withdrawal IS 'Mark withdrawal as failed and refund diamonds. Call from Stripe webhook if payout fails.';

-- ============================================================================
-- 8. CREATE RPC: ENABLE WITHDRAWAL (After KYC Verification)
-- ============================================================================

CREATE OR REPLACE FUNCTION enable_withdrawal(
    p_profile_id UUID,
    p_stripe_connect_account_id VARCHAR(255) DEFAULT NULL,
    p_tax_id VARCHAR(50) DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    UPDATE profiles
    SET withdrawal_enabled = TRUE,
        kyc_verified = TRUE,
        kyc_verified_at = CURRENT_TIMESTAMP,
        stripe_connect_account_id = COALESCE(p_stripe_connect_account_id, stripe_connect_account_id),
        tax_id = COALESCE(p_tax_id, tax_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION enable_withdrawal IS 'Enable withdrawals for user after KYC verification. Call after Stripe Connect onboarding.';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE withdrawals IS 'Withdrawal requests for cashing out diamonds. Status: pending (needs approval) -> processing (Stripe payout) -> completed/failed.';
COMMENT ON TABLE withdrawal_config IS 'Platform withdrawal settings. Update via admin panel.';
COMMENT ON COLUMN withdrawals.stripe_payout_id IS 'Stripe payout ID after successful transfer. Set via complete_withdrawal().';
COMMENT ON COLUMN withdrawals.requires_approval IS 'High-value withdrawals require admin approval before processing.';

-- ============================================================================
-- END OF WITHDRAWAL SYSTEM
-- ============================================================================


