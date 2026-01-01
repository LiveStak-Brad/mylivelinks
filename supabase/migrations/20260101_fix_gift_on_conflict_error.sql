BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.ledger_entries'::regclass
      AND conname = 'ledger_entries_idempotency_key_key'
  ) THEN
    ALTER TABLE public.ledger_entries
      ADD CONSTRAINT ledger_entries_idempotency_key_key UNIQUE (idempotency_key);
  END IF;
END $$;

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
BEGIN
  IF public.is_blocked(p_sender_id, p_recipient_id) THEN
    RAISE EXCEPTION 'blocked';
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

    RETURN jsonb_build_object(
      'gift_id', v_existing_gift_id,
      'coins_spent', p_coins_amount,
      'diamonds_awarded', NULL,
      'platform_fee', 0
    );
  END IF;

  IF p_sender_id IS NULL OR p_recipient_id IS NULL THEN
    RAISE EXCEPTION 'sender_id and recipient_id are required';
  END IF;

  IF p_sender_id = p_recipient_id THEN
    RAISE EXCEPTION 'Cannot send gift to yourself';
  END IF;

  IF p_coins_amount IS NULL OR p_coins_amount <= 0 THEN
    RAISE EXCEPTION 'coins amount must be positive';
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

  v_diamonds_awarded := FLOOR(p_coins_amount * COALESCE(v_gift_rate, 1.0));

  IF v_diamonds_awarded <= 0 THEN
    RAISE EXCEPTION 'Invalid gift award rate';
  END IF;

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

  INSERT INTO public.gifts (
    sender_id,
    recipient_id,
    gift_type_id,
    coin_amount,
    platform_revenue,
    streamer_revenue,
    live_stream_id
  )
  VALUES (
    p_sender_id,
    p_recipient_id,
    v_gift_type_id,
    p_coins_amount,
    0,
    v_diamonds_awarded,
    p_stream_id
  )
  RETURNING id INTO v_gift_id;

  INSERT INTO public.ledger_entries (
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

  INSERT INTO public.ledger_entries (
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

  RETURN jsonb_build_object(
    'gift_id', v_gift_id,
    'coins_spent', p_coins_amount,
    'diamonds_awarded', v_diamonds_awarded,
    'platform_fee', 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_gift_v2 TO authenticated;

COMMENT ON FUNCTION public.send_gift_v2 IS 'Send gift with recipient validation. Prevents sending to invalid/arbitrary user IDs. 1:1 coins->diamonds, idempotent via request_id. Fixed ON CONFLICT constraint error.';

COMMIT;
