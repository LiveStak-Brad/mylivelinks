-- ============================================================================
-- MyLiveLinks: Production Monetization System (Stripe Connect Express)
-- ============================================================================
-- 
-- CRITICAL: 40% platform fee, 60% user value
-- - Coins are purchased via Stripe, NON-REDEEMABLE
-- - Gifts spend Coins; receiver earns Diamonds (60% of coin value)
-- - Diamonds can be cashed out via Stripe Connect Express
-- - Minimum cashout: 10,000 diamonds = $100 (100 diamonds = $1)
-- ============================================================================

-- ============================================================================
-- 1. COIN PACKS TABLE (Stripe Products)
-- ============================================================================

CREATE TABLE IF NOT EXISTS coin_packs (
    id BIGSERIAL PRIMARY KEY,
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    coins_amount BIGINT NOT NULL CHECK (coins_amount > 0),
    price_cents INTEGER NOT NULL CHECK (price_cents > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    stripe_price_id VARCHAR(255), -- Live Stripe Price ID
    active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coin_packs_active ON coin_packs(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_coin_packs_sku ON coin_packs(sku);

-- Insert default coin packs (70 coins per $1)
INSERT INTO coin_packs (sku, name, coins_amount, price_cents, currency, display_order) VALUES
    ('coins_350_usd_499', '350 Coins', 350, 499, 'usd', 1),
    ('coins_700_usd_999', '700 Coins', 700, 999, 'usd', 2),
    ('coins_1750_usd_2499', '1,750 Coins', 1750, 2499, 'usd', 3),
    ('coins_3500_usd_4999', '3,500 Coins', 3500, 4999, 'usd', 4),
    ('coins_7000_usd_9999', '7,000 Coins', 7000, 9999, 'usd', 5),
    ('coins_17500_usd_24999', '17,500 Coins', 17500, 24999, 'usd', 6),
    ('coins_35000_usd_49999', '35,000 Coins', 35000, 49999, 'usd', 7),
    ('coins_70000_usd_99999', '70,000 Coins', 70000, 99999, 'usd', 8)
ON CONFLICT (sku) DO NOTHING;

COMMENT ON TABLE coin_packs IS 'Available coin packs for purchase via Stripe. sku must be unique.';

-- ============================================================================
-- 2. LEDGER ENTRIES TABLE (Idempotent Transaction Log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE, -- CRITICAL: prevents duplicate processing
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN (
        'coin_purchase',      -- Coins credited from Stripe purchase
        'coin_spend_gift',    -- Coins spent on gift
        'diamond_earn',       -- Diamonds earned from received gift
        'diamond_debit_cashout', -- Diamonds debited for cashout
        'refund',             -- Refund
        'admin_adjustment'    -- Manual adjustment
    )),
    delta_coins BIGINT DEFAULT 0,      -- Change in coin balance
    delta_diamonds BIGINT DEFAULT 0,    -- Change in diamond balance
    amount_usd_cents INTEGER,           -- USD amount (for purchases/cashouts)
    provider_ref VARCHAR(255),          -- Stripe session ID, transfer ID, etc.
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_idempotency_key ON ledger_entries(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_entry_type ON ledger_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON ledger_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_provider_ref ON ledger_entries(provider_ref) WHERE provider_ref IS NOT NULL;

-- Enable RLS
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ledger entries"
    ON ledger_entries FOR SELECT
    USING (auth.uid() = user_id);

-- Only allow inserts via service role (API routes)
CREATE POLICY "Deny direct inserts - service role only"
    ON ledger_entries FOR INSERT
    WITH CHECK (false);

COMMENT ON TABLE ledger_entries IS 'Immutable ledger with idempotency_key for safe retries. Source of truth for balances.';

-- ============================================================================
-- 3. UPDATE PROFILES FOR WALLET FIELDS
-- ============================================================================

-- Add lifetime tracking fields if not exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS lifetime_coins_purchased BIGINT DEFAULT 0 CHECK (lifetime_coins_purchased >= 0),
ADD COLUMN IF NOT EXISTS lifetime_coins_gifted BIGINT DEFAULT 0 CHECK (lifetime_coins_gifted >= 0),
ADD COLUMN IF NOT EXISTS lifetime_diamonds_earned BIGINT DEFAULT 0 CHECK (lifetime_diamonds_earned >= 0),
ADD COLUMN IF NOT EXISTS lifetime_diamonds_cashed_out BIGINT DEFAULT 0 CHECK (lifetime_diamonds_cashed_out >= 0);

COMMENT ON COLUMN profiles.coin_balance IS 'Current spendable coin balance (from purchases only)';
COMMENT ON COLUMN profiles.earnings_balance IS 'Current diamond balance (earned from gifts, 60% of coin value)';
COMMENT ON COLUMN profiles.lifetime_coins_purchased IS 'Total coins ever purchased';
COMMENT ON COLUMN profiles.lifetime_coins_gifted IS 'Total coins ever spent on gifts';
COMMENT ON COLUMN profiles.lifetime_diamonds_earned IS 'Total diamonds ever earned from received gifts';
COMMENT ON COLUMN profiles.lifetime_diamonds_cashed_out IS 'Total diamonds ever cashed out';

-- ============================================================================
-- 4. UPDATE GIFTS TABLE FOR 40% FEE MODEL
-- ============================================================================

-- Add platform fee tracking
ALTER TABLE gifts 
ADD COLUMN IF NOT EXISTS coins_spent BIGINT,
ADD COLUMN IF NOT EXISTS diamonds_awarded BIGINT,
ADD COLUMN IF NOT EXISTS platform_fee_coins BIGINT;

-- Migrate existing data if needed (gifts are 1:1 coins -> diamonds, platform fee = 0)
UPDATE gifts 
SET coins_spent = coin_amount,
    diamonds_awarded = coin_amount,
    platform_fee_coins = 0
WHERE coins_spent IS NULL AND coin_amount IS NOT NULL;

COMMENT ON COLUMN gifts.coins_spent IS 'Total coins spent by sender';
COMMENT ON COLUMN gifts.diamonds_awarded IS 'Diamonds awarded to recipient (1:1 with coins_spent)';
COMMENT ON COLUMN gifts.platform_fee_coins IS 'Platform fee (coins) for gifts (0 in 1:1 model)';

-- ============================================================================
-- 5. STRIPE CONNECT ACCOUNTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS connect_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_account_id VARCHAR(255) NOT NULL UNIQUE,
    account_type VARCHAR(50) DEFAULT 'express',
    payouts_enabled BOOLEAN DEFAULT FALSE,
    charges_enabled BOOLEAN DEFAULT FALSE,
    details_submitted BOOLEAN DEFAULT FALSE,
    country VARCHAR(2),
    default_currency VARCHAR(3) DEFAULT 'usd',
    onboarding_complete BOOLEAN DEFAULT FALSE,
    disabled_reason TEXT, -- If payouts disabled, why
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_connect_accounts_user_id ON connect_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_connect_accounts_stripe_account_id ON connect_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_connect_accounts_payouts_enabled ON connect_accounts(payouts_enabled) WHERE payouts_enabled = TRUE;

-- Enable RLS
ALTER TABLE connect_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connect account"
    ON connect_accounts FOR SELECT
    USING (auth.uid() = user_id);

COMMENT ON TABLE connect_accounts IS 'Stripe Connect Express accounts for user payouts. payouts_enabled must be true for cashouts.';

-- ============================================================================
-- 6. CASHOUTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cashouts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    diamonds_debited BIGINT NOT NULL CHECK (diamonds_debited >= 10000), -- Minimum 10,000
    amount_usd_cents INTEGER NOT NULL CHECK (amount_usd_cents > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Created, awaiting transfer
        'transferred',  -- Stripe transfer created
        'paid',         -- Stripe payout completed
        'failed'        -- Transfer or payout failed
    )),
    stripe_account_id VARCHAR(255) NOT NULL,
    stripe_transfer_id VARCHAR(255),
    stripe_payout_id VARCHAR(255),
    failure_reason TEXT,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cashouts_user_id ON cashouts(user_id);
CREATE INDEX IF NOT EXISTS idx_cashouts_status ON cashouts(status);
CREATE INDEX IF NOT EXISTS idx_cashouts_stripe_transfer_id ON cashouts(stripe_transfer_id) WHERE stripe_transfer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cashouts_idempotency_key ON cashouts(idempotency_key);

-- Enable RLS
ALTER TABLE cashouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cashouts"
    ON cashouts FOR SELECT
    USING (auth.uid() = user_id);

COMMENT ON TABLE cashouts IS 'Cashout requests. Minimum 10,000 diamonds = $100. 100 diamonds = $1.';

-- ============================================================================
-- 7. STRIPE EVENTS TABLE (Audit Log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stripe_events (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(255) NOT NULL UNIQUE, -- Stripe event ID (evt_xxx)
    event_type VARCHAR(100) NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    request_id VARCHAR(255), -- For debugging
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON stripe_events(event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_type ON stripe_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON stripe_events(processed);

COMMENT ON TABLE stripe_events IS 'Audit log of processed Stripe webhook events. Used for idempotency.';

-- ============================================================================
-- 8. RPC: FINALIZE COIN PURCHASE (Idempotent)
-- ============================================================================

CREATE OR REPLACE FUNCTION finalize_coin_purchase(
    p_idempotency_key VARCHAR(255),
    p_user_id UUID,
    p_coins_amount BIGINT,
    p_amount_usd_cents INTEGER,
    p_provider_ref VARCHAR(255)
)
RETURNS BIGINT AS $$
DECLARE
    v_ledger_id BIGINT;
BEGIN
    -- Check if already processed (idempotent)
    SELECT id INTO v_ledger_id
    FROM ledger_entries
    WHERE idempotency_key = p_idempotency_key;
    
    IF v_ledger_id IS NOT NULL THEN
        RETURN v_ledger_id; -- Already processed
    END IF;
    
    -- Insert ledger entry
    INSERT INTO ledger_entries (
        idempotency_key, user_id, entry_type, delta_coins, amount_usd_cents, provider_ref
    )
    VALUES (
        p_idempotency_key, p_user_id, 'coin_purchase', p_coins_amount, p_amount_usd_cents, p_provider_ref
    )
    RETURNING id INTO v_ledger_id;
    
    -- Update wallet balance
    UPDATE profiles
    SET coin_balance = coin_balance + p_coins_amount,
        total_purchased = COALESCE(total_purchased, 0) + p_coins_amount,
        last_transaction_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
    
    RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION finalize_coin_purchase IS 'Idempotent coin purchase finalization. Safe to call multiple times with same idempotency_key.';

-- ============================================================================
-- 9. RPC: SEND GIFT (1:1 coins->diamonds, no platform fee on gifts)
-- ============================================================================

CREATE OR REPLACE FUNCTION send_gift_v2(
    p_sender_id UUID,
    p_recipient_id UUID,
    p_coins_amount BIGINT,
    p_gift_type_id BIGINT DEFAULT NULL,
    p_stream_id BIGINT DEFAULT NULL,
    p_request_id VARCHAR(255) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_sender_balance BIGINT;
    v_diamonds_awarded BIGINT;
    v_platform_fee BIGINT;
    v_gift_id BIGINT;
    v_request_id VARCHAR(255);
    v_sender_idempotency_key VARCHAR(255);
    v_recipient_idempotency_key VARCHAR(255);
    v_existing_provider_ref VARCHAR(255);
    v_existing_gift_id BIGINT;
    v_gift_type_id BIGINT;
BEGIN
    v_request_id := COALESCE(p_request_id, gen_random_uuid()::text);
    v_sender_idempotency_key := 'gift:sender:' || v_request_id;
    v_recipient_idempotency_key := 'gift:recipient:' || v_request_id;

    -- Prevent concurrent double-processing for the same request_id.
    -- This guarantees total_spent/total_gifts_received and balances are updated exactly once.
    PERFORM pg_advisory_xact_lock(hashtext(v_sender_idempotency_key)::bigint);
    
    SELECT provider_ref
    INTO v_existing_provider_ref
    FROM ledger_entries
    WHERE idempotency_key = v_sender_idempotency_key
    LIMIT 1;
    
    IF v_existing_provider_ref IS NOT NULL THEN
        v_existing_gift_id := NULLIF(split_part(v_existing_provider_ref, ':', 2), '')::bigint;

        RETURN jsonb_build_object(
            'gift_id', v_existing_gift_id,
            'coins_spent', p_coins_amount,
            'diamonds_awarded', p_coins_amount,
            'platform_fee', 0
        );
    END IF;
    
    -- Lock sender wallet
    SELECT coin_balance INTO v_sender_balance
    FROM profiles
    WHERE id = p_sender_id
    FOR UPDATE;
    
    -- Validate balance
    IF v_sender_balance < p_coins_amount THEN
        RAISE EXCEPTION 'Insufficient coin balance. Have: %, Need: %', v_sender_balance, p_coins_amount;
    END IF;
    
    -- Calculate gift value
    v_diamonds_awarded := p_coins_amount;
    v_platform_fee := 0;

    -- Resolve gift_type_id (gift_type_id is NOT NULL in production schema)
    IF p_gift_type_id IS NOT NULL THEN
        v_gift_type_id := p_gift_type_id;
    ELSE
        SELECT id
        INTO v_gift_type_id
        FROM gift_types
        WHERE COALESCE(is_active, true) = true
        ORDER BY COALESCE(display_order, 0) ASC, id ASC
        LIMIT 1;

        IF v_gift_type_id IS NULL THEN
            RAISE EXCEPTION 'No active gift_types found';
        END IF;
    END IF;
    
    -- Insert gift record
    INSERT INTO gifts (
        sender_id, recipient_id, gift_type_id,
        coin_amount,
        platform_revenue, streamer_revenue,
        live_stream_id
    )
    VALUES (
        p_sender_id, p_recipient_id, v_gift_type_id,
        p_coins_amount,
        0, p_coins_amount,
        p_stream_id
    )
    RETURNING id INTO v_gift_id;
    
    -- Insert sender ledger entry (idempotent check)
    INSERT INTO ledger_entries (
        idempotency_key, user_id, entry_type, delta_coins, provider_ref
    )
    VALUES (
        v_sender_idempotency_key, p_sender_id, 'coin_spend_gift', -p_coins_amount, 'gift:' || v_gift_id
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
    
    -- Insert recipient ledger entry
    INSERT INTO ledger_entries (
        idempotency_key, user_id, entry_type, delta_diamonds, provider_ref
    )
    VALUES (
        v_recipient_idempotency_key, p_recipient_id, 'diamond_earn', v_diamonds_awarded, 'gift:' || v_gift_id
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
    
    -- IMPORTANT: Do NOT update cached profile balances/totals here.
    -- Production DB uses triggers to recompute profiles balances from ledger_entries
    -- and to update gift totals from gifts inserts. Updating profiles here would double-credit.
    
    -- Return result
    RETURN jsonb_build_object(
        'gift_id', v_gift_id,
        'coins_spent', p_coins_amount,
        'diamonds_awarded', v_diamonds_awarded,
        'platform_fee', v_platform_fee
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION send_gift_v2 IS 'Send gift: diamonds = coins (1:1), platform fee = 0. Returns gift details.';

-- ============================================================================
-- 10. RPC: REQUEST CASHOUT
-- ============================================================================

CREATE OR REPLACE FUNCTION request_cashout(
    p_user_id UUID,
    p_diamonds_requested BIGINT,
    p_request_id VARCHAR(255)
)
RETURNS JSONB AS $$
DECLARE
    v_diamond_balance BIGINT;
    v_stripe_account_id VARCHAR(255);
    v_payouts_enabled BOOLEAN;
    v_diamonds_to_debit BIGINT;
    v_amount_usd_cents INTEGER;
    v_cashout_id BIGINT;
    v_idempotency_key VARCHAR(255);
    v_ledger_id BIGINT;
BEGIN
    -- Generate idempotency key
    v_idempotency_key := 'cashout:' || p_request_id;
    
    -- Check if already processed
    SELECT id INTO v_cashout_id
    FROM cashouts
    WHERE idempotency_key = v_idempotency_key;
    
    IF v_cashout_id IS NOT NULL THEN
        -- Return existing cashout
        RETURN (SELECT jsonb_build_object(
            'cashout_id', id,
            'diamonds_debited', diamonds_debited,
            'amount_usd_cents', amount_usd_cents,
            'status', status,
            'already_exists', true
        ) FROM cashouts WHERE id = v_cashout_id);
    END IF;
    
    -- Check connect account
    SELECT stripe_account_id, payouts_enabled
    INTO v_stripe_account_id, v_payouts_enabled
    FROM connect_accounts
    WHERE user_id = p_user_id;
    
    IF v_stripe_account_id IS NULL THEN
        RAISE EXCEPTION 'No Stripe Connect account found. Please complete onboarding first.';
    END IF;
    
    IF NOT v_payouts_enabled THEN
        RAISE EXCEPTION 'Payouts not enabled. Please complete Stripe onboarding or your country may not be eligible.';
    END IF;
    
    -- Lock wallet and get balance
    SELECT earnings_balance INTO v_diamond_balance
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;
    
    -- Validate minimum (10,000 diamonds = $100)
    IF v_diamond_balance < 10000 THEN
        RAISE EXCEPTION 'Minimum cashout is 10,000 diamonds ($100). Current balance: %', v_diamond_balance;
    END IF;
    
    -- Calculate floorable debit (must be multiple of 100 for clean $1 increments)
    v_diamonds_to_debit := FLOOR(LEAST(p_diamonds_requested, v_diamond_balance) / 100) * 100;
    
    IF v_diamonds_to_debit < 10000 THEN
        RAISE EXCEPTION 'Minimum cashout is 10,000 diamonds ($100). Requested: %', v_diamonds_to_debit;
    END IF;
    
    -- 100 diamonds = $1, so amount_cents = diamonds
    v_amount_usd_cents := v_diamonds_to_debit;
    
    -- Insert ledger entry
    INSERT INTO ledger_entries (
        idempotency_key, user_id, entry_type, delta_diamonds, amount_usd_cents, provider_ref
    )
    VALUES (
        v_idempotency_key || ':ledger', p_user_id, 'diamond_debit_cashout', -v_diamonds_to_debit, v_amount_usd_cents, 'pending'
    )
    RETURNING id INTO v_ledger_id;
    
    -- Insert cashout record (pending state)
    INSERT INTO cashouts (
        user_id, diamonds_debited, amount_usd_cents, status, stripe_account_id, idempotency_key
    )
    VALUES (
        p_user_id, v_diamonds_to_debit, v_amount_usd_cents, 'pending', v_stripe_account_id, v_idempotency_key
    )
    RETURNING id INTO v_cashout_id;
    
    -- Debit diamonds from balance
    UPDATE profiles
    SET earnings_balance = earnings_balance - v_diamonds_to_debit,
        lifetime_diamonds_cashed_out = COALESCE(lifetime_diamonds_cashed_out, 0) + v_diamonds_to_debit,
        last_transaction_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
    
    -- Return result
    RETURN jsonb_build_object(
        'cashout_id', v_cashout_id,
        'diamonds_debited', v_diamonds_to_debit,
        'amount_usd_cents', v_amount_usd_cents,
        'stripe_account_id', v_stripe_account_id,
        'status', 'pending',
        'already_exists', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION request_cashout IS 'Request diamond cashout. Minimum 10,000 diamonds = $100. 100 diamonds = $1. NO additional fees at cashout.';

-- ============================================================================
-- 11. RPC: COMPLETE CASHOUT (Called after Stripe Transfer)
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_cashout(
    p_cashout_id BIGINT,
    p_stripe_transfer_id VARCHAR(255)
)
RETURNS void AS $$
BEGIN
    UPDATE cashouts
    SET status = 'transferred',
        stripe_transfer_id = p_stripe_transfer_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_cashout_id AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- 12. RPC: FAIL CASHOUT (Refund diamonds)
-- ============================================================================

CREATE OR REPLACE FUNCTION fail_cashout(
    p_cashout_id BIGINT,
    p_failure_reason TEXT
)
RETURNS void AS $$
DECLARE
    v_user_id UUID;
    v_diamonds_debited BIGINT;
BEGIN
    -- Get cashout details
    SELECT user_id, diamonds_debited INTO v_user_id, v_diamonds_debited
    FROM cashouts
    WHERE id = p_cashout_id AND status IN ('pending', 'transferred');
    
    IF v_user_id IS NULL THEN
        RETURN; -- Already failed or doesn't exist
    END IF;
    
    -- Update cashout status
    UPDATE cashouts
    SET status = 'failed',
        failure_reason = p_failure_reason,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_cashout_id;
    
    -- Refund diamonds
    UPDATE profiles
    SET earnings_balance = earnings_balance + v_diamonds_debited,
        lifetime_diamonds_cashed_out = lifetime_diamonds_cashed_out - v_diamonds_debited,
        last_transaction_at = CURRENT_TIMESTAMP
    WHERE id = v_user_id;
    
    -- Add refund ledger entry
    INSERT INTO ledger_entries (
        idempotency_key, user_id, entry_type, delta_diamonds, provider_ref
    )
    VALUES (
        'cashout_refund:' || p_cashout_id, v_user_id, 'admin_adjustment', v_diamonds_debited, 'cashout_failed:' || p_cashout_id
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- GRANT EXECUTE TO authenticated ROLE (for RPCs called from client)
-- ============================================================================

-- Note: finalize_coin_purchase should only be called from webhook (service role)
-- send_gift_v2 can be called from client
GRANT EXECUTE ON FUNCTION send_gift_v2 TO authenticated;

-- request_cashout called from authenticated client
GRANT EXECUTE ON FUNCTION request_cashout TO authenticated;

-- ============================================================================
-- END OF MONETIZATION SYSTEM
-- ============================================================================

