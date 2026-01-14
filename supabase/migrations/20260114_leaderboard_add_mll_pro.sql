-- ============================================================================
-- Add is_mll_pro to get_leaderboard RPC
-- ============================================================================

BEGIN;

-- Drop existing function signatures
DROP FUNCTION IF EXISTS public.get_leaderboard(text, text, integer);
DROP FUNCTION IF EXISTS public.get_leaderboard(text, text, integer, uuid);

CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_type text,
  p_period text,
  p_limit integer DEFAULT 100,
  p_room_id uuid DEFAULT NULL
)
RETURNS TABLE (
  profile_id uuid,
  username text,
  avatar_url text,
  is_live boolean,
  is_mll_pro boolean,
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
      WHERE le.entry_type IN ('coin_spend_gift', 'coin_spend_team_pool_gift')
        AND le.delta_coins <> 0
        AND (v_start IS NULL OR le.created_at >= v_start)
        AND (p_room_id IS NULL OR le.room_id = p_room_id)
      GROUP BY le.user_id
    )
    SELECT
      s.profile_id,
      COALESCE(p.username, left(s.profile_id::text, 8)),
      p.avatar_url,
      COALESCE(p.is_live, false),
      COALESCE(p.is_mll_pro, false),
      COALESCE(p.gifter_level, 0),
      s.metric_value,
      ROW_NUMBER() OVER (ORDER BY s.metric_value DESC, COALESCE(p.username, s.profile_id::text) ASC, s.profile_id ASC)::int
    FROM sums s
    LEFT JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.metric_value > 0
    ORDER BY s.metric_value DESC
    LIMIT COALESCE(p_limit, 100);

  ELSIF LOWER(COALESCE(p_type, '')) IN ('top_streamers', 'streamers', 'streamer') THEN
    RETURN QUERY
    WITH sums AS (
      SELECT
        le.user_id AS profile_id,
        SUM(le.delta_diamonds)::bigint AS metric_value
      FROM public.ledger_entries le
      WHERE le.entry_type IN ('diamond_earn', 'diamond_earn_team_pool_gift')
        AND le.delta_diamonds > 0
        AND (v_start IS NULL OR le.created_at >= v_start)
        AND (p_room_id IS NULL OR le.room_id = p_room_id)
      GROUP BY le.user_id
    )
    SELECT
      s.profile_id,
      COALESCE(p.username, left(s.profile_id::text, 8)),
      p.avatar_url,
      COALESCE(p.is_live, false),
      COALESCE(p.is_mll_pro, false),
      COALESCE(p.gifter_level, 0),
      s.metric_value,
      ROW_NUMBER() OVER (ORDER BY s.metric_value DESC, COALESCE(p.username, s.profile_id::text) ASC, s.profile_id ASC)::int
    FROM sums s
    LEFT JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.metric_value > 0
    ORDER BY s.metric_value DESC
    LIMIT COALESCE(p_limit, 100);

  ELSE
    RAISE EXCEPTION 'Invalid leaderboard type: %', p_type;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text, integer, uuid) TO anon, authenticated;

COMMIT;
