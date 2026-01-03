BEGIN;

-- Ensure gifts has request_id for traceability/idempotency observability
ALTER TABLE public.gifts
ADD COLUMN IF NOT EXISTS request_id varchar(255);

CREATE INDEX IF NOT EXISTS idx_gifts_request_id
ON public.gifts(request_id)
WHERE request_id IS NOT NULL;

-- Canonical (7-arg) signature expected by clients
CREATE OR REPLACE FUNCTION public.send_gift_v2(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_coins_amount BIGINT,
  p_gift_type_id BIGINT DEFAULT NULL,
  p_stream_id BIGINT DEFAULT NULL,
  p_request_id VARCHAR(255) DEFAULT NULL,
  p_room_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_balance BIGINT;
  v_request_id VARCHAR(255);
  v_sender_idempotency_key VARCHAR(255);
  v_recipient_idempotency_key VARCHAR(255);
  v_existing_provider_ref VARCHAR(255);
  v_existing_gift_id BIGINT;
  v_gift_id BIGINT;
  v_gift_type_id BIGINT;
  v_gift_rate NUMERIC;
  v_diamonds_awarded BIGINT;
  v_existing_gift public.gifts%ROWTYPE;
BEGIN
  IF public.is_blocked(p_sender_id, p_recipient_id) THEN
    RAISE EXCEPTION 'Gifting unavailable.';
  END IF;

  v_request_id := COALESCE(p_request_id, gen_random_uuid()::text);
  v_sender_idempotency_key := 'gift:sender:' || v_request_id;
  v_recipient_idempotency_key := 'gift:recipient:' || v_request_id;

  PERFORM pg_advisory_xact_lock(hashtext(v_sender_idempotency_key)::bigint);

  SELECT provider_ref
  INTO v_existing_provider_ref
  FROM public.ledger_entries
  WHERE idempotency_key = v_sender_idempotency_key
  LIMIT 1;

  IF v_existing_provider_ref IS NOT NULL THEN
    v_existing_gift_id := NULLIF(split_part(v_existing_provider_ref, ':', 2), '')::bigint;

    IF v_existing_gift_id IS NOT NULL THEN
      SELECT *
      INTO v_existing_gift
      FROM public.gifts
      WHERE id = v_existing_gift_id;

      IF FOUND THEN
        -- Fail-closed if caller tries to reuse request_id with different spend amount
        IF v_existing_gift.coins_spent IS NOT NULL
           AND p_coins_amount IS NOT NULL
           AND v_existing_gift.coins_spent <> p_coins_amount THEN
          RAISE EXCEPTION 'inconsistent_state: request_id already processed with different coins_spent';
        END IF;

        RETURN jsonb_build_object(
          'gift_id', v_existing_gift_id,
          'coins_spent', COALESCE(v_existing_gift.coins_spent, p_coins_amount),
          'diamonds_awarded', COALESCE(v_existing_gift.diamonds_awarded, v_existing_gift.coin_amount, p_coins_amount),
          'platform_fee', COALESCE(v_existing_gift.platform_fee_coins, 0),
          'room_id', p_room_id
        );
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'gift_id', v_existing_gift_id,
      'coins_spent', p_coins_amount,
      'diamonds_awarded', p_coins_amount,
      'platform_fee', 0,
      'room_id', p_room_id
    );
  END IF;

  IF p_sender_id IS NULL OR p_recipient_id IS NULL THEN
    RAISE EXCEPTION 'sender_id and recipient_id are required';
  END IF;

  IF p_sender_id = p_recipient_id THEN
    RAISE EXCEPTION 'Cannot send gift to yourself';
  END IF;

  IF p_coins_amount IS NULL OR p_coins_amount <= 0 THEN
    RAISE EXCEPTION 'coins_amount must be positive';
  END IF;

  SELECT coin_balance
  INTO v_sender_balance
  FROM public.profiles
  WHERE id = p_sender_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sender profile not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_recipient_id) THEN
    RAISE EXCEPTION 'recipient profile not found';
  END IF;

  IF v_sender_balance < p_coins_amount THEN
    RAISE EXCEPTION 'Insufficient coin balance. Have: %, Need: %', v_sender_balance, p_coins_amount;
  END IF;

  SELECT value_num INTO v_gift_rate
  FROM public.money_config
  WHERE key = 'gift_diamond_rate';

  v_gift_rate := COALESCE(v_gift_rate, 1.0);
  v_diamonds_awarded := FLOOR(p_coins_amount * v_gift_rate)::bigint;

  IF v_diamonds_awarded <= 0 THEN
    RAISE EXCEPTION 'Invalid gift award rate';
  END IF;

  -- Resolve gift type
  IF p_gift_type_id IS NOT NULL THEN
    v_gift_type_id := p_gift_type_id;
  ELSE
    SELECT id
    INTO v_gift_type_id
    FROM public.gift_types
    WHERE COALESCE(is_active, true) = true
    ORDER BY COALESCE(display_order, 0) ASC, id ASC
    LIMIT 1;

    IF v_gift_type_id IS NULL THEN
      RAISE EXCEPTION 'No active gift_types found';
    END IF;
  END IF;

  INSERT INTO public.gifts(
    sender_id,
    recipient_id,
    gift_type_id,
    coin_amount,
    platform_revenue,
    streamer_revenue,
    live_stream_id,
    coins_spent,
    diamonds_awarded,
    platform_fee_coins,
    request_id
  )
  VALUES (
    p_sender_id,
    p_recipient_id,
    v_gift_type_id,
    p_coins_amount,
    0,
    v_diamonds_awarded,
    p_stream_id,
    p_coins_amount,
    v_diamonds_awarded,
    0,
    v_request_id
  )
  RETURNING id INTO v_gift_id;

  -- Ledger entries are canonical; trigger updates wallet balances.
  INSERT INTO public.ledger_entries(
    idempotency_key,
    user_id,
    entry_type,
    delta_coins,
    delta_diamonds,
    provider_ref,
    metadata,
    room_id
  )
  VALUES (
    v_sender_idempotency_key,
    p_sender_id,
    'coin_spend_gift',
    -p_coins_amount,
    0,
    'gift:' || v_gift_id,
    jsonb_build_object('recipient_id', p_recipient_id, 'gift_type_id', v_gift_type_id, 'stream_id', p_stream_id, 'room_id', p_room_id),
    p_room_id
  );

  INSERT INTO public.ledger_entries(
    idempotency_key,
    user_id,
    entry_type,
    delta_coins,
    delta_diamonds,
    provider_ref,
    metadata,
    room_id
  )
  VALUES (
    v_recipient_idempotency_key,
    p_recipient_id,
    'diamond_earn',
    0,
    v_diamonds_awarded,
    'gift:' || v_gift_id,
    jsonb_build_object('sender_id', p_sender_id, 'gift_type_id', v_gift_type_id, 'stream_id', p_stream_id, 'room_id', p_room_id),
    p_room_id
  );

  BEGIN
    UPDATE public.profiles
    SET total_spent = COALESCE(total_spent, 0) + p_coins_amount,
        total_gifts_sent = COALESCE(total_gifts_sent, 0) + p_coins_amount
    WHERE id = p_sender_id;
  EXCEPTION
    WHEN undefined_column THEN
      NULL;
  END;

  BEGIN
    UPDATE public.profiles
    SET total_gifts_received = COALESCE(total_gifts_received, 0) + p_coins_amount
    WHERE id = p_recipient_id;
  EXCEPTION
    WHEN undefined_column THEN
      NULL;
  END;

  RETURN jsonb_build_object(
    'gift_id', v_gift_id,
    'coins_spent', p_coins_amount,
    'diamonds_awarded', v_diamonds_awarded,
    'platform_fee', 0,
    'room_id', p_room_id
  );
END;
$$;

-- Back-compat wrapper (6-arg)
CREATE OR REPLACE FUNCTION public.send_gift_v2(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_coins_amount BIGINT,
  p_gift_type_id BIGINT DEFAULT NULL,
  p_stream_id BIGINT DEFAULT NULL,
  p_request_id VARCHAR(255) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.send_gift_v2(
    p_sender_id,
    p_recipient_id,
    p_coins_amount,
    p_gift_type_id,
    p_stream_id,
    p_request_id,
    NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.send_gift_v2(UUID, UUID, BIGINT, BIGINT, BIGINT, VARCHAR, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_gift_v2(UUID, UUID, BIGINT, BIGINT, BIGINT, VARCHAR) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.send_gift_v2(UUID, UUID, BIGINT, BIGINT, BIGINT, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_gift_v2(UUID, UUID, BIGINT, BIGINT, BIGINT, VARCHAR) TO authenticated;

-- Make PostgREST pick up the function signature immediately
NOTIFY pgrst, 'reload schema';

COMMIT;
