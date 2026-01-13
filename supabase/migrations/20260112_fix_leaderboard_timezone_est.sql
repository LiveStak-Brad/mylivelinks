BEGIN;

-- Fix leaderboard time periods to use EST (America/New_York) timezone
-- Daily: resets at midnight EST
-- Weekly: resets Monday midnight EST
-- Monthly: resets at start of calendar month EST
-- All-time: no time boundary (forever)

DROP FUNCTION IF EXISTS public.get_leaderboard(text, text, integer, text);

CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_type text,
  p_period text,
  p_limit integer DEFAULT 100,
  p_room_id text DEFAULT NULL
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
  v_now_est timestamptz;
BEGIN
  -- Convert current time to EST
  v_now_est := now() AT TIME ZONE 'America/New_York';
  
  -- Calculate period start time in EST, then convert back to UTC for comparison
  v_start := CASE LOWER(COALESCE(p_period, 'alltime'))
    WHEN 'daily' THEN 
      -- Start of today in EST
      (date_trunc('day', v_now_est) AT TIME ZONE 'America/New_York')
    WHEN 'weekly' THEN 
      -- Start of this week (Monday) in EST
      (date_trunc('week', v_now_est) AT TIME ZONE 'America/New_York')
    WHEN 'monthly' THEN 
      -- Start of this month in EST
      (date_trunc('month', v_now_est) AT TIME ZONE 'America/New_York')
    ELSE NULL -- all-time
  END;

  IF LOWER(COALESCE(p_type, '')) IN ('top_gifters', 'gifters', 'gifter') THEN
    RETURN QUERY
    WITH sums AS (
      SELECT
        le.user_id AS profile_id,
        SUM(ABS(le.delta_coins))::bigint AS metric_value
      FROM public.ledger_entries le
      WHERE le.entry_type = 'coin_spend_gift'
        AND COALESCE(le.delta_coins, 0) <> 0
        AND (v_start IS NULL OR le.created_at >= v_start)
        AND (
          p_room_id IS NULL
          OR COALESCE(le.room_id, le.metadata->>'room_id') = p_room_id
        )
      GROUP BY le.user_id
    )
    SELECT
      s.profile_id AS profile_id,
      COALESCE(p.username::text, left(s.profile_id::text, 8))::text AS username,
      p.avatar_url::text AS avatar_url,
      COALESCE(p.is_live, false)::boolean AS is_live,
      COALESCE(p.gifter_level, 0)::integer AS gifter_level,
      s.metric_value,
      ROW_NUMBER() OVER (
        ORDER BY s.metric_value DESC, COALESCE(p.username, s.profile_id::text) ASC, s.profile_id ASC
      )::int AS rank
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
        AND COALESCE(le.delta_diamonds, 0) > 0
        AND (v_start IS NULL OR le.created_at >= v_start)
        AND (
          p_room_id IS NULL
          OR COALESCE(le.room_id, le.metadata->>'room_id') = p_room_id
        )
      GROUP BY le.user_id
    )
    SELECT
      s.profile_id AS profile_id,
      COALESCE(p.username::text, left(s.profile_id::text, 8))::text AS username,
      p.avatar_url::text AS avatar_url,
      COALESCE(p.is_live, false)::boolean AS is_live,
      COALESCE(p.gifter_level, 0)::integer AS gifter_level,
      s.metric_value,
      ROW_NUMBER() OVER (
        ORDER BY s.metric_value DESC, COALESCE(p.username, s.profile_id::text) ASC, s.profile_id ASC
      )::int AS rank
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

-- Grant permissions
REVOKE ALL ON FUNCTION public.get_leaderboard(text, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text, integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text, integer, text) TO authenticated;

-- Ensure PostgREST schema cache updates
NOTIFY pgrst, 'reload schema';

COMMIT;
