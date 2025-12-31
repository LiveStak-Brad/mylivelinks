-- Migration: Add is_live to leaderboard RPC
-- This allows the leaderboard to show live indicators on avatars

BEGIN;

DROP FUNCTION IF EXISTS public.get_leaderboard(text, text, integer);

CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_type text,
  p_period text,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  profile_id uuid,
  username text,
  avatar_url text,
  is_live boolean,
  gifter_level integer,
  metric_value bigint,
  rank integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_start timestamptz;
BEGIN
  v_start := CASE LOWER(COALESCE(p_period, 'alltime'))
    WHEN 'daily' THEN date_trunc('day', now())
    WHEN 'weekly' THEN date_trunc('week', now())
    WHEN 'monthly' THEN date_trunc('month', now())
    ELSE NULL
  END;

  IF LOWER(COALESCE(p_type, '')) IN ('top_gifters', 'gifters', 'gifter') THEN
    RETURN QUERY
    WITH sums AS (
      SELECT
        le.user_id AS profile_id,
        SUM(ABS(le.delta_coins))::bigint AS metric_value
      FROM public.ledger_entries le
      WHERE le.entry_type = 'coin_spend_gift'
        AND le.delta_coins <> 0
        AND (v_start IS NULL OR le.created_at >= v_start)
      GROUP BY le.user_id
    )
    SELECT
      s.profile_id AS profile_id,
      COALESCE(p.username, left(s.profile_id::text, 8)) AS username,
      p.avatar_url,
      COALESCE(p.is_live, false) AS is_live,
      COALESCE(p.gifter_level, 0) AS gifter_level,
      s.metric_value,
      ROW_NUMBER() OVER (ORDER BY s.metric_value DESC, COALESCE(p.username, s.profile_id::text) ASC, s.profile_id ASC)::int AS rank
    FROM sums s
    LEFT JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.metric_value > 0
    ORDER BY s.metric_value DESC, COALESCE(p.username, s.profile_id::text) ASC, s.profile_id ASC
    LIMIT COALESCE(p_limit, 100);

  ELSIF LOWER(COALESCE(p_type, '')) IN ('top_streamers', 'streamers', 'streamer') THEN
    RETURN QUERY
    WITH sums AS (
      SELECT
        le.user_id AS profile_id,
        SUM(le.delta_diamonds)::bigint AS metric_value
      FROM public.ledger_entries le
      WHERE le.entry_type = 'diamond_earn'
        AND le.delta_diamonds > 0
        AND (v_start IS NULL OR le.created_at >= v_start)
      GROUP BY le.user_id
    )
    SELECT
      s.profile_id AS profile_id,
      COALESCE(p.username, left(s.profile_id::text, 8)) AS username,
      p.avatar_url,
      COALESCE(p.is_live, false) AS is_live,
      COALESCE(p.gifter_level, 0) AS gifter_level,
      s.metric_value,
      ROW_NUMBER() OVER (ORDER BY s.metric_value DESC, COALESCE(p.username, s.profile_id::text) ASC, s.profile_id ASC)::int AS rank
    FROM sums s
    LEFT JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.metric_value > 0
    ORDER BY s.metric_value DESC, COALESCE(p.username, s.profile_id::text) ASC, s.profile_id ASC
    LIMIT COALESCE(p_limit, 100);
  ELSE
    RAISE EXCEPTION 'Invalid leaderboard type: %', p_type;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text, integer) TO authenticated;

COMMIT;
