CREATE TABLE IF NOT EXISTS public.coin_purchases (
  id bigserial PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform text,
  payment_provider text,
  provider_event_id text,
  provider_payment_id text,
  provider_order_id text,
  coin_amount bigint,
  coins_awarded bigint,
  usd_amount numeric(10,2),
  amount_usd_cents integer,
  stripe_price_id text,
  stripe_charge_id text,
  stripe_balance_txn_id text,
  stripe_fee_cents integer,
  stripe_net_cents integer,
  refunded_cents integer,
  disputed_cents integer,
  dispute_id text,
  dispute_status text,
  ledger_entry_id bigint,
  status text,
  confirmed_at timestamptz,
  refunded_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS provider_order_id text;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS coins_awarded bigint;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS amount_usd_cents integer;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS stripe_price_id text;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS stripe_charge_id text;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS stripe_balance_txn_id text;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS stripe_fee_cents integer;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS stripe_net_cents integer;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS refunded_cents integer;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS disputed_cents integer;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS dispute_id text;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS dispute_status text;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS ledger_entry_id bigint;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS provider_payment_id text;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS provider_event_id text;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS payment_provider text;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS coin_amount bigint;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS usd_amount numeric(10,2);
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS created_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coin_purchases'
      AND column_name = 'payment_intent_id'
  ) THEN
    EXECUTE 'UPDATE public.coin_purchases SET provider_payment_id = payment_intent_id WHERE provider_payment_id IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coin_purchases'
      AND column_name = 'stripe_payment_intent_id'
  ) THEN
    EXECUTE 'UPDATE public.coin_purchases SET provider_payment_id = stripe_payment_intent_id WHERE provider_payment_id IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coin_purchases'
      AND column_name = 'provider_ref'
  ) THEN
    EXECUTE 'UPDATE public.coin_purchases SET provider_payment_id = provider_ref WHERE provider_payment_id IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coin_purchases'
      AND column_name = 'session_id'
  ) THEN
    EXECUTE 'UPDATE public.coin_purchases SET provider_payment_id = session_id WHERE provider_payment_id IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coin_purchases'
      AND column_name = 'stripe_session_id'
  ) THEN
    EXECUTE 'UPDATE public.coin_purchases SET provider_payment_id = stripe_session_id WHERE provider_payment_id IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coin_purchases'
      AND column_name = 'created_at'
      AND is_nullable = 'YES'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.coin_purchases
    WHERE created_at IS NULL
    LIMIT 1
  ) THEN
    EXECUTE 'ALTER TABLE public.coin_purchases ALTER COLUMN created_at SET DEFAULT now()';
  END IF;
END $$;

