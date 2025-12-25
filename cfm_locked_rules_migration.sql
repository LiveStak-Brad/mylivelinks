CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    entry_type VARCHAR(50) NOT NULL,
    delta_coins BIGINT DEFAULT 0,
    delta_diamonds BIGINT DEFAULT 0,
    amount_usd_cents INTEGER,
    provider_ref VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE gifts
ADD COLUMN IF NOT EXISTS coins_spent BIGINT,
ADD COLUMN IF NOT EXISTS diamonds_awarded BIGINT,
ADD COLUMN IF NOT EXISTS platform_fee_coins BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM gift_types WHERE name = 'Custom Gift') THEN
    INSERT INTO gift_types (name, coin_cost, tier, is_active, display_order)
    VALUES ('Custom Gift', 1, 1, TRUE, 0);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION update_coin_balance_via_ledger(
    p_profile_id UUID,
    p_amount BIGINT,
    p_type VARCHAR(50),
    p_ref_type VARCHAR(50) DEFAULT NULL,
    p_ref_id BIGINT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_new_balance BIGINT;
    v_has_asset_type BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'coin_ledger'
          AND column_name = 'asset_type'
    ) INTO v_has_asset_type;

    PERFORM 1 FROM profiles WHERE id = p_profile_id FOR UPDATE;

    IF v_has_asset_type THEN
        EXECUTE
            'INSERT INTO coin_ledger (profile_id, amount, asset_type, type, ref_type, ref_id, description)
             VALUES ($1, $2, ''coin'', $3, $4, $5, $6)'
        USING p_profile_id, p_amount, p_type, p_ref_type, p_ref_id, p_description;

        EXECUTE
            'SELECT COALESCE(SUM(amount), 0) FROM coin_ledger WHERE profile_id = $1 AND asset_type = ''coin''' 
        INTO v_new_balance
        USING p_profile_id;
    ELSE
        INSERT INTO coin_ledger (profile_id, amount, type, ref_type, ref_id, description)
        VALUES (p_profile_id, p_amount, p_type, p_ref_type, p_ref_id, p_description);

        SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
        FROM coin_ledger
        WHERE profile_id = p_profile_id;
    END IF;

    UPDATE profiles
    SET coin_balance = v_new_balance,
        last_transaction_at = CURRENT_TIMESTAMP
    WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

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
    SELECT id INTO v_ledger_id
    FROM ledger_entries
    WHERE idempotency_key = p_idempotency_key;

    IF v_ledger_id IS NOT NULL THEN
        RETURN v_ledger_id;
    END IF;

    INSERT INTO ledger_entries (
        idempotency_key,
        user_id,
        entry_type,
        delta_coins,
        amount_usd_cents,
        provider_ref
    )
    VALUES (
        p_idempotency_key,
        p_user_id,
        'coin_purchase',
        p_coins_amount,
        p_amount_usd_cents,
        p_provider_ref
    )
    RETURNING id INTO v_ledger_id;

    PERFORM update_coin_balance_via_ledger(
        p_user_id,
        p_coins_amount,
        'purchase',
        'stripe',
        NULL,
        'Coin purchase'
    );

    UPDATE profiles
    SET total_purchased = COALESCE(total_purchased, 0) + p_coins_amount
    WHERE id = p_user_id;

    RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

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
    v_gift_id BIGINT;
    v_sender_idempotency_key VARCHAR(255);
    v_recipient_idempotency_key VARCHAR(255);
    v_gift_type_id BIGINT;
