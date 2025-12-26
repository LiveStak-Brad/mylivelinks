BEGIN;

-- Canonical gift economics:
-- - coins_spent == diamonds_awarded (1:1)
-- - platform fee on gifts = 0
-- - update profiles.total_gifts_received exactly once (leaderboard metric)
-- - idempotency via public.ledger_entries.idempotency_key

-- Ensure we do NOT also have an INSERT trigger on gifts double-counting totals.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'gifts'
      AND t.tgname = 'trigger_update_gift_totals'
  ) THEN
    EXECUTE 'DROP TRIGGER trigger_update_gift_totals ON public.gifts';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_gift_totals'
  ) THEN
    EXECUTE 'DROP FUNCTION public.update_gift_totals()';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_gift_v2(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_coins_amount bigint,
  p_gift_type_id bigint DEFAULT NULL,
  p_stream_id bigint DEFAULT NULL,
  p_request_id varchar DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_sender_balance bigint;
  v_diamonds_awarded bigint;
  v_platform_fee bigint;
  v_gift_id bigint;

  v_request_id varchar;
  v_sender_idempotency_key varchar;
  v_recipient_idempotency_key varchar;

  v_existing_provider_ref varchar;
  v_existing_gift_id bigint;

  v_gift_type_id bigint;
BEGIN
  v_request_id := COALESCE(p_request_id, gen_random_uuid()::text);
  v_sender_idempotency_key := 'gift:sender:' || v_request_id;
  v_recipient_idempotency_key := 'gift:recipient:' || v_request_id;

  -- Serialize retries/concurrent calls per request_id.
  PERFORM pg_advisory_xact_lock(hashtext(v_sender_idempotency_key)::bigint);

  -- Idempotency: if sender ledger entry exists, consider this already processed.
  SELECT le.provider_ref
  INTO v_existing_provider_ref
  FROM public.ledger_entries le
  WHERE le.idempotency_key = v_sender_idempotency_key
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

  IF p_sender_id IS NULL OR p_recipient_id IS NULL THEN
    RAISE EXCEPTION 'sender_id and recipient_id are required';
  END IF;

  IF p_sender_id = p_recipient_id THEN
    RAISE EXCEPTION 'Cannot send gift to yourself';
  END IF;

  IF p_coins_amount IS NULL OR p_coins_amount <= 0 THEN
    RAISE EXCEPTION 'coins amount must be positive';
  END IF;

  -- Lock sender profile to validate and update balance.
  SELECT p.coin_balance
  INTO v_sender_balance
  FROM public.profiles p
  WHERE p.id = p_sender_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sender profile not found';
  END IF;

  IF v_sender_balance < p_coins_amount THEN
    RAISE EXCEPTION 'Insufficient coin balance. Have: %, Need: %', v_sender_balance, p_coins_amount;
  END IF;

  -- Canonical gift economics (1:1)
  v_diamonds_awarded := p_coins_amount;
  v_platform_fee := 0;

  -- Resolve/validate gift_type_id (NOT NULL in production schema)
  IF p_gift_type_id IS NOT NULL THEN
    SELECT gt.id
    INTO v_gift_type_id
    FROM public.gift_types gt
    WHERE gt.id = p_gift_type_id
      AND COALESCE(gt.is_active, true) = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or inactive gift_type_id: %', p_gift_type_id;
    END IF;
  ELSE
    SELECT gt.id
    INTO v_gift_type_id
    FROM public.gift_types gt
    WHERE COALESCE(gt.is_active, true) = true
    ORDER BY COALESCE(gt.display_order, 0) ASC, gt.id ASC
    LIMIT 1;

    IF v_gift_type_id IS NULL THEN
      RAISE EXCEPTION 'No active gift_types found';
    END IF;
  END IF;

  -- Insert gift row using production schema.
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
    p_coins_amount,
    p_stream_id
  )
  RETURNING id INTO v_gift_id;

  -- Ledger entries (idempotent).
  INSERT INTO public.ledger_entries (
    idempotency_key,
    user_id,
    entry_type,
    delta_coins,
    delta_diamonds,
    provider_ref,
    metadata
  )
  VALUES (
    v_sender_idempotency_key,
    p_sender_id,
    'coin_spend_gift',
    -p_coins_amount,
    0,
    'gift:' || v_gift_id,
    jsonb_build_object(
      'gift_id', v_gift_id,
      'recipient_id', p_recipient_id,
      'live_stream_id', p_stream_id,
      'coins_spent', p_coins_amount
    )
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  INSERT INTO public.ledger_entries (
    idempotency_key,
    user_id,
    entry_type,
    delta_coins,
    delta_diamonds,
    provider_ref,
    metadata
  )
  VALUES (
    v_recipient_idempotency_key,
    p_recipient_id,
    'diamond_earn',
    0,
    v_diamonds_awarded,
    'gift:' || v_gift_id,
    jsonb_build_object(
      'gift_id', v_gift_id,
      'sender_id', p_sender_id,
      'live_stream_id', p_stream_id,
      'diamonds_awarded', v_diamonds_awarded
    )
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  -- IMPORTANT: Do NOT update cached profile balances/totals here.
  -- Production DB uses triggers to recompute profiles balances from ledger_entries
  -- and to update gift totals from gifts inserts. Updating profiles here would double-credit.

  RETURN jsonb_build_object(
    'gift_id', v_gift_id,
    'coins_spent', p_coins_amount,
    'diamonds_awarded', v_diamonds_awarded,
    'platform_fee', v_platform_fee
  );
END;
$$;

COMMIT;
