-- ============================================================================
-- MyLiveLinks: LIVE Coin Packs Update
-- Run this in Supabase SQL Editor to update coin packs with Stripe Price IDs
-- ============================================================================
-- 
-- IMPORTANT: Replace 'price_XXXXXX' with actual LIVE Stripe Price IDs
-- from your Stripe Dashboard → Products → each coin pack
-- ============================================================================

-- First, ensure the coin_packs table has VIP tier support
ALTER TABLE coin_packs 
ADD COLUMN IF NOT EXISTS vip_tier INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS value_percent INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE;

-- Clear existing packs and insert the correct ones
DELETE FROM coin_packs;

-- Insert all coin packs as specified (LIVE values from Stripe)
-- NOTE: Update stripe_price_id with your actual LIVE Stripe Price IDs!

INSERT INTO coin_packs (sku, name, coins_amount, price_cents, currency, stripe_price_id, vip_tier, value_percent, is_vip, display_order, description, active) VALUES
-- Standard packs (60% creator value)
('coins_600_1000', '600 Coins', 600, 1000, 'usd', 'price_REPLACE_WITH_LIVE_ID_600', 0, 60, FALSE, 1, 'Starter pack', TRUE),
('coins_1500_2500', '1,500 Coins', 1500, 2500, 'usd', 'price_REPLACE_WITH_LIVE_ID_1500', 0, 60, FALSE, 2, 'Popular choice', TRUE),
('coins_3000_5000', '3,000 Coins', 3000, 5000, 'usd', 'price_REPLACE_WITH_LIVE_ID_3000', 0, 60, FALSE, 3, 'Great value', TRUE),
('coins_6000_10000', '6,000 Coins', 6000, 10000, 'usd', 'price_REPLACE_WITH_LIVE_ID_6000', 0, 60, FALSE, 4, 'Best seller', TRUE),
('coins_15000_25000', '15,000 Coins', 15000, 25000, 'usd', 'price_REPLACE_WITH_LIVE_ID_15000', 0, 60, FALSE, 5, 'Supporter pack', TRUE),
('coins_30000_50000', '30,000 Coins', 30000, 50000, 'usd', 'price_REPLACE_WITH_LIVE_ID_30000', 0, 60, FALSE, 6, 'Super supporter', TRUE),
('coins_60000_100000', '60,000 Coins', 60000, 100000, 'usd', 'price_REPLACE_WITH_LIVE_ID_60000', 0, 60, FALSE, 7, 'Mega pack', TRUE),
('coins_120000_200000', '120,000 Coins', 120000, 200000, 'usd', 'price_REPLACE_WITH_LIVE_ID_120000', 0, 60, FALSE, 8, 'Elite pack', TRUE),
('coins_300000_500000', '300,000 Coins', 300000, 500000, 'usd', 'price_REPLACE_WITH_LIVE_ID_300000', 0, 60, FALSE, 9, 'Premium pack', TRUE),

-- VIP packs (unlocked by spending, 60% value)
('coins_70000_1000000', '70,000 Coins VIP', 70000, 1000000, 'usd', 'price_REPLACE_WITH_LIVE_ID_70000_VIP', 1, 60, TRUE, 10, 'VIP Whale Pack - Unlocked after $1,000 spent', TRUE),

-- VIP Elite (75% creator value - special)
('coins_187500_2500000', '187,500 Coins VIP Elite', 187500, 2500000, 'usd', 'price_REPLACE_WITH_LIVE_ID_ELITE', 2, 75, TRUE, 11, 'VIP Elite - 75% creator value!', TRUE);

-- Create VIP tier tracking on profiles if not exists
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS vip_tier INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_spent_usd_cents BIGINT DEFAULT 0;

-- Update process_gift RPC to handle 75% VIP Elite pack (future enhancement)
-- For now, the 60% is applied universally at gift time

