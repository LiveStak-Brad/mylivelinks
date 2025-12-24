-- ============================================================================
-- COMPLETE FIX - Run this entire file at once in Supabase SQL Editor
-- ============================================================================
-- This fixes EVERYTHING:
-- 1. Resets all balances to zero
-- 2. Gives Brad (you) 100,000 coins
-- 3. Fixes gift function (no negative balance bug)
-- 4. Fixes conversion function (no double-add bug)
-- ============================================================================

-- ============================================================================
-- STEP 1: RESET EVERYTHING
-- ============================================================================

-- Clear all transactions
DELETE FROM coin_ledger;
DELETE FROM diamond_conversions;
DELETE FROM gifts;

-- Reset all user balances to zero
UPDATE profiles
SET 
    coin_balance = 0,
    earnings_balance = 0,
    total_spent = 0,
    total_purchased = 0;

-- Clear all leaderboards
DELETE FROM leaderboard_cache;

-- Give Brad (you) 100,000 coins to start
UPDATE profiles
SET coin_balance = 100000
WHERE id = '2b4a1178-3c39-4179-94ea-314dd824a818';

SELECT 'Step 1: Reset complete - You have 100k coins' as status;

-- ============================================================================
-- STEP 2: FIX GIFT FUNCTION (No ledger bugs)
-- ============================================================================

DROP FUNCTION IF EXISTS process_gift(UUID, UUID, BIGINT, INTEGER, BIGINT) CASCADE;

