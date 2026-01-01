BEGIN;

CREATE OR REPLACE FUNCTION public.process_coin_refund(
  p_payment_intent_id TEXT,
  p_refund_event_id TEXT,
  p_refund_cents INTEGER,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_reason TEXT := lower(trim(COALESCE(p_reason, '')));
  v_purchase public.coin_purchases%ROWTYPE;
  v_coins_awarded BIGINT;
  v_amount_usd_cents INTEGER;
  v_original_amount_cents INTEGER;
  v_coins_to_reverse BIGINT;
  v_metadata JSONB := COALESCE(p_metadata, '{}'::jsonb);
  v_purchase_metadata JSONB;
  v_event_metadata JSONB;
  v_updated_metadata JSONB;
  v_entry_type TEXT;
  v_idempotency_key TEXT := 'stripe:refund:' || COALESCE(p_refund_event_id, '');
  v_ledger_id BIGINT;
  v_existing_entry_metadata JSONB;
BEGIN
  IF p_payment_intent_id IS NULL OR length(trim(p_payment_intent_id)) = 0 THEN
    RAISE EXCEPTION 'payment_intent_id is required';
  END IF;

  IF p_refund_event_id IS NULL OR length(trim(p_refund_event_id)) = 0 THEN
    RAISE EXCEPTION 'refund_event_id is required';
  END IF;

  IF p_refund_cents IS NULL OR p_refund_cents <= 0 THEN
    RAISE EXCEPTION 'refund cents must be positive';
  END IF;

  IF v_reason NOT IN ('refund', 'dispute', 'chargeback') THEN
    RAISE EXCEPTION 'reason % is not supported (expected refund|dispute|chargeback)', v_reason;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('stripe_refund:' || p_refund_event_id)::bigint);

  SELECT *
  INTO v_purchase
  FROM public.coin_purchases
  WHERE provider_payment_id = p_payment_intent_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'coin_purchase not found for payment intent %', p_payment_intent_id;
  END IF;

  v_coins_awarded := COALESCE(v_purchase.coins_awarded, v_purchase.coin_amount);
  IF v_coins_awarded IS NULL OR v_coins_awarded <= 0 THEN
    RAISE EXCEPTION 'purchase % has no recorded coin award to reverse', v_purchase.id;
  END IF;

  v_amount_usd_cents := v_purchase.amount_usd_cents;

  IF v_amount_usd_cents IS NOT NULL AND v_amount_usd_cents > 0 THEN
    v_coins_to_reverse := ROUND(v_coins_awarded * p_refund_cents::numeric / v_amount_usd_cents)::bigint;
  ELSE
    v_original_amount_cents := COALESCE(
      NULLIF((v_purchase.metadata->>'resolved_amount_usd_cents')::int, 0),
      NULLIF((v_purchase.metadata->>'original_amount_usd_cents')::int, 0),
      NULLIF((v_purchase.metadata->>'full_amount_usd_cents')::int, 0)
    );

    IF v_original_amount_cents IS NOT NULL AND v_original_amount_cents = p_refund_cents THEN
      v_coins_to_reverse := v_coins_awarded;
    ELSE
      RAISE EXCEPTION 'unable to determine coins to reverse for payment intent % (missing amount metadata)', p_payment_intent_id;
    END IF;
  END IF;

  IF v_coins_to_reverse IS NULL OR v_coins_to_reverse <= 0 THEN
    RAISE EXCEPTION 'calculated coin reversal is invalid (%). payment_intent=%', v_coins_to_reverse, p_payment_intent_id;
  END IF;

  IF v_coins_to_reverse > v_coins_awarded THEN
    RAISE EXCEPTION 'coin reversal % exceeds original award % for payment_intent %', v_coins_to_reverse, v_coins_awarded, p_payment_intent_id;
  END IF;

  v_entry_type := CASE
    WHEN v_reason = 'refund' THEN 'coin_refund'
    ELSE 'coin_dispute'
  END;

  IF v_reason = 'refund' THEN
    v_event_metadata := jsonb_build_object(
      'last_refund_event_id', p_refund_event_id,
      'last_refund_reason', v_reason,
      'last_refund_cents', p_refund_cents,
      'last_refund_coins', v_coins_to_reverse,
      'last_refund_at', v_now
    );
  ELSE
    v_event_metadata := jsonb_build_object(
      'last_dispute_event_id', p_refund_event_id,
      'last_dispute_reason', v_reason,
      'last_dispute_cents', p_refund_cents,
      'last_dispute_coins', v_coins_to_reverse,
      'last_dispute_at', v_now
    );
  END IF;

  v_purchase_metadata := COALESCE(v_purchase.metadata, '{}'::jsonb);
  v_updated_metadata := v_purchase_metadata || v_event_metadata || v_metadata;

  v_existing_entry_metadata := jsonb_build_object(
    'refund_event_id', p_refund_event_id,
    'reason', v_reason,
    'refund_cents', p_refund_cents,
    'coins_reversed', v_coins_to_reverse,
    'original_purchase_id', v_purchase.id,
    'original_amount_usd_cents', v_amount_usd_cents,
    'original_coins_awarded', v_coins_awarded
  ) || v_metadata;

  INSERT INTO public.ledger_entries (
    idempotency_key,
    user_id,
    entry_type,
    delta_coins,
    delta_diamonds,
    amount_usd_cents,
    provider_ref,
    metadata
  ) VALUES (
    v_idempotency_key,
    v_purchase.profile_id,
    v_entry_type,
    -v_coins_to_reverse,
    0,
    -p_refund_cents,
    p_payment_intent_id,
    v_existing_entry_metadata
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_ledger_id;

  IF v_ledger_id IS NULL THEN
    SELECT id, metadata
    INTO v_ledger_id, v_existing_entry_metadata
    FROM public.ledger_entries
    WHERE idempotency_key = v_idempotency_key
    LIMIT 1;

    IF v_ledger_id IS NULL THEN
      RAISE EXCEPTION 'unable to record refund ledger entry for event % (idempotency failure)', p_refund_event_id;
    END IF;

    RETURN jsonb_build_object(
      'ledger_entry_id', v_ledger_id,
      'coins_reversed', COALESCE((v_existing_entry_metadata->>'coins_reversed')::bigint, v_coins_to_reverse),
      'refund_cents', COALESCE((v_existing_entry_metadata->>'refund_cents')::int, p_refund_cents),
      'purchase_id', v_purchase.id
    );
  END IF;

  IF v_reason = 'refund' THEN
    UPDATE public.coin_purchases
    SET refunded_cents = COALESCE(refunded_cents, 0) + p_refund_cents,
        refunded_at = COALESCE(refunded_at, v_now),
        status = 'refunded',
        metadata = v_updated_metadata
    WHERE id = v_purchase.id;
  ELSE
    UPDATE public.coin_purchases
    SET disputed_cents = COALESCE(disputed_cents, 0) + p_refund_cents,
        status = 'disputed',
        metadata = v_updated_metadata
    WHERE id = v_purchase.id;
  END IF;

  RETURN jsonb_build_object(
    'ledger_entry_id', v_ledger_id,
    'coins_reversed', v_coins_to_reverse,
    'refund_cents', p_refund_cents,
    'purchase_id', v_purchase.id
  );
END;
$$;

COMMIT;
