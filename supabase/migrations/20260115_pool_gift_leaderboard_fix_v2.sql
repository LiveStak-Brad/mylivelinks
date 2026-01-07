BEGIN;

-- 1. FIX LEADERBOARDS: Update get_leaderboard to count pool gifts
-- We need to DROP first to ensure no signature conflicts if we were to change anything, 
-- though here we are just changing the internal query logic.
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
      -- FIXED: Added 'coin_spend_team_pool_gift'
      WHERE le.entry_type IN ('coin_spend_gift', 'coin_spend_team_pool_gift')
        AND le.delta_coins <> 0
        AND (v_start IS NULL OR le.created_at >= v_start)
      GROUP BY le.user_id
    )
    SELECT
      s.profile_id,
      COALESCE(p.username, left(s.profile_id::text, 8)),
      p.avatar_url,
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
      -- FIXED: Added 'diamond_earn_team_pool_gift'
      WHERE le.entry_type IN ('diamond_earn', 'diamond_earn_team_pool_gift')
        AND le.delta_diamonds > 0
        AND (v_start IS NULL OR le.created_at >= v_start)
      GROUP BY le.user_id
    )
    SELECT
      s.profile_id,
      COALESCE(p.username, left(s.profile_id::text, 8)),
      p.avatar_url,
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

-- 2. FIX SUGGESTIONS: Ensure quotes are powers of 10
CREATE OR REPLACE FUNCTION public.rpc_get_team_pool_gift_quote_24h(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_active_count int;
  v_base bigint;
  v_suggestions bigint[];
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT COUNT(*)::int INTO v_active_count
  FROM public.rpc_get_active_team_members_24h(p_team_id)
  WHERE member_id <> v_actor;

  IF COALESCE(v_active_count, 0) <= 0 THEN
    RETURN jsonb_build_object('success', true, 'team_id', p_team_id, 'active_count', 0, 'suggestions', '[]'::jsonb);
  END IF;

  v_base := v_active_count::bigint;
  -- FIXED: Powers of 10
  v_suggestions := ARRAY[
    v_base,
    v_base * 10,
    v_base * 100,
    v_base * 1000,
    v_base * 10000,
    v_base * 100000
  ];

  RETURN jsonb_build_object(
    'success', true,
    'team_id', p_team_id,
    'active_count', v_active_count,
    'suggestions', (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM unnest(v_suggestions) x)
  );
END;
$$;

-- Grant permissions again just in case
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_team_pool_gift_quote_24h(uuid) TO authenticated;

-- Force API cache reload
NOTIFY pgrst, 'reload schema';

COMMIT;
