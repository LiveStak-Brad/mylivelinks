BEGIN;

-- Canonical referrals leaderboard for web + mobile.
-- Supports range: '7d' | '30d' | 'all'
-- Stable ordering:
--   active desc, joined desc, last_activity_at desc, profile_id asc
-- Cursor pagination is implemented by passing the last row's sort tuple in p_cursor.

DROP FUNCTION IF EXISTS public.get_referrals_leaderboard(text, integer, jsonb);

CREATE OR REPLACE FUNCTION public.get_referrals_leaderboard(
  p_range text DEFAULT 'all',
  p_limit integer DEFAULT 25,
  p_cursor jsonb DEFAULT NULL
)
RETURNS TABLE (
  profile_id uuid,
  username text,
  avatar_url text,
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
    WHERE table_schema = 'public' AND table_name = 'referrals'
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'referral_activity'
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'referral_rollups'
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY EXECUTE $q$
    WITH joined_counts AS (
      SELECT
        r.referrer_profile_id AS profile_id,
        COUNT(*) FILTER (WHERE $1 IS NULL OR r.claimed_at >= $1)::bigint AS joined
      FROM public.referrals r
      GROUP BY r.referrer_profile_id
    ),
    active_counts AS (
      SELECT
        a.referrer_profile_id AS profile_id,
        COUNT(*) FILTER (
          WHERE a.event_type = 'activated'
            AND ($1 IS NULL OR a.created_at >= $1)
        )::bigint AS active
      FROM public.referral_activity a
      WHERE a.referrer_profile_id IS NOT NULL
      GROUP BY a.referrer_profile_id
    ),
    counts AS (
      SELECT
        COALESCE(j.profile_id, a.profile_id) AS profile_id,
        COALESCE(j.joined, 0)::bigint AS joined,
        COALESCE(a.active, 0)::bigint AS active
      FROM joined_counts j
      FULL OUTER JOIN active_counts a USING (profile_id)
    ),
    base AS (
      SELECT
        c.profile_id,
        p.username,
        p.avatar_url,
        c.joined,
        c.active,
        rr.last_activity_at
      FROM counts c
      LEFT JOIN public.referral_rollups rr ON rr.referrer_profile_id = c.profile_id
      LEFT JOIN public.profiles p ON p.id = c.profile_id
      WHERE (c.joined > 0 OR c.active > 0)
    ),
    filtered AS (
      SELECT
        b.*,
        COALESCE(b.last_activity_at, '0001-01-01'::timestamptz) AS sort_last_activity_at
      FROM base b
      WHERE $6 IS NULL
        OR (
          b.active < $2
          OR (b.active = $2 AND b.joined < $3)
          OR (
            b.active = $2
            AND b.joined = $3
            AND COALESCE(b.last_activity_at, '0001-01-01'::timestamptz) < COALESCE($4, '0001-01-01'::timestamptz)
          )
          OR (
            b.active = $2
            AND b.joined = $3
            AND COALESCE(b.last_activity_at, '0001-01-01'::timestamptz) = COALESCE($4, '0001-01-01'::timestamptz)
            AND b.profile_id > $5
          )
        )
    )
    SELECT
      f.profile_id,
      COALESCE(f.username, '') AS username,
      f.avatar_url,
      f.joined,
      f.active,
      f.last_activity_at
    FROM filtered f
    ORDER BY f.active DESC, f.joined DESC, f.sort_last_activity_at DESC, f.profile_id ASC
    LIMIT LEAST(GREATEST(COALESCE($7, 25), 1), 100)
  $q$
  USING v_start, c_active, c_joined, c_last_activity_at, c_profile_id, p_cursor, p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_referrals_leaderboard(text, integer, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.get_referrals_leaderboard(text, integer, jsonb) TO authenticated;

COMMIT;




