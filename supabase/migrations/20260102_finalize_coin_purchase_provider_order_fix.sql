BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coin_purchases'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.coin_purchases
      ADD COLUMN user_id uuid;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coin_purchases'
      AND column_name = 'provider'
  ) THEN
    ALTER TABLE public.coin_purchases
      ADD COLUMN provider text;
  END IF;
END;
$$;

UPDATE public.coin_purchases
SET provider = COALESCE(provider, 'stripe')
WHERE provider IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coin_purchases'
      AND column_name = 'provider'
  ) THEN
    EXECUTE 'ALTER TABLE public.coin_purchases ALTER COLUMN provider SET NOT NULL';
  END IF;
END;
$$;

UPDATE public.coin_purchases
SET user_id = profile_id
WHERE user_id IS NULL
  AND profile_id IS NOT NULL;

ALTER TABLE public.coin_purchases
  ALTER COLUMN user_id SET NOT NULL;

UPDATE public.coin_purchases
SET provider_order_id = provider_payment_id
WHERE provider_order_id IS NULL
  AND provider_payment_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coin_purchases'
      AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE public.coin_purchases
      ADD COLUMN idempotency_key text;
  END IF;
END;
$$;

UPDATE public.coin_purchases
SET idempotency_key = provider_payment_id
WHERE idempotency_key IS NULL
  AND provider_payment_id IS NOT NULL;

ALTER TABLE public.coin_purchases
  ALTER COLUMN idempotency_key SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coin_purchases_user_id_fkey'
      AND conrelid = 'public.coin_purchases'::regclass
  ) THEN
    ALTER TABLE public.coin_purchases
      ADD CONSTRAINT coin_purchases_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_coin_purchases_user_id
  ON public.coin_purchases(user_id);