-- Create index for VIP tier lookups
CREATE INDEX IF NOT EXISTS idx_coin_packs_vip_tier ON coin_packs(vip_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_vip_tier ON profiles(vip_tier);

-- ============================================================================
-- VIP TIER UNLOCK THRESHOLDS
-- ============================================================================
-- Tier 0: Default (all standard packs visible)
-- Tier 1: Unlocked after $1,000 total spent (shows 70,000 VIP pack)
-- Tier 2: Unlocked after purchasing Tier 1 pack (shows 187,500 Elite pack)

COMMENT ON COLUMN coin_packs.vip_tier IS 'Required VIP tier to see this pack. 0=all, 1=after $1000 spent, 2=after tier 1 purchase';
COMMENT ON COLUMN coin_packs.value_percent IS 'Creator cashout value percent. 60=standard, 75=elite';
COMMENT ON COLUMN profiles.vip_tier IS 'User VIP tier for unlocking exclusive coin packs';
COMMENT ON COLUMN profiles.total_spent_usd_cents IS 'Total amount spent on coin purchases (for VIP tier unlocks)';

-- ============================================================================
-- UPDATE VIP TIER FUNCTION (called after purchase)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_vip_tier(p_user_id UUID, p_amount_spent_cents INTEGER)
RETURNS void AS $$
DECLARE
    v_total_spent BIGINT;
    v_new_tier INTEGER;
BEGIN
    -- Update total spent and get new total
    UPDATE profiles
    SET total_spent_usd_cents = COALESCE(total_spent_usd_cents, 0) + p_amount_spent_cents
    WHERE id = p_user_id
    RETURNING total_spent_usd_cents INTO v_total_spent;
    
    -- Calculate new VIP tier based on total spent
    -- Tier 1: >= $1,000 (100000 cents)
    -- Tier 2: Requires purchasing tier 1 pack (handled separately)
    IF v_total_spent >= 100000 THEN
        v_new_tier := 1;
    ELSE
        v_new_tier := 0;
    END IF;
    
    -- Update tier if higher
    UPDATE profiles
    SET vip_tier = GREATEST(COALESCE(vip_tier, 0), v_new_tier)
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GET AVAILABLE COIN PACKS FOR USER (respects VIP tier)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_available_coin_packs(p_user_id UUID)
RETURNS SETOF coin_packs AS $$
DECLARE
    v_user_tier INTEGER;
BEGIN
    -- Get user's VIP tier
    SELECT COALESCE(vip_tier, 0) INTO v_user_tier
    FROM profiles
    WHERE id = p_user_id;
    
    -- Return packs where user's tier >= required tier
    RETURN QUERY
    SELECT *
    FROM coin_packs
    WHERE active = TRUE
    AND vip_tier <= v_user_tier
    ORDER BY display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_available_coin_packs TO authenticated;

-- ============================================================================
-- STRIPE COIN PURCHASE FULFILLMENT SYSTEM
-- ============================================================================

-- Create the specific RPC function requested: cfm_finalize_coin_purchase
CREATE OR REPLACE FUNCTION cfm_finalize_coin_purchase(
    p_provider VARCHAR(50),
    p_provider_order_id VARCHAR(255),
    p_idempotency_key VARCHAR(255),
    p_user_id UUID,
    p_usd_cents INTEGER,
    p_coins_awarded BIGINT,
    p_context JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_existing_purchase BIGINT;
    v_purchase_id BIGINT;
BEGIN
    -- Check if already processed (idempotency)
    SELECT id INTO v_existing_purchase
    FROM coin_purchases
    WHERE provider_event_id = p_idempotency_key;

    IF v_existing_purchase IS NOT NULL THEN
        -- Already processed, return duplicate
        RETURN jsonb_build_object(
            'ok', true,
            'duplicate', true,
            'coins_awarded', 0
        );
    END IF;

    -- Insert new coin purchase record
    INSERT INTO coin_purchases (
        profile_id,
        platform,
        payment_provider,
        provider_event_id,
        provider_payment_id,
        coin_amount,
        usd_amount,
        status,
        confirmed_at,
        metadata
    )
    VALUES (
        p_user_id,
        'web',
        p_provider,
        p_idempotency_key,
        p_provider_order_id,
        p_coins_awarded,
        p_usd_cents,
        'confirmed',
        CURRENT_TIMESTAMP,
        p_context
    )
    RETURNING id INTO v_purchase_id;

    -- Update coin balance using ledger system
    PERFORM update_coin_balance_via_ledger(
        p_user_id,
        p_coins_awarded,
        'purchase',
        'coin_purchase',
        v_purchase_id,
        'Coin purchase: ' || p_coins_awarded || ' coins'
    );

    -- Update total_purchased in profiles
    UPDATE profiles
    SET total_purchased = COALESCE(total_purchased, 0) + p_coins_awarded,
        last_transaction_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

    -- Return success
    RETURN jsonb_build_object(
        'ok', true,
        'duplicate', false,
        'coins_awarded', p_coins_awarded
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION cfm_finalize_coin_purchase IS 'Idempotent coin purchase fulfillment for Stripe webhooks. Returns {ok: boolean, duplicate: boolean, coins_awarded: number}';

-- ============================================================================
-- IMPORTANT: After running this SQL, update the stripe_price_id values!
-- Go to Stripe Dashboard → Products, copy each LIVE Price ID
-- Then run:
--
-- UPDATE coin_packs SET stripe_price_id = 'price_XXXXX' WHERE sku = 'coins_600_1000';
-- (repeat for each pack)
-- ============================================================================