BEGIN
    v_sender_idempotency_key := 'gift:sender:' || COALESCE(p_request_id, gen_random_uuid()::text);
    v_recipient_idempotency_key := 'gift:recipient:' || COALESCE(p_request_id, gen_random_uuid()::text);

    SELECT coin_balance INTO v_sender_balance
    FROM profiles
    WHERE id = p_sender_id
    FOR UPDATE;

    IF v_sender_balance < p_coins_amount THEN
        RAISE EXCEPTION 'Insufficient coin balance. Have: %, Need: %', v_sender_balance, p_coins_amount;
    END IF;

    v_diamonds_awarded := p_coins_amount;

    IF p_gift_type_id IS NULL THEN
        SELECT id INTO v_gift_type_id
        FROM gift_types
        WHERE name = 'Custom Gift'
        LIMIT 1;
    ELSE
        v_gift_type_id := p_gift_type_id;
    END IF;

    INSERT INTO gifts (
        sender_id,
        recipient_id,
        gift_type_id,
        coin_amount,
        coins_spent,
        diamonds_awarded,
        platform_fee_coins,
        platform_revenue,
        streamer_revenue,
        live_stream_id
    )
    VALUES (
        p_sender_id,
        p_recipient_id,
        v_gift_type_id,
        p_coins_amount,
        p_coins_amount,
        v_diamonds_awarded,
        0,
        0,
        p_coins_amount,
        p_stream_id
    )
    RETURNING id INTO v_gift_id;

    INSERT INTO ledger_entries (
        idempotency_key,
        user_id,
        entry_type,
        delta_coins,
        provider_ref
    )
    VALUES (
        v_sender_idempotency_key,
        p_sender_id,
        'coin_spend_gift',
        -p_coins_amount,
        'gift:' || v_gift_id
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    INSERT INTO ledger_entries (
        idempotency_key,
        user_id,
        entry_type,
        delta_diamonds,
        provider_ref
    )
    VALUES (
        v_recipient_idempotency_key,
        p_recipient_id,
        'diamond_earn',
        v_diamonds_awarded,
        'gift:' || v_gift_id
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    PERFORM update_coin_balance_via_ledger(
        p_sender_id,
        -p_coins_amount,
        'gift_sent',
        'gift',
        v_gift_id,
        'Gift sent'
    );

    UPDATE profiles
    SET total_spent = COALESCE(total_spent, 0) + p_coins_amount,
        last_transaction_at = CURRENT_TIMESTAMP
    WHERE id = p_sender_id;

    UPDATE profiles
    SET earnings_balance = earnings_balance + v_diamonds_awarded,
        last_transaction_at = CURRENT_TIMESTAMP
    WHERE id = p_recipient_id;

    RETURN jsonb_build_object(
        'gift_id', v_gift_id,
        'coins_spent', p_coins_amount,
        'diamonds_awarded', v_diamonds_awarded,
        'platform_fee', 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

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
    v_idempotency_key := 'cashout:' || p_request_id;

    SELECT id INTO v_cashout_id
    FROM cashouts
    WHERE idempotency_key = v_idempotency_key;

    IF v_cashout_id IS NOT NULL THEN
        RETURN (
            SELECT jsonb_build_object(
                'cashout_id', id,
                'diamonds_debited', diamonds_debited,
                'amount_usd_cents', amount_usd_cents,
                'status', status,
                'already_exists', true
            )
            FROM cashouts
            WHERE id = v_cashout_id
        );
    END IF;

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

    SELECT earnings_balance INTO v_diamond_balance
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_diamond_balance < 10000 THEN
        RAISE EXCEPTION 'Minimum cashout is 10,000 diamonds ($100). Current balance: %', v_diamond_balance;
    END IF;

    v_diamonds_to_debit := LEAST(p_diamonds_requested, v_diamond_balance);

    IF v_diamonds_to_debit < 10000 THEN
        RAISE EXCEPTION 'Minimum cashout is 10,000 diamonds ($100). Requested: %', v_diamonds_to_debit;
    END IF;

    v_amount_usd_cents := v_diamonds_to_debit;

    INSERT INTO ledger_entries (
        idempotency_key,
        user_id,
        entry_type,
        delta_diamonds,
        amount_usd_cents,
        provider_ref
    )
    VALUES (
        v_idempotency_key || ':ledger',
        p_user_id,
        'diamond_debit_cashout',
        -v_diamonds_to_debit,
        v_amount_usd_cents,
        'pending'
    )
    RETURNING id INTO v_ledger_id;

    INSERT INTO cashouts (
        user_id,
        diamonds_debited,
        amount_usd_cents,
        status,
        stripe_account_id,
        idempotency_key
    )
    VALUES (
        p_user_id,
        v_diamonds_to_debit,
        v_amount_usd_cents,
        'pending',
        v_stripe_account_id,
        v_idempotency_key
    )
    RETURNING id INTO v_cashout_id;

    UPDATE profiles
    SET earnings_balance = earnings_balance - v_diamonds_to_debit,
        last_transaction_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

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

CREATE OR REPLACE FUNCTION convert_diamonds_to_coins(
    p_profile_id UUID,
    p_diamonds_in BIGINT
)
RETURNS BIGINT AS $$
DECLARE
    v_diamond_balance BIGINT;
    v_coins_out BIGINT;
    v_fee_amount BIGINT;
    v_conversion_rate DECIMAL(5, 4) := 0.6000;
    v_min_diamonds BIGINT := 3;
    v_conversion_id BIGINT;
    v_has_asset_type BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'coin_ledger'
          AND column_name = 'asset_type'
    ) INTO v_has_asset_type;

    IF p_diamonds_in < v_min_diamonds THEN
        RAISE EXCEPTION 'Minimum conversion is % diamonds (yields at least 1 coin after 40%% haircut)', v_min_diamonds;
    END IF;

    SELECT earnings_balance INTO v_diamond_balance
    FROM profiles
    WHERE id = p_profile_id;

    IF v_diamond_balance < p_diamonds_in THEN
        RAISE EXCEPTION 'Insufficient diamond balance. You have % diamonds, trying to convert %', v_diamond_balance, p_diamonds_in;
    END IF;

    v_coins_out := FLOOR(p_diamonds_in * v_conversion_rate);
    v_fee_amount := p_diamonds_in - v_coins_out;

    IF v_coins_out < 1 THEN
        RAISE EXCEPTION 'Conversion too small. Minimum % diamonds required to yield 1 coin', v_min_diamonds;
    END IF;

    INSERT INTO diamond_conversions (
        profile_id,
        diamonds_in,
        coins_out,
        fee_amount,
        conversion_rate,
        status,
        completed_at
    )
    VALUES (
        p_profile_id,
        p_diamonds_in,
        v_coins_out,
        v_fee_amount,
        v_conversion_rate,
        'completed',
        CURRENT_TIMESTAMP
    )
    RETURNING id INTO v_conversion_id;

    IF v_has_asset_type THEN
        INSERT INTO coin_ledger (profile_id, amount, asset_type, type, ref_type, ref_id, description)
        VALUES (
            p_profile_id,
            -p_diamonds_in,
            'diamond',
            'convert_out',
            'diamond_conversion',
            v_conversion_id,
            'Diamond conversion: diamonds removed'
        );

        INSERT INTO coin_ledger (profile_id, amount, asset_type, type, ref_type, ref_id, description)
        VALUES (
            p_profile_id,
            v_fee_amount,
            'diamond',
            'convert_fee',
            'diamond_conversion',
            v_conversion_id,
            'Diamond conversion: platform haircut'
        );
    ELSE
        INSERT INTO coin_ledger (profile_id, amount, type, ref_type, ref_id, description)
        VALUES (
            p_profile_id,
            -p_diamonds_in,
            'convert_out',
            'diamond_conversion',
            v_conversion_id,
            'Diamond conversion: diamonds removed'
        );

        INSERT INTO coin_ledger (profile_id, amount, type, ref_type, ref_id, description)
        VALUES (
            p_profile_id,
            v_fee_amount,
            'convert_fee',
            'diamond_conversion',
            v_conversion_id,
            'Diamond conversion: platform haircut'
        );
    END IF;

    UPDATE profiles
    SET earnings_balance = earnings_balance - p_diamonds_in,
        last_transaction_at = CURRENT_TIMESTAMP
    WHERE id = p_profile_id;

    PERFORM update_coin_balance_via_ledger(
        p_profile_id,
        v_coins_out,
        'convert_in',
        'diamond_conversion',
        v_conversion_id,
        'Diamond conversion: coins received'
    );

    RETURN v_conversion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