CREATE OR REPLACE FUNCTION process_gift(
    p_sender_id UUID,
    p_recipient_id UUID,
    p_gift_type_id BIGINT,
    p_slot_index INTEGER DEFAULT NULL,
    p_live_stream_id BIGINT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    v_coin_cost BIGINT;
    v_diamond_amount BIGINT;
    v_platform_revenue BIGINT;
    v_streamer_revenue BIGINT;
    v_gift_id BIGINT;
    v_sender_balance BIGINT;
BEGIN
    -- Get gift cost
    SELECT coin_cost INTO v_coin_cost
    FROM gift_types
    WHERE id = p_gift_type_id AND is_active = TRUE;
    
    IF v_coin_cost IS NULL THEN
        RAISE EXCEPTION 'Invalid or inactive gift type';
    END IF;
    
    -- Check sender balance
    SELECT coin_balance INTO v_sender_balance
    FROM profiles
    WHERE id = p_sender_id;
    
    IF v_sender_balance IS NULL THEN
        RAISE EXCEPTION 'Sender profile not found';
    END IF;
    
    IF v_sender_balance < v_coin_cost THEN
        RAISE EXCEPTION 'Insufficient coins. You have %, need %', v_sender_balance, v_coin_cost;
    END IF;
    
    -- Diamonds = coins (1:1)
    v_diamond_amount := v_coin_cost;
    
    -- Revenue split for constraint
    v_platform_revenue := (v_coin_cost * 30) / 100;
    v_streamer_revenue := v_coin_cost - v_platform_revenue;
    
    -- Insert gift record
    INSERT INTO gifts (
        sender_id, recipient_id, gift_type_id,
        coin_amount, platform_revenue, streamer_revenue,
        slot_index, live_stream_id
    )
    VALUES (
        p_sender_id, p_recipient_id, p_gift_type_id,
        v_coin_cost, v_platform_revenue, v_streamer_revenue,
        p_slot_index, p_live_stream_id
    )
    RETURNING id INTO v_gift_id;
    
    -- Update SENDER: Deduct coins
    UPDATE profiles
    SET 
        coin_balance = coin_balance - v_coin_cost,
        total_spent = total_spent + v_coin_cost
    WHERE id = p_sender_id;
    
    -- Update RECIPIENT: Add diamonds
    UPDATE profiles
    SET earnings_balance = earnings_balance + v_diamond_amount
    WHERE id = p_recipient_id;
    
    -- Ledger entries (tracking only)
    INSERT INTO coin_ledger (profile_id, amount, asset_type, type, ref_type, ref_id, description)
    VALUES 
        (p_sender_id, -v_coin_cost, 'coin', 'gift_sent', 'gift', v_gift_id, 'Gift sent'),
        (p_recipient_id, v_diamond_amount, 'diamond', 'gift_earn', 'gift', v_gift_id, 'Gift received');
    
    RETURN v_gift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

SELECT 'Step 2: Gift function fixed - Direct balance updates' as status;

-- ============================================================================
-- STEP 3: FIX CONVERSION FUNCTION (No double-add)
-- ============================================================================

DROP FUNCTION IF EXISTS convert_diamonds_to_coins(UUID, BIGINT) CASCADE;

CREATE OR REPLACE FUNCTION convert_diamonds_to_coins(
    p_profile_id UUID,
    p_diamonds_in BIGINT
)
RETURNS BIGINT AS $$
DECLARE
    v_diamond_balance BIGINT;
    v_coins_out BIGINT;
    v_fee_amount BIGINT;
    v_conversion_rate DECIMAL(5, 4) := 0.6000; -- 60% (40% platform fee)
    v_min_diamonds BIGINT := 3;
    v_conversion_id BIGINT;
BEGIN
    -- Check diamond balance
    SELECT earnings_balance INTO v_diamond_balance
    FROM profiles
    WHERE id = p_profile_id;
    
    IF v_diamond_balance IS NULL THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;
    
    IF v_diamond_balance < p_diamonds_in THEN
        RAISE EXCEPTION 'Insufficient diamonds. You have %, need %', v_diamond_balance, p_diamonds_in;
    END IF;
    
    IF p_diamonds_in < v_min_diamonds THEN
        RAISE EXCEPTION 'Minimum % diamonds required', v_min_diamonds;
    END IF;
    
    -- Calculate: diamonds * 0.60 = coins (40% fee)
    v_coins_out := FLOOR(p_diamonds_in * v_conversion_rate);
    v_fee_amount := p_diamonds_in - v_coins_out;
    
    IF v_coins_out < 1 THEN
        RAISE EXCEPTION 'Conversion too small';
    END IF;
    
    -- Record conversion
    INSERT INTO diamond_conversions (
        profile_id, diamonds_in, coins_out, fee_amount, conversion_rate, status, completed_at
    )
    VALUES (
        p_profile_id, p_diamonds_in, v_coins_out, v_fee_amount, v_conversion_rate, 'completed', CURRENT_TIMESTAMP
    )
    RETURNING id INTO v_conversion_id;
    
    -- Update balances ONCE (no double-add)
    UPDATE profiles
    SET 
        earnings_balance = earnings_balance - p_diamonds_in,  -- Remove diamonds
        coin_balance = coin_balance + v_coins_out             -- Add coins ONCE
    WHERE id = p_profile_id;
    
    -- Ledger entries (tracking only, does NOT affect balances)
    INSERT INTO coin_ledger (profile_id, amount, asset_type, type, ref_type, ref_id, description)
    VALUES 
        (p_profile_id, -p_diamonds_in, 'diamond', 'convert_out', 'diamond_conversion', v_conversion_id, 'Diamonds converted'),
        (p_profile_id, v_coins_out, 'coin', 'convert_in', 'diamond_conversion', v_conversion_id, 'Coins received'),
        (p_profile_id, -v_fee_amount, 'diamond', 'convert_fee', 'diamond_conversion', v_conversion_id, 'Platform fee (40%)');
    
    RETURN v_conversion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

SELECT 'Step 3: Conversion function fixed - No double-add' as status;

-- ============================================================================
-- STEP 4: VERIFY THE FIX
-- ============================================================================

-- Show your current balance
SELECT 
    username,
    coin_balance as coins,
    earnings_balance as diamonds,
    total_spent,
    '✅ You should have 100,000 coins' as expected
FROM profiles
WHERE id = '2b4a1178-3c39-4179-94ea-314dd824a818';

-- ============================================================================
-- ✅ COMPLETE! Now test:
-- ============================================================================
-- 1. Send gifts to someone (they get diamonds 1:1)
-- 2. They convert diamonds (60% conversion, 40% fee)
-- 3. Math: 100k coins in gifts → 100k diamonds → 60k coins after conversion
-- ============================================================================