CREATE OR REPLACE FUNCTION public.finalize_coin_purchase_v2(
  p_payment_intent_id TEXT,
  p_profile_id UUID,
  p_stripe_price_id TEXT DEFAULT NULL,
  p_platform TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idempotency_key TEXT := 'stripe:pi:' || p_payment_intent_id;
  v_metadata JSONB := COALESCE(p_metadata, '{}'::jsonb);
  v_pack_sku TEXT;
  v_price_id TEXT;
  v_pack coin_packs%ROWTYPE;
  v_coins_awarded BIGINT;
  v_amount_usd_cents INTEGER;
  v_now TIMESTAMPTZ := now();
  v_platform TEXT := COALESCE(p_platform, v_metadata->>'platform', 'web');
  v_purchase_id BIGINT;
  v_existing_ledger_id UUID;
  v_ledger_id UUID;
  v_existing_purchase coin_purchases%ROWTYPE;
BEGIN
  IF p_payment_intent_id IS NULL OR length(trim(p_payment_intent_id)) = 0 THEN
    RAISE EXCEPTION 'payment_intent_id is required';
  END IF;

  IF p_profile_id IS NULL THEN
    RAISE EXCEPTION 'profile_id is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('stripe_pi:' || p_payment_intent_id)::bigint);

  v_price_id := COALESCE(p_stripe_price_id, v_metadata->>'stripe_price_id', v_metadata->>'price_id');
  v_pack_sku := COALESCE(v_metadata->>'pack_sku', v_metadata->>'sku');

  SELECT cp.*
  INTO v_pack
  FROM public.coin_packs cp
  WHERE
        (v_price_id IS NOT NULL AND cp.stripe_price_id = v_price_id)
     OR (v_pack_sku IS NOT NULL AND cp.sku = v_pack_sku)
  ORDER BY
        CASE WHEN v_price_id IS NOT NULL AND cp.stripe_price_id = v_price_id THEN 0 ELSE 1 END,
        CASE WHEN v_pack_sku IS NOT NULL AND cp.sku = v_pack_sku THEN 0 ELSE 1 END,
        cp.id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'coin pack not found for payment intent %, price_id %, sku %', p_payment_intent_id, v_price_id, v_pack_sku;
  END IF;

  v_coins_awarded := v_pack.coins;
  v_amount_usd_cents := COALESCE(
    v_pack.price_cents,
    NULLIF(v_metadata->>'payment_amount_cents', '')::int,
    NULLIF(v_metadata->>'usd_cents', '')::int,
    CASE WHEN v_pack.price_usd IS NOT NULL THEN round(v_pack.price_usd * 100)::int ELSE NULL END
  );

  IF v_coins_awarded IS NULL OR v_coins_awarded <= 0 THEN
    RAISE EXCEPTION 'resolved coin amount invalid for payment intent %', p_payment_intent_id;
  END IF;

  IF v_amount_usd_cents IS NULL OR v_amount_usd_cents <= 0 THEN
    RAISE EXCEPTION 'resolved usd cents invalid for payment intent %', p_payment_intent_id;
  END IF;

  IF v_price_id IS NULL THEN
    v_price_id := v_pack.stripe_price_id;
  END IF;

  v_metadata := v_metadata || jsonb_build_object(
    'resolved_pack_id', v_pack.id,
    'resolved_pack_sku', v_pack.sku,
    'resolved_stripe_price_id', v_price_id,
    'resolved_coins_awarded', v_coins_awarded,
    'resolved_amount_usd_cents', v_amount_usd_cents
  );

  SELECT *
  INTO v_existing_purchase
  FROM public.coin_purchases
  WHERE provider_payment_id = p_payment_intent_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_purchase.profile_id IS DISTINCT FROM p_profile_id
       OR (v_existing_purchase.user_id IS NOT NULL AND v_existing_purchase.user_id IS DISTINCT FROM p_profile_id) THEN
      RAISE EXCEPTION 'payment intent % already linked to profile % (attempted profile %)',
        p_payment_intent_id,
        COALESCE(v_existing_purchase.profile_id, v_existing_purchase.user_id),
        p_profile_id;
    END IF;

    v_purchase_id := v_existing_purchase.id;
    v_existing_ledger_id := v_existing_purchase.ledger_entry_id;

    UPDATE public.coin_purchases
    SET user_id = p_profile_id,
        profile_id = p_profile_id,
        idempotency_key = COALESCE(idempotency_key, v_idempotency_key),
        provider_order_id = COALESCE(provider_order_id, p_payment_intent_id),
        provider = COALESCE(provider, 'stripe'),
        platform = COALESCE(platform, v_platform),
        coin_amount = COALESCE(coin_amount, v_coins_awarded),
        coins_awarded = COALESCE(coins_awarded, v_coins_awarded),
        usd_cents = COALESCE(usd_cents, v_amount_usd_cents),
        amount_usd_cents = COALESCE(amount_usd_cents, v_amount_usd_cents),
        stripe_price_id = COALESCE(stripe_price_id, v_price_id),
        payment_provider = COALESCE(payment_provider, 'stripe'),
        status = 'confirmed',
        confirmed_at = COALESCE(confirmed_at, v_now),
        metadata = COALESCE(metadata, '{}'::jsonb) || v_metadata
    WHERE id = v_purchase_id
    RETURNING ledger_entry_id::uuid INTO v_existing_ledger_id;

  ELSE
    INSERT INTO public.coin_purchases (
      profile_id,
      user_id,
      idempotency_key,
      provider,
      platform,
      payment_provider,
      provider_payment_id,
      provider_order_id,
      coin_amount,
      coins_awarded,
      usd_cents,
      amount_usd_cents,
      stripe_price_id,
      status,
      confirmed_at,
      metadata
    ) VALUES (
      p_profile_id,
      p_profile_id,
      v_idempotency_key,
      'stripe',
      v_platform,
      'stripe',
      p_payment_intent_id,
      p_payment_intent_id,
      v_coins_awarded,
      v_coins_awarded,
      v_amount_usd_cents,
      v_amount_usd_cents,
      v_price_id,
      'confirmed',
      v_now,
      v_metadata
    )
    RETURNING id INTO v_purchase_id;

    v_existing_ledger_id := NULL;
  END IF;

  IF v_existing_ledger_id IS NULL THEN
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
      p_profile_id,
      'coin_purchase',
      v_coins_awarded,
      0,
      v_amount_usd_cents,
      p_payment_intent_id,
      jsonb_build_object(
        'coins_awarded', v_coins_awarded,
        'usd_cents', v_amount_usd_cents,
        'stripe_price_id', v_price_id,
        'pack_sku', v_pack.sku
      ) || v_metadata
    )
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id::uuid INTO v_ledger_id;

    IF v_ledger_id IS NULL THEN
      SELECT id
      INTO v_ledger_id
      FROM public.ledger_entries
      WHERE idempotency_key = v_idempotency_key
      LIMIT 1;
    END IF;

    IF v_ledger_id IS NULL THEN
      RAISE EXCEPTION 'failed to finalize purchase for payment intent % (ledger conflict)', p_payment_intent_id;
    END IF;

    UPDATE public.coin_purchases
    SET ledger_entry_id = v_ledger_id,
        confirmed_at = v_now,
        status = 'confirmed'
    WHERE id = v_purchase_id;

  ELSE
    v_ledger_id := v_existing_ledger_id;
  END IF;

  RETURN jsonb_build_object(
    'purchase_id', v_purchase_id,
    'ledger_entry_id', v_ledger_id
  );
END;
$$;

COMMIT;
