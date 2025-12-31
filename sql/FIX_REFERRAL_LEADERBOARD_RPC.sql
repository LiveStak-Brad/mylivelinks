-- Fix the referral leaderboard RPC type mismatch
-- The function declares username as TEXT but profiles table has VARCHAR(50)

DROP FUNCTION IF EXISTS public.get_referrals_leaderboard(text, integer, jsonb);

CREATE OR REPLACE FUNCTION public.get_referrals_leaderboard(
  p_range text DEFAULT 'all',
  p_limit integer DEFAULT 25,
  p_cursor jsonb DEFAULT NULL
)
RETURNS TABLE (
  profile_id uuid,
  username varchar,
  avatar_url varchar,
  joined bigint,
  active bigint,
  last_activity_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_start timestamptz;
  c_active bigint;
  c_joined bigint;
  c_last_activity_at timestamptz;
  c_profile_id uuid;
BEGIN
  v_start := CASE lower(trim(coalesce(p_range, 'all')))
    WHEN '7d' THEN now() - interval '7 days'
    WHEN '30d' THEN now() - interval '30 days'
    WHEN 'all' THEN NULL
    ELSE NULL
  END;

  IF p_cursor IS NOT NULL THEN
    c_active := NULLIF(trim(coalesce(p_cursor->>'active', '')), '')::bigint;
    c_joined := NULLIF(trim(coalesce(p_cursor->>'joined', '')), '')::bigint;
    c_last_activity_at := NULLIF(trim(coalesce(p_cursor->>'last_activity_at', '')), '')::timestamptz;
    c_profile_id := NULLIF(trim(coalesce(p_cursor->>'profile_id', '')), '')::uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'referral_rollups'
  ) THEN
    RAISE EXCEPTION 'Table referral_rollups does not exist';
  END IF;

  RETURN QUERY
  WITH referrer_counts AS (
    SELECT
      rr.referrer_profile_id AS profile_id,
      rr.joined_count AS joined,
      rr.active_count AS active,
      rr.last_activity_at
    FROM public.referral_rollups rr
    WHERE
      (v_start IS NULL OR rr.last_activity_at >= v_start)
      AND rr.joined_count > 0
  ),
  filtered AS (
    SELECT
      c.profile_id,
      c.joined,
      c.active,
      c.last_activity_at
    FROM referrer_counts c
    WHERE
      (p_cursor IS NULL) OR
      (
        (c.active < c_active) OR
        (c.active = c_active AND c.joined < c_joined) OR
        (c.active = c_active AND c.joined = c_joined AND c.last_activity_at < c_last_activity_at) OR
        (c.active = c_active AND c.joined = c_joined AND COALESCE(c.last_activity_at, '0001-01-01'::timestamptz) = COALESCE(c_last_activity_at, '0001-01-01'::timestamptz) AND c.profile_id > c_profile_id)
      )
  )
  SELECT
    f.profile_id,
    COALESCE(p.username, '') AS username,
    p.avatar_url,
    f.joined,
    f.active,
    f.last_activity_at
  FROM filtered f
  LEFT JOIN public.profiles p ON p.id = f.profile_id
  ORDER BY
    f.active DESC,
    f.joined DESC,
    f.last_activity_at DESC,
    f.profile_id ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_referrals_leaderboard(text, integer, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.get_referrals_leaderboard(text, integer, jsonb) TO authenticated;

COMMENT ON FUNCTION public.get_referrals_leaderboard IS 'Referral leaderboard with cursor-based pagination';
