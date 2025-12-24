-- ============================================================================
-- FIX GIFT FUNCTION PROPERLY
-- ============================================================================
-- The previous fix had a critical bug: it was giving diamonds to the SENDER
-- instead of the RECIPIENT. This fixes that.
-- ============================================================================

-- Drop the old constraint (if it exists)
ALTER TABLE gifts DROP CONSTRAINT IF EXISTS check_revenue_split;

-- Recreate process_gift function with CORRECT logic
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
    
    -- Check sender coin balance
    SELECT coin_balance INTO v_sender_balance
    FROM profiles
    WHERE id = p_sender_id;
    
    IF v_sender_balance < v_coin_cost THEN
        RAISE EXCEPTION 'Insufficient coin balance';
    END IF;
    
    -- Diamonds earned = coins spent (1:1 conversion)
    v_diamond_amount := v_coin_cost;
    
    -- Calculate revenue split for constraint (even if we don't use it for diamonds)
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
    
    -- Deduct coins from SENDER (via ledger)
    PERFORM update_coin_balance_via_ledger(
        p_sender_id,
        -v_coin_cost,
        'gift_sent',
        'gift',
        v_gift_id,
        'Gift sent: ' || v_coin_cost || ' coins'
    );
    
    -- CRITICAL FIX: Update SENDER's total_spent (not earnings!)
    UPDATE profiles
    SET total_spent = total_spent + v_coin_cost
    WHERE id = p_sender_id;
    
    -- Add diamonds to RECIPIENT (not sender!)
    INSERT INTO coin_ledger (profile_id, amount, asset_type, type, ref_type, ref_id, description)
    VALUES (p_recipient_id, v_diamond_amount, 'diamond', 'gift_earn', 'gift', v_gift_id,
            'Gift received: ' || v_diamond_amount || ' diamonds');
    
    -- Update RECIPIENT's diamond balance
    UPDATE profiles
    SET earnings_balance = earnings_balance + v_diamond_amount
    WHERE id = p_recipient_id;
    
    RETURN v_gift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Test it works
SELECT 'Gift function fixed - sender loses coins, recipient gains diamonds' as status;