ALTER TABLE public.coin_purchases ADD COLUMN IF NOT EXISTS profile_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coin_purchases'
      AND column_name = 'user_id'
  ) THEN
    EXECUTE 'UPDATE public.coin_purchases SET profile_id = user_id WHERE profile_id IS NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coin_purchases_profile_id_fkey'
      AND conrelid = 'public.coin_purchases'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.coin_purchases ADD CONSTRAINT coin_purchases_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coin_purchases'
      AND column_name = 'profile_id'
      AND is_nullable = 'YES'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.coin_purchases
    WHERE profile_id IS NULL
    LIMIT 1
  ) THEN
    EXECUTE 'ALTER TABLE public.coin_purchases ALTER COLUMN profile_id SET NOT NULL';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_coin_purchases_provider_order_id ON public.coin_purchases(provider_order_id) WHERE provider_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coin_purchases_created_at ON public.coin_purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_purchases_profile_created ON public.coin_purchases(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_purchases_provider_payment_id ON public.coin_purchases(provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coin_purchases_stripe_charge_id ON public.coin_purchases(stripe_charge_id) WHERE stripe_charge_id IS NOT NULL;

CREATE OR REPLACE VIEW public.v_coin_purchases_normalized AS
SELECT
  cp.id,
  cp.profile_id,
  COALESCE(cp.platform, 'web') AS platform,
  COALESCE(cp.payment_provider, 'stripe') AS payment_provider,
  cp.provider_event_id,
  cp.provider_payment_id,
  cp.provider_order_id,
  COALESCE(cp.coins_awarded, cp.coin_amount, 0) AS coins_awarded,
  COALESCE(cp.amount_usd_cents, (cp.usd_amount * 100)::bigint, 0)::bigint AS amount_usd_cents,
  cp.stripe_price_id,
  cp.stripe_charge_id,
  cp.stripe_balance_txn_id,
  COALESCE(cp.stripe_fee_cents, 0)::bigint AS stripe_fee_cents,
  COALESCE(cp.stripe_net_cents, (COALESCE(cp.amount_usd_cents, (cp.usd_amount * 100)::bigint, 0) - COALESCE(cp.stripe_fee_cents, 0)))::bigint AS stripe_net_cents,
  COALESCE(cp.refunded_cents, 0)::bigint AS refunded_cents,
  COALESCE(cp.disputed_cents, 0)::bigint AS disputed_cents,
  cp.dispute_id,
  cp.dispute_status,
  cp.ledger_entry_id,
  COALESCE(cp.confirmed_at, cp.created_at) AS succeeded_at,
  cp.refunded_at,
  CASE
    WHEN cp.status IN ('refunded') THEN 'refunded'
    WHEN cp.status IN ('chargeback', 'disputed') THEN 'disputed'
    WHEN cp.status IN ('confirmed', 'succeeded') THEN 'succeeded'
    WHEN cp.status IS NULL THEN 'succeeded'
    ELSE cp.status
  END AS status_normalized
FROM public.coin_purchases cp;

DROP FUNCTION IF EXISTS public.finalize_coin_purchase(text, uuid, bigint, integer, text);
DROP FUNCTION IF EXISTS public.finalize_coin_purchase(varchar, uuid, bigint, integer, varchar);
DROP FUNCTION IF EXISTS public.finalize_coin_purchase(character varying, uuid, bigint, integer, character varying);

CREATE OR REPLACE FUNCTION public.finalize_coin_purchase(
  p_idempotency_key varchar,
  p_user_id uuid,
  p_coins_amount bigint,
  p_amount_usd_cents integer,
  p_provider_ref varchar
)
RETURNS bigint AS $$
DECLARE
  v_ledger_id bigint;
  v_purchase_id bigint;
  v_has_user_id boolean;
  v_has_profile_id boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coin_purchases'
      AND column_name = 'user_id'
  ) INTO v_has_user_id;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coin_purchases'
      AND column_name = 'profile_id'
  ) INTO v_has_profile_id;

  SELECT id INTO v_ledger_id
  FROM public.ledger_entries
  WHERE idempotency_key = p_idempotency_key;

  IF v_ledger_id IS NOT NULL THEN
    UPDATE public.coin_purchases
    SET
      coins_awarded = COALESCE(public.coin_purchases.coins_awarded, p_coins_amount),
      amount_usd_cents = COALESCE(public.coin_purchases.amount_usd_cents, p_amount_usd_cents),
      ledger_entry_id = COALESCE(public.coin_purchases.ledger_entry_id, v_ledger_id)
    WHERE public.coin_purchases.provider_payment_id = p_provider_ref
       OR public.coin_purchases.provider_order_id = p_provider_ref
       OR public.coin_purchases.ledger_entry_id = v_ledger_id;

    RETURN v_ledger_id;
  END IF;

  INSERT INTO public.ledger_entries (
    idempotency_key,
    user_id,
    entry_type,
    delta_coins,
    amount_usd_cents,
    provider_ref,
    metadata
  )
  VALUES (
    p_idempotency_key,
    p_user_id,
    'coin_purchase',
    p_coins_amount,
    p_amount_usd_cents,
    p_provider_ref,
    jsonb_build_object(
      'provider', 'stripe',
      'provider_event_id', p_idempotency_key
    )
  )
  RETURNING id INTO v_ledger_id;

  UPDATE public.profiles
  SET
    coin_balance = coin_balance + p_coins_amount,
    lifetime_coins_purchased = COALESCE(lifetime_coins_purchased, 0) + p_coins_amount,
    total_purchased = COALESCE(total_purchased, 0) + p_coins_amount,
    last_transaction_at = now()
  WHERE id = p_user_id;

  BEGIN
    IF v_has_user_id THEN
      EXECUTE $SQL$
        INSERT INTO public.coin_purchases (
          user_id,
          platform,
          payment_provider,
          provider_event_id,
          provider_payment_id,
          provider_order_id,
          coin_amount,
          coins_awarded,
          usd_amount,
          amount_usd_cents,
          stripe_price_id,
          stripe_charge_id,
          stripe_balance_txn_id,
          stripe_fee_cents,
          stripe_net_cents,
          ledger_entry_id,
          status,
          confirmed_at,
          metadata
        )
        VALUES (
          $1,
          'web',
          'stripe',
          $2,
          $3,
          $4,
          $5,
          $6,
          ($7::numeric / 100.0),
          $7,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL,
          $8,
          'confirmed',
          now(),
          jsonb_build_object(
            'idempotency_key', $2,
            'provider_ref', $3
          )
        )
        RETURNING id
      $SQL$
      INTO v_purchase_id
      USING p_user_id, p_idempotency_key, p_provider_ref, p_provider_ref, p_coins_amount, p_coins_amount, p_amount_usd_cents, v_ledger_id;
    ELSIF v_has_profile_id THEN
      EXECUTE $SQL$
        INSERT INTO public.coin_purchases (
          profile_id,
          platform,
          payment_provider,
          provider_event_id,
          provider_payment_id,
          provider_order_id,
          coin_amount,
          coins_awarded,
          usd_amount,
          amount_usd_cents,
          stripe_price_id,
          stripe_charge_id,
          stripe_balance_txn_id,
          stripe_fee_cents,
          stripe_net_cents,
          ledger_entry_id,
          status,
          confirmed_at,
          metadata
        )
        VALUES (
          $1,
          'web',
          'stripe',
          $2,
          $3,
          $4,
          $5,
          $6,
          ($7::numeric / 100.0),
          $7,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL,
          $8,
          'confirmed',
          now(),
          jsonb_build_object(
            'idempotency_key', $2,
            'provider_ref', $3
          )
        )
        RETURNING id
      $SQL$
      INTO v_purchase_id
      USING p_user_id, p_idempotency_key, p_provider_ref, p_provider_ref, p_coins_amount, p_coins_amount, p_amount_usd_cents, v_ledger_id;
    END IF;
  EXCEPTION
    WHEN unique_violation THEN
      UPDATE public.coin_purchases
      SET
        coins_awarded = COALESCE(public.coin_purchases.coins_awarded, p_coins_amount),
        amount_usd_cents = COALESCE(public.coin_purchases.amount_usd_cents, p_amount_usd_cents),
        ledger_entry_id = COALESCE(public.coin_purchases.ledger_entry_id, v_ledger_id)
      WHERE public.coin_purchases.provider_payment_id = p_provider_ref
         OR public.coin_purchases.provider_order_id = p_provider_ref;
    WHEN not_null_violation THEN
      NULL;
    WHEN undefined_column THEN
      NULL;
  END;

  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET row_security = off;

