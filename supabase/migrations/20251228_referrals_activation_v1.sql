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
