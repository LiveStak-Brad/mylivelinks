-- ============================================================================
-- FIX CONVERSION DOUBLE-ADD BUG
-- ============================================================================
-- The convert_diamonds_to_coins function was:
-- 1. Inserting into coin_ledger (+60k)
-- 2. Then calling update_coin_balance_via_ledger which READS coin_ledger and adds again (+60k)
-- Result: User gets 120k coins instead of 60k!
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
    v_conversion_rate DECIMAL(5, 4) := 0.7000; -- 70% (30% platform fee)
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
    
    -- Calculate: 100k diamonds * 0.70 = 70k coins (30% fee)
    v_coins_out := FLOOR(p_diamonds_in * v_conversion_rate);
    v_fee_amount := p_diamonds_in - v_coins_out;
    
    IF v_coins_out < 1 THEN
        RAISE EXCEPTION 'Conversion too small. Minimum % diamonds required', v_min_diamonds;
    END IF;
    
    -- Record conversion
    INSERT INTO diamond_conversions (
        profile_id, diamonds_in, coins_out, fee_amount, conversion_rate, status, completed_at
    )
    VALUES (
        p_profile_id, p_diamonds_in, v_coins_out, v_fee_amount, v_conversion_rate, 'completed', CURRENT_TIMESTAMP
    )
    RETURNING id INTO v_conversion_id;
    
    -- Update balances DIRECTLY (no double-add bug)
    UPDATE profiles
    SET 
        earnings_balance = earnings_balance - p_diamonds_in,  -- Remove diamonds
        coin_balance = coin_balance + v_coins_out             -- Add coins ONCE
    WHERE id = p_profile_id;
    
    -- Insert ledger entries for tracking only (does NOT affect balances)
    INSERT INTO coin_ledger (profile_id, amount, asset_type, type, ref_type, ref_id, description)
    VALUES 
        (p_profile_id, -p_diamonds_in, 'diamond', 'convert_out', 'diamond_conversion', v_conversion_id,
         'Diamond conversion: ' || p_diamonds_in || ' diamonds burned'),
        (p_profile_id, v_coins_out, 'coin', 'convert_in', 'diamond_conversion', v_conversion_id,
         'Diamond conversion: ' || v_coins_out || ' coins received'),
        (p_profile_id, -v_fee_amount, 'diamond', 'convert_fee', 'diamond_conversion', v_conversion_id,
         'Platform fee: ' || v_fee_amount || ' diamonds (30%)');
    
    RETURN v_conversion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

SELECT 'Conversion function fixed - 30% fee, no double-add' as status;

-- ============================================================================
-- WHAT THIS FIXES:
-- ============================================================================
-- 1. Direct balance updates (no double-adding)
-- 2. 30% platform fee (0.70 conversion rate)
-- 3. Ledger is for tracking only, doesn't affect balances
-- 4. Math: 100k diamonds → 70k coins
-- ============================================================================