CREATE OR REPLACE FUNCTION public.admin_get_monetization_overview(
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE(
  gross_revenue_cents bigint,
  stripe_fees_cents bigint,
  refunds_cents bigint,
  disputes_cents bigint,
  net_revenue_cents bigint,
  charges_count bigint,
  refunds_count bigint,
  disputes_count bigint,
  coins_purchased bigint,
  coins_spent bigint,
  coins_in_circulation bigint,
  diamonds_minted bigint,
  diamonds_cashed_out bigint,
  diamonds_outstanding bigint
) AS $$
BEGIN
  IF NOT (public.is_owner(auth.uid()) OR public.is_app_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH purchases AS (
    SELECT *
    FROM public.v_coin_purchases_normalized
    WHERE succeeded_at >= p_start
      AND succeeded_at < p_end
  ),
  sums AS (
    SELECT
      COALESCE(SUM(CASE WHEN status_normalized = 'succeeded' THEN amount_usd_cents ELSE 0 END), 0)::bigint AS gross_revenue_cents,
      COALESCE(SUM(CASE WHEN status_normalized = 'succeeded' THEN stripe_fee_cents ELSE 0 END), 0)::bigint AS stripe_fees_cents,
      COALESCE(SUM(CASE WHEN status_normalized IN ('refunded') THEN refunded_cents ELSE 0 END), 0)::bigint AS refunds_cents,
      COALESCE(SUM(CASE WHEN status_normalized IN ('disputed') THEN disputed_cents ELSE 0 END), 0)::bigint AS disputes_cents,
      COALESCE(COUNT(*) FILTER (WHERE status_normalized = 'succeeded'), 0)::bigint AS charges_count,
      COALESCE(COUNT(*) FILTER (WHERE status_normalized = 'refunded'), 0)::bigint AS refunds_count,
      COALESCE(COUNT(*) FILTER (WHERE status_normalized = 'disputed'), 0)::bigint AS disputes_count
    FROM purchases
  ),
  coin_window AS (
    SELECT
      COALESCE(SUM(CASE WHEN le.entry_type = 'coin_purchase' THEN le.delta_coins ELSE 0 END), 0)::bigint AS coins_purchased,
      COALESCE(SUM(CASE WHEN le.entry_type = 'coin_spend_gift' THEN -le.delta_coins ELSE 0 END), 0)::bigint AS coins_spent
    FROM public.ledger_entries le
    WHERE le.created_at >= p_start
      AND le.created_at < p_end
  ),
  coin_all AS (
    SELECT COALESCE(SUM(le.delta_coins), 0)::bigint AS coins_in_circulation
    FROM public.ledger_entries le
  ),
  diamond_window AS (
    SELECT
      COALESCE(SUM(CASE WHEN le.entry_type = 'diamond_earn' THEN le.delta_diamonds ELSE 0 END), 0)::bigint AS diamonds_minted,
      COALESCE(SUM(CASE WHEN le.entry_type = 'diamond_debit_cashout' THEN -le.delta_diamonds ELSE 0 END), 0)::bigint AS diamonds_cashed_out
    FROM public.ledger_entries le
    WHERE le.created_at >= p_start
      AND le.created_at < p_end
  ),
  diamond_all AS (
    SELECT COALESCE(SUM(le.delta_diamonds), 0)::bigint AS diamonds_outstanding
    FROM public.ledger_entries le
  )
  SELECT
    sums.gross_revenue_cents,
    sums.stripe_fees_cents,
    sums.refunds_cents,
    sums.disputes_cents,
    (sums.gross_revenue_cents - sums.stripe_fees_cents - sums.refunds_cents - sums.disputes_cents)::bigint AS net_revenue_cents,
    sums.charges_count,
    sums.refunds_count,
    sums.disputes_count,
    coin_window.coins_purchased,
    coin_window.coins_spent,
    coin_all.coins_in_circulation,
    diamond_window.diamonds_minted,
    diamond_window.diamonds_cashed_out,
    diamond_all.diamonds_outstanding
  FROM sums, coin_window, coin_all, diamond_window, diamond_all;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET row_security = off;

CREATE OR REPLACE FUNCTION public.admin_get_top_buyers(
  p_start timestamptz,
  p_end timestamptz,
  p_limit int DEFAULT 50
)
RETURNS TABLE(
  profile_id uuid,
  username text,
  gross_revenue_cents bigint,
  charges_count bigint,
  coins_awarded bigint
) AS $$
BEGIN
  IF NOT (public.is_owner(auth.uid()) OR public.is_app_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    COALESCE(SUM(v.amount_usd_cents), 0)::bigint AS gross_revenue_cents,
    COUNT(*)::bigint AS charges_count,
    COALESCE(SUM(v.coins_awarded), 0)::bigint AS coins_awarded
  FROM public.v_coin_purchases_normalized v
  JOIN public.profiles p ON p.id = v.profile_id
  WHERE v.succeeded_at >= p_start
    AND v.succeeded_at < p_end
    AND v.status_normalized = 'succeeded'
  GROUP BY p.id, p.username
  ORDER BY gross_revenue_cents DESC
  LIMIT GREATEST(1, LEAST(p_limit, 200));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET row_security = off;

CREATE OR REPLACE FUNCTION public.admin_get_top_earners(
  p_start timestamptz,
  p_end timestamptz,
  p_limit int DEFAULT 50
)
RETURNS TABLE(
  profile_id uuid,
  username text,
  diamonds_earned bigint
) AS $$
BEGIN
  IF NOT (public.is_owner(auth.uid()) OR public.is_app_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    COALESCE(SUM(le.delta_diamonds), 0)::bigint AS diamonds_earned
  FROM public.ledger_entries le
  JOIN public.profiles p ON p.id = le.user_id
  WHERE le.entry_type = 'diamond_earn'
    AND le.created_at >= p_start
    AND le.created_at < p_end
  GROUP BY p.id, p.username
  ORDER BY diamonds_earned DESC
  LIMIT GREATEST(1, LEAST(p_limit, 200));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET row_security = off;

CREATE OR REPLACE FUNCTION public.admin_get_revenue_timeseries(
  p_start timestamptz,
  p_end timestamptz,
  p_bucket text DEFAULT 'day'
)
RETURNS TABLE(
  bucket_start timestamptz,
  gross_revenue_cents bigint,
  stripe_fees_cents bigint,
  refunds_cents bigint,
  disputes_cents bigint,
  net_revenue_cents bigint,
  charges_count bigint
) AS $$
DECLARE
  v_bucket text;
BEGIN
  IF NOT (public.is_owner(auth.uid()) OR public.is_app_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_bucket := lower(COALESCE(p_bucket, 'day'));
  IF v_bucket NOT IN ('day', 'week') THEN
    RAISE EXCEPTION 'invalid_bucket';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      date_trunc(v_bucket, v.succeeded_at) AS bucket_start,
      v.status_normalized,
      v.amount_usd_cents,
      v.stripe_fee_cents,
      v.refunded_cents,
      v.disputed_cents
    FROM public.v_coin_purchases_normalized v
    WHERE v.succeeded_at >= p_start
      AND v.succeeded_at < p_end
  ),
  agg AS (
    SELECT
      bucket_start,
      COALESCE(SUM(CASE WHEN status_normalized = 'succeeded' THEN amount_usd_cents ELSE 0 END), 0)::bigint AS gross_revenue_cents,
      COALESCE(SUM(CASE WHEN status_normalized = 'succeeded' THEN stripe_fee_cents ELSE 0 END), 0)::bigint AS stripe_fees_cents,
      COALESCE(SUM(CASE WHEN status_normalized = 'refunded' THEN refunded_cents ELSE 0 END), 0)::bigint AS refunds_cents,
      COALESCE(SUM(CASE WHEN status_normalized = 'disputed' THEN disputed_cents ELSE 0 END), 0)::bigint AS disputes_cents,
      COALESCE(COUNT(*) FILTER (WHERE status_normalized = 'succeeded'), 0)::bigint AS charges_count
    FROM base
    GROUP BY bucket_start
  )
  SELECT
    bucket_start,
    gross_revenue_cents,
    stripe_fees_cents,
    refunds_cents,
    disputes_cents,
    (gross_revenue_cents - stripe_fees_cents - refunds_cents - disputes_cents)::bigint AS net_revenue_cents,
    charges_count
  FROM agg
  ORDER BY bucket_start ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET row_security = off;

CREATE OR REPLACE FUNCTION public.admin_get_coin_flow_timeseries(
  p_start timestamptz,
  p_end timestamptz,
  p_bucket text DEFAULT 'day'
)
RETURNS TABLE(
  bucket_start timestamptz,
  coins_purchased bigint,
  coins_spent bigint,
  net_coins_delta bigint
) AS $$
DECLARE
  v_bucket text;
BEGIN
  IF NOT (public.is_owner(auth.uid()) OR public.is_app_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_bucket := lower(COALESCE(p_bucket, 'day'));
  IF v_bucket NOT IN ('day', 'week') THEN
    RAISE EXCEPTION 'invalid_bucket';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      date_trunc(v_bucket, le.created_at) AS bucket_start,
      le.entry_type,
      le.delta_coins
    FROM public.ledger_entries le
    WHERE le.created_at >= p_start
      AND le.created_at < p_end
  )
  SELECT
    bucket_start,
    COALESCE(SUM(CASE WHEN entry_type = 'coin_purchase' THEN delta_coins ELSE 0 END), 0)::bigint AS coins_purchased,
    COALESCE(SUM(CASE WHEN entry_type = 'coin_spend_gift' THEN -delta_coins ELSE 0 END), 0)::bigint AS coins_spent,
    COALESCE(SUM(delta_coins), 0)::bigint AS net_coins_delta
  FROM base
  GROUP BY bucket_start
  ORDER BY bucket_start ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET row_security = off;

CREATE OR REPLACE FUNCTION public.admin_reconcile_purchases(
  p_start timestamptz,
  p_end timestamptz
)
RETURNS jsonb AS $$
DECLARE
  v_missing_credits jsonb;
  v_orphan_credits jsonb;
BEGIN
  IF NOT (public.is_owner(auth.uid()) OR public.is_app_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_missing_credits := (
    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    FROM (
      SELECT
        v.id,
        v.profile_id,
        v.provider_payment_id,
        v.provider_order_id,
        v.amount_usd_cents,
        v.coins_awarded,
        v.succeeded_at
      FROM public.v_coin_purchases_normalized v
      WHERE v.succeeded_at >= p_start
        AND v.succeeded_at < p_end
        AND v.status_normalized = 'succeeded'
        AND (v.ledger_entry_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.ledger_entries le WHERE le.id = v.ledger_entry_id))
      ORDER BY v.succeeded_at DESC
      LIMIT 500
    ) t
  );

  v_orphan_credits := (
    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    FROM (
      SELECT
        le.id,
        le.user_id,
        le.delta_coins,
        le.amount_usd_cents,
        le.provider_ref,
        le.created_at
      FROM public.ledger_entries le
      WHERE le.entry_type = 'coin_purchase'
        AND le.created_at >= p_start
        AND le.created_at < p_end
        AND NOT EXISTS (
          SELECT 1
          FROM public.v_coin_purchases_normalized v
          WHERE v.provider_payment_id = le.provider_ref
             OR v.provider_order_id = le.provider_ref
             OR v.ledger_entry_id = le.id
        )
      ORDER BY le.created_at DESC
      LIMIT 500
    ) t
  );

  RETURN jsonb_build_object(
    'missing_credits', v_missing_credits,
    'orphan_credits', v_orphan_credits
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET row_security = off;

CREATE OR REPLACE FUNCTION public.admin_get_coin_circulation_at(
  p_at timestamptz
)
RETURNS bigint AS $$
DECLARE
  v_coins bigint;
BEGIN
  IF NOT (public.is_owner(auth.uid()) OR public.is_app_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(SUM(le.delta_coins), 0)::bigint
  INTO v_coins
  FROM public.ledger_entries le
  WHERE le.created_at < p_at;

  RETURN v_coins;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET row_security = off;

GRANT EXECUTE ON FUNCTION public.admin_get_monetization_overview(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_top_buyers(timestamptz, timestamptz, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_top_earners(timestamptz, timestamptz, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_revenue_timeseries(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_coin_flow_timeseries(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_coin_circulation_at(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reconcile_purchases(timestamptz, timestamptz) TO authenticated;

ALTER TABLE public.coin_purchases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coin_purchases' AND policyname = 'Users can view own coin purchases'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view own coin purchases" ON public.coin_purchases FOR SELECT USING (auth.uid() = profile_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coin_purchases' AND policyname = 'Deny direct inserts - use RPC only'
  ) THEN
    EXECUTE 'CREATE POLICY "Deny direct inserts - use RPC only" ON public.coin_purchases FOR INSERT WITH CHECK (false)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coin_purchases' AND policyname = 'Deny direct updates'
  ) THEN
    EXECUTE 'CREATE POLICY "Deny direct updates" ON public.coin_purchases FOR UPDATE USING (false)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coin_purchases' AND policyname = 'Deny direct deletes'
  ) THEN
    EXECUTE 'CREATE POLICY "Deny direct deletes" ON public.coin_purchases FOR DELETE USING (false)';
  END IF;
END $$;
