BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS public.referral_codes (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  code citext NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'referral_codes'
      AND c.conname = 'referral_codes_code_unique'
  ) THEN
    ALTER TABLE public.referral_codes
      ADD CONSTRAINT referral_codes_code_unique UNIQUE (code);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_referral_codes_code_lower
  ON public.referral_codes (lower(code));

CREATE OR REPLACE FUNCTION public.set_referral_codes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_codes_updated_at ON public.referral_codes;
CREATE TRIGGER trg_referral_codes_updated_at
BEFORE UPDATE ON public.referral_codes
FOR EACH ROW
EXECUTE FUNCTION public.set_referral_codes_updated_at();

CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  referrer_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  device_id text,
  ip_hash text,
  user_agent text,
  landing_path text,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  clicked_day date GENERATED ALWAYS AS ((clicked_at AT TIME ZONE 'utc')::date) STORED
);

CREATE INDEX IF NOT EXISTS idx_referral_clicks_referrer_clicked_at_desc
  ON public.referral_clicks (referrer_profile_id, clicked_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_clicks_code_clicked_at_desc
  ON public.referral_clicks (lower(referral_code), clicked_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_referral_clicks_device_day_code
  ON public.referral_clicks (device_id, clicked_day, lower(referral_code))
  WHERE device_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_referral_click_referrer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer uuid;
BEGIN
  IF NEW.referrer_profile_id IS NULL THEN
    SELECT rc.profile_id
    INTO v_referrer
    FROM public.referral_codes rc
    WHERE lower(rc.code) = lower(NEW.referral_code)
    LIMIT 1;

    IF v_referrer IS NOT NULL THEN
      NEW.referrer_profile_id := v_referrer;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_click_referrer ON public.referral_clicks;
CREATE TRIGGER trg_referral_click_referrer
BEFORE INSERT ON public.referral_clicks
FOR EACH ROW
EXECUTE FUNCTION public.set_referral_click_referrer();

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code_used text NOT NULL,
  click_id uuid REFERENCES public.referral_clicks(id) ON DELETE SET NULL,
  claimed_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'referrals'
      AND c.conname = 'referrals_referred_profile_id_unique'
  ) THEN
    ALTER TABLE public.referrals
      ADD CONSTRAINT referrals_referred_profile_id_unique UNIQUE (referred_profile_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'referrals'
      AND c.conname = 'referrals_no_self_referral'
  ) THEN
    ALTER TABLE public.referrals
      ADD CONSTRAINT referrals_no_self_referral CHECK (referrer_profile_id <> referred_profile_id);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_claimed_at_desc
  ON public.referrals (referrer_profile_id, claimed_at DESC);

CREATE INDEX IF NOT EXISTS idx_referrals_referred_claimed_at_desc
  ON public.referrals (referred_profile_id, claimed_at DESC);

CREATE TABLE IF NOT EXISTS public.referral_activity (
  id bigserial PRIMARY KEY,
  referrer_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  referred_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'referral_activity'
      AND c.conname = 'referral_activity_event_type_check'
  ) THEN
    ALTER TABLE public.referral_activity
      ADD CONSTRAINT referral_activity_event_type_check CHECK (
        char_length(event_type) BETWEEN 1 AND 64
        AND event_type ~ '^[a-z0-9_]+$'
      );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_referral_activity_referred_created_at_desc
  ON public.referral_activity (referred_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_activity_referrer_created_at_desc
  ON public.referral_activity (referrer_profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.referral_rollups (
  referrer_profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  click_count bigint NOT NULL DEFAULT 0,
  referral_count bigint NOT NULL DEFAULT 0,
  activation_count bigint NOT NULL DEFAULT 0,
  last_click_at timestamptz,
  last_referral_at timestamptz,
  last_activity_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_rollups_referral_count_desc
  ON public.referral_rollups (referral_count DESC, referrer_profile_id);

CREATE INDEX IF NOT EXISTS idx_referral_rollups_activation_count_desc
  ON public.referral_rollups (activation_count DESC, referrer_profile_id);

-- Referral attribution model: FIRST CLICK WINS per (device_id, day, referral_code).

CREATE OR REPLACE FUNCTION public.bump_referral_rollup(
  p_referrer_profile_id uuid,
  p_click_delta bigint DEFAULT 0,
  p_referral_delta bigint DEFAULT 0,
  p_activation_delta bigint DEFAULT 0,
  p_last_click_at timestamptz DEFAULT NULL,
  p_last_referral_at timestamptz DEFAULT NULL,
  p_last_activity_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_referrer_profile_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.referral_rollups(
    referrer_profile_id,
    click_count,
    referral_count,
    activation_count,
    last_click_at,
    last_referral_at,
    last_activity_at,
    updated_at
  )
  VALUES (
    p_referrer_profile_id,
    GREATEST(COALESCE(p_click_delta, 0), 0),
    GREATEST(COALESCE(p_referral_delta, 0), 0),
    GREATEST(COALESCE(p_activation_delta, 0), 0),
    p_last_click_at,
    p_last_referral_at,
    p_last_activity_at,
    now()
  )
  ON CONFLICT (referrer_profile_id)
  DO UPDATE SET
    click_count = public.referral_rollups.click_count + GREATEST(COALESCE(p_click_delta, 0), 0),
    referral_count = public.referral_rollups.referral_count + GREATEST(COALESCE(p_referral_delta, 0), 0),
    activation_count = public.referral_rollups.activation_count + GREATEST(COALESCE(p_activation_delta, 0), 0),
    last_click_at = COALESCE(GREATEST(public.referral_rollups.last_click_at, p_last_click_at), public.referral_rollups.last_click_at, p_last_click_at),
    last_referral_at = COALESCE(GREATEST(public.referral_rollups.last_referral_at, p_last_referral_at), public.referral_rollups.last_referral_at, p_last_referral_at),
    last_activity_at = COALESCE(GREATEST(public.referral_rollups.last_activity_at, p_last_activity_at), public.referral_rollups.last_activity_at, p_last_activity_at),
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.on_referral_click_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.bump_referral_rollup(
    NEW.referrer_profile_id,
    1,
    0,
    0,
    NEW.clicked_at,
    NULL,
    NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_click_rollup ON public.referral_clicks;
CREATE TRIGGER trg_referral_click_rollup
AFTER INSERT ON public.referral_clicks
FOR EACH ROW
EXECUTE FUNCTION public.on_referral_click_insert();

CREATE OR REPLACE FUNCTION public.generate_referral_code(p_length int DEFAULT 8)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_out text := '';
  v_i int;
  v_idx int;
BEGIN
  IF p_length IS NULL OR p_length < 6 OR p_length > 16 THEN
    p_length := 8;
  END IF;

  v_bytes := gen_random_bytes(p_length);

  FOR v_i IN 0..(p_length - 1) LOOP
    v_idx := (get_byte(v_bytes, v_i) % length(v_alphabet)) + 1;
    v_out := v_out || substr(v_alphabet, v_idx, 1);
  END LOOP;

  RETURN v_out;
END;
$$;

DROP FUNCTION IF EXISTS public.get_or_create_referral_code();
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS TABLE (
  code text,
  url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_profile_id uuid;
  v_code text;
  v_base_url text := 'https://mylivelinks.com/signup?ref=';
BEGIN
  v_profile_id := auth.uid();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT rc.code::text
  INTO v_code
  FROM public.referral_codes rc
  WHERE rc.profile_id = v_profile_id;

  IF v_code IS NOT NULL THEN
    RETURN QUERY SELECT v_code, v_base_url || v_code;
    RETURN;
  END IF;

  LOOP
    v_code := public.generate_referral_code(8);

    BEGIN
      INSERT INTO public.referral_codes(profile_id, code)
      VALUES (v_profile_id, v_code)
      ON CONFLICT (profile_id) DO NOTHING;

      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- Retry on code collision.
      NULL;
    END;
  END LOOP;

  SELECT rc.code::text
  INTO v_code
  FROM public.referral_codes rc
  WHERE rc.profile_id = v_profile_id;

  RETURN QUERY SELECT v_code, v_base_url || v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_referral_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code() TO authenticated;

DROP FUNCTION IF EXISTS public.claim_referral(text, uuid, text);
CREATE OR REPLACE FUNCTION public.claim_referral(
  p_code text,
  p_click_id uuid DEFAULT NULL,
  p_device_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_referred_id uuid;
  v_referrer_id uuid;
  v_existing_id uuid;
  v_referral_id uuid;
  v_code_norm text;
  v_click_id uuid;
BEGIN
  v_referred_id := auth.uid();
  IF v_referred_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_code_norm := lower(trim(COALESCE(p_code, '')));
  IF v_code_norm = '' THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('claim_referral:' || v_referred_id::text)::bigint);

  SELECT r.id
  INTO v_existing_id
  FROM public.referrals r
  WHERE r.referred_profile_id = v_referred_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  SELECT rc.profile_id
  INTO v_referrer_id
  FROM public.referral_codes rc
  WHERE lower(rc.code) = v_code_norm
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  IF v_referrer_id = v_referred_id THEN
    RAISE EXCEPTION 'self_referral_not_allowed';
  END IF;

  v_click_id := NULL;

  IF p_click_id IS NOT NULL THEN
    SELECT c.id
    INTO v_click_id
    FROM public.referral_clicks c
    WHERE c.id = p_click_id
      AND lower(c.referral_code) = v_code_norm
    LIMIT 1;

    IF v_click_id IS NOT NULL THEN
      UPDATE public.referral_clicks
      SET referrer_profile_id = v_referrer_id
      WHERE id = v_click_id
        AND referrer_profile_id IS NULL;
    END IF;
  ELSIF p_device_id IS NOT NULL AND trim(p_device_id) <> '' THEN
    SELECT c.id
    INTO v_click_id
    FROM public.referral_clicks c
    WHERE c.device_id = p_device_id
      AND lower(c.referral_code) = v_code_norm
    ORDER BY c.clicked_at ASC
    LIMIT 1;
  END IF;

  INSERT INTO public.referrals(referrer_profile_id, referred_profile_id, code_used, click_id)
  VALUES (v_referrer_id, v_referred_id, v_code_norm, v_click_id)
  ON CONFLICT (referred_profile_id)
  DO UPDATE SET referrer_profile_id = public.referrals.referrer_profile_id
  RETURNING id INTO v_referral_id;

  PERFORM public.bump_referral_rollup(v_referrer_id, 0, 1, 0, NULL, now(), NULL);

  RETURN v_referral_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_referral(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_referral(text, uuid, text) TO authenticated;

DROP FUNCTION IF EXISTS public.log_referral_activity(text);
CREATE OR REPLACE FUNCTION public.log_referral_activity(
  p_event_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_referred_id uuid;
  v_referrer_id uuid;
  v_event text;
BEGIN
  v_referred_id := auth.uid();
  IF v_referred_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_event := lower(trim(COALESCE(p_event_type, '')));
  IF v_event = '' THEN
    RETURN;
  END IF;

  SELECT r.referrer_profile_id
  INTO v_referrer_id
  FROM public.referrals r
  WHERE r.referred_profile_id = v_referred_id
  LIMIT 1;

  INSERT INTO public.referral_activity(referrer_profile_id, referred_profile_id, event_type)
  VALUES (v_referrer_id, v_referred_id, v_event);

  PERFORM public.bump_referral_rollup(v_referrer_id, 0, 0, 0, NULL, NULL, now());
END;
$$;

REVOKE ALL ON FUNCTION public.log_referral_activity(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_referral_activity(text) TO authenticated;

DROP FUNCTION IF EXISTS public.recompute_referral_rollups(uuid);
CREATE OR REPLACE FUNCTION public.recompute_referral_rollups(
  p_referrer_profile_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_caller uuid;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_referrer_profile_id IS NULL THEN
    IF NOT public.is_app_admin(v_caller) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;

    DELETE FROM public.referral_rollups;

    INSERT INTO public.referral_rollups(referrer_profile_id, click_count, referral_count, activation_count, last_click_at, last_referral_at, last_activity_at, updated_at)
    SELECT
      x.referrer_profile_id,
      COALESCE(x.click_count, 0),
      COALESCE(x.referral_count, 0),
      COALESCE(x.activation_count, 0),
      x.last_click_at,
      x.last_referral_at,
      x.last_activity_at,
      now()
    FROM (
      SELECT
        base.referrer_profile_id,
        (SELECT COUNT(*) FROM public.referral_clicks c WHERE c.referrer_profile_id = base.referrer_profile_id) AS click_count,
        (SELECT COUNT(*) FROM public.referrals rr WHERE rr.referrer_profile_id = base.referrer_profile_id) AS referral_count,
        (SELECT COUNT(*) FROM public.referral_activity a3 WHERE a3.referrer_profile_id = base.referrer_profile_id AND a3.event_type = 'activated') AS activation_count,
        (SELECT MAX(clicked_at) FROM public.referral_clicks c2 WHERE c2.referrer_profile_id = base.referrer_profile_id) AS last_click_at,
        (SELECT MAX(claimed_at) FROM public.referrals rr2 WHERE rr2.referrer_profile_id = base.referrer_profile_id) AS last_referral_at,
        (SELECT MAX(created_at) FROM public.referral_activity a2 WHERE a2.referrer_profile_id = base.referrer_profile_id) AS last_activity_at
      FROM (
        SELECT r.referrer_profile_id
        FROM public.referrals r
        GROUP BY r.referrer_profile_id
        UNION
        SELECT c.referrer_profile_id
        FROM public.referral_clicks c
        WHERE c.referrer_profile_id IS NOT NULL
        GROUP BY c.referrer_profile_id
      ) base
    ) x;

    RETURN;
  END IF;

  IF p_referrer_profile_id <> v_caller AND NOT public.is_app_admin(v_caller) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.referral_rollups WHERE referrer_profile_id = p_referrer_profile_id;

  INSERT INTO public.referral_rollups(referrer_profile_id, click_count, referral_count, activation_count, last_click_at, last_referral_at, last_activity_at, updated_at)
  SELECT
    p_referrer_profile_id,
    (SELECT COUNT(*) FROM public.referral_clicks c WHERE c.referrer_profile_id = p_referrer_profile_id) AS click_count,
    (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_profile_id = p_referrer_profile_id) AS referral_count,
    (SELECT COUNT(*) FROM public.referral_activity a3 WHERE a3.referrer_profile_id = p_referrer_profile_id AND a3.event_type = 'activated') AS activation_count,
    (SELECT MAX(clicked_at) FROM public.referral_clicks c2 WHERE c2.referrer_profile_id = p_referrer_profile_id) AS last_click_at,
    (SELECT MAX(claimed_at) FROM public.referrals r2 WHERE r2.referrer_profile_id = p_referrer_profile_id) AS last_referral_at,
    (SELECT MAX(created_at) FROM public.referral_activity a2 WHERE a2.referrer_profile_id = p_referrer_profile_id) AS last_activity_at,
    now();
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_referral_rollups(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_referral_rollups(uuid) TO authenticated;

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rollups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Referral codes are readable by owner" ON public.referral_codes;
CREATE POLICY "Referral codes are readable by owner"
  ON public.referral_codes
  FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Referral codes are insertable by owner" ON public.referral_codes;
CREATE POLICY "Referral codes are insertable by owner"
  ON public.referral_codes
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Referral codes are updatable by owner" ON public.referral_codes;
CREATE POLICY "Referral codes are updatable by owner"
  ON public.referral_codes
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Referrals are viewable by participants" ON public.referrals;
CREATE POLICY "Referrals are viewable by participants"
  ON public.referrals
  FOR SELECT
  USING (auth.uid() = referrer_profile_id OR auth.uid() = referred_profile_id);

DROP POLICY IF EXISTS "Referral activity is viewable by referred user" ON public.referral_activity;
CREATE POLICY "Referral activity is viewable by referred user"
  ON public.referral_activity
  FOR SELECT
  USING (auth.uid() = referred_profile_id);

DROP POLICY IF EXISTS "Referral rollups are viewable" ON public.referral_rollups;
CREATE POLICY "Referral rollups are viewable"
  ON public.referral_rollups
  FOR SELECT
  USING (auth.uid() = referrer_profile_id OR public.is_app_admin(auth.uid()));

DROP POLICY IF EXISTS "Referral clicks are insertable by service role" ON public.referral_clicks;
CREATE POLICY "Referral clicks are insertable by service role"
  ON public.referral_clicks
  FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMIT;


-- ============================================================================
-- PART 2: REFERRAL ACTIVATION
-- ============================================================================

BEGIN;

-- Activation v1: 7-day window + idempotent events + DB triggers.
-- Contract stability:
-- - get_or_create_referral_code()
-- - claim_referral(code, click_id?, device_id?)
-- - log_referral_activity(event_type)
-- - recompute_referral_rollups(referrer_profile_id?)
-- remain callable with the same names.

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_activated_at_desc
  ON public.referrals (referrer_profile_id, activated_at DESC);

-- Idempotency for activity events: only one per (referred_profile_id, event_type)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_referral_activity_referred_event_type
  ON public.referral_activity (referred_profile_id, event_type);

DROP FUNCTION IF EXISTS public.log_referral_activity_for_profile(uuid, text, jsonb);
CREATE OR REPLACE FUNCTION public.log_referral_activity_for_profile(
  p_referred_profile_id uuid,
  p_event_type text,
  p_metadata jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_event text;
  v_referrer_id uuid;
  v_claimed_at timestamptz;
  v_rowcount int;
  v_inserted boolean := false;
  v_activation_event boolean := false;
BEGIN
  IF p_referred_profile_id IS NULL THEN
    RETURN false;
  END IF;

  v_event := lower(trim(COALESCE(p_event_type, '')));
  IF v_event = '' THEN
    RETURN false;
  END IF;

  SELECT r.referrer_profile_id, r.claimed_at
  INTO v_referrer_id, v_claimed_at
  FROM public.referrals r
  WHERE r.referred_profile_id = p_referred_profile_id
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.referral_activity(referrer_profile_id, referred_profile_id, event_type, metadata)
  VALUES (v_referrer_id, p_referred_profile_id, v_event, p_metadata)
  ON CONFLICT (referred_profile_id, event_type) DO NOTHING;

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  v_inserted := (v_rowcount = 1);

  IF v_inserted THEN
    PERFORM public.bump_referral_rollup(v_referrer_id, 0, 0, 0, NULL, NULL, now());
  END IF;

  v_activation_event := (v_event IN ('profile_completed', 'first_post_created'));

  IF v_activation_event AND v_claimed_at IS NOT NULL THEN
    UPDATE public.referrals r
    SET activated_at = COALESCE(r.activated_at, now())
    WHERE r.referred_profile_id = p_referred_profile_id
      AND r.activated_at IS NULL
      AND now() <= r.claimed_at + interval '7 days';

    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    IF v_rowcount = 1 THEN
      INSERT INTO public.referral_activity(referrer_profile_id, referred_profile_id, event_type)
      VALUES (v_referrer_id, p_referred_profile_id, 'activated')
      ON CONFLICT (referred_profile_id, event_type) DO NOTHING;

      PERFORM public.bump_referral_rollup(v_referrer_id, 0, 0, 1, NULL, NULL, now());
    END IF;
  END IF;

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.log_referral_activity_for_profile(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_referral_activity_for_profile(uuid, text, jsonb) TO authenticated;

-- Keep contract: log_referral_activity(event_type)
-- Override implementation to delegate to activation-aware helper.
DROP FUNCTION IF EXISTS public.log_referral_activity(text);
CREATE OR REPLACE FUNCTION public.log_referral_activity(
  p_event_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_referred_id uuid;
BEGIN
  v_referred_id := auth.uid();
  IF v_referred_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  PERFORM public.log_referral_activity_for_profile(v_referred_id, p_event_type, NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.log_referral_activity(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_referral_activity(text) TO authenticated;

-- Keep contract: recompute_referral_rollups(referrer_profile_id?)
-- Override activation_count to be derived from referrals.activated_at.
DROP FUNCTION IF EXISTS public.recompute_referral_rollups(uuid);
CREATE OR REPLACE FUNCTION public.recompute_referral_rollups(
  p_referrer_profile_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_caller uuid;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_referrer_profile_id IS NULL THEN
    IF NOT public.is_app_admin(v_caller) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;

    DELETE FROM public.referral_rollups;

    INSERT INTO public.referral_rollups(referrer_profile_id, click_count, referral_count, activation_count, last_click_at, last_referral_at, last_activity_at, updated_at)
    SELECT
      x.referrer_profile_id,
      COALESCE(x.click_count, 0),
      COALESCE(x.referral_count, 0),
      COALESCE(x.activation_count, 0),
      x.last_click_at,
      x.last_referral_at,
      x.last_activity_at,
      now()
    FROM (
      SELECT
        base.referrer_profile_id,
        (SELECT COUNT(*) FROM public.referral_clicks c WHERE c.referrer_profile_id = base.referrer_profile_id) AS click_count,
        (SELECT COUNT(*) FROM public.referrals rr WHERE rr.referrer_profile_id = base.referrer_profile_id) AS referral_count,
        (SELECT COUNT(*) FROM public.referrals rr WHERE rr.referrer_profile_id = base.referrer_profile_id AND rr.activated_at IS NOT NULL) AS activation_count,
        (SELECT MAX(clicked_at) FROM public.referral_clicks c2 WHERE c2.referrer_profile_id = base.referrer_profile_id) AS last_click_at,
        (SELECT MAX(claimed_at) FROM public.referrals rr2 WHERE rr2.referrer_profile_id = base.referrer_profile_id) AS last_referral_at,
        (SELECT MAX(created_at) FROM public.referral_activity a2 WHERE a2.referrer_profile_id = base.referrer_profile_id) AS last_activity_at
      FROM (
        SELECT r.referrer_profile_id
        FROM public.referrals r
        GROUP BY r.referrer_profile_id
        UNION
        SELECT c.referrer_profile_id
        FROM public.referral_clicks c
        WHERE c.referrer_profile_id IS NOT NULL
        GROUP BY c.referrer_profile_id
      ) base
    ) x;

    RETURN;
  END IF;

  IF p_referrer_profile_id <> v_caller AND NOT public.is_app_admin(v_caller) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.referral_rollups WHERE referrer_profile_id = p_referrer_profile_id;

  INSERT INTO public.referral_rollups(referrer_profile_id, click_count, referral_count, activation_count, last_click_at, last_referral_at, last_activity_at, updated_at)
  SELECT
    p_referrer_profile_id,
    (SELECT COUNT(*) FROM public.referral_clicks c WHERE c.referrer_profile_id = p_referrer_profile_id) AS click_count,
    (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_profile_id = p_referrer_profile_id) AS referral_count,
    (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_profile_id = p_referrer_profile_id AND r.activated_at IS NOT NULL) AS activation_count,
    (SELECT MAX(clicked_at) FROM public.referral_clicks c2 WHERE c2.referrer_profile_id = p_referrer_profile_id) AS last_click_at,
    (SELECT MAX(claimed_at) FROM public.referrals r2 WHERE r2.referrer_profile_id = p_referrer_profile_id) AS last_referral_at,
    (SELECT MAX(created_at) FROM public.referral_activity a2 WHERE a2.referrer_profile_id = p_referrer_profile_id) AS last_activity_at,
    now();
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_referral_rollups(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_referral_rollups(uuid) TO authenticated;

-- Helper: determine active + last activity timestamp
DROP FUNCTION IF EXISTS public.is_referred_user_active(uuid);
CREATE OR REPLACE FUNCTION public.is_referred_user_active(
  p_referred_profile_id uuid
)
RETURNS TABLE (
  is_active boolean,
  last_activity_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_caller uuid;
  v_referrer uuid;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT r.referrer_profile_id
  INTO v_referrer
  FROM public.referrals r
  WHERE r.referred_profile_id = p_referred_profile_id
  LIMIT 1;

  IF v_caller <> p_referred_profile_id AND v_caller <> v_referrer AND NOT public.is_app_admin(v_caller) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT
    EXISTS(
      SELECT 1
      FROM public.referrals r
      WHERE r.referred_profile_id = p_referred_profile_id
        AND r.activated_at IS NOT NULL
    ),
    (
      SELECT MAX(a.created_at)
      FROM public.referral_activity a
      WHERE a.referred_profile_id = p_referred_profile_id
    )
  INTO is_active, last_activity_at;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.is_referred_user_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_referred_user_active(uuid) TO authenticated;

-- Trigger: log profile_completed when a profile transitions into completion state
CREATE OR REPLACE FUNCTION public.on_profiles_profile_completed_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_old_complete boolean;
  v_new_complete boolean;
BEGIN
  v_old_complete := (
    NEW.id IS NOT NULL
    AND OLD.avatar_url IS NOT NULL AND trim(OLD.avatar_url) <> ''
    AND (
      (OLD.bio IS NOT NULL AND trim(OLD.bio) <> '')
      OR (OLD.username IS NOT NULL AND trim(OLD.username) <> '')
    )
  );

  v_new_complete := (
    NEW.id IS NOT NULL
    AND NEW.avatar_url IS NOT NULL AND trim(NEW.avatar_url) <> ''
    AND (
      (NEW.bio IS NOT NULL AND trim(NEW.bio) <> '')
      OR (NEW.username IS NOT NULL AND trim(NEW.username) <> '')
    )
  );

  IF v_new_complete AND NOT v_old_complete THEN
    PERFORM public.log_referral_activity_for_profile(NEW.id, 'profile_completed', NULL);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_profile_completed_activity ON public.profiles;
CREATE TRIGGER trg_profiles_profile_completed_activity
AFTER UPDATE OF avatar_url, bio, username ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.on_profiles_profile_completed_activity();

-- Trigger: log first_post_created for first ever post
CREATE OR REPLACE FUNCTION public.on_posts_first_post_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NEW.author_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.author_id = NEW.author_id
      AND p.id <> NEW.id
    LIMIT 1
  ) THEN
    PERFORM public.log_referral_activity_for_profile(NEW.author_id, 'first_post_created', NULL);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_posts_first_post_activity ON public.posts;
CREATE TRIGGER trg_posts_first_post_activity
AFTER INSERT ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.on_posts_first_post_activity();

COMMIT;

