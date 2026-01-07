BEGIN;

-- 1. Update Global Leaderboards (get_leaderboard RPC) to include pool gifts
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
      WHERE le.entry_type IN ('coin_spend_gift', 'coin_spend_team_pool_gift')
        AND le.delta_coins <> 0
        AND (v_start IS NULL OR le.created_at >= v_start)
      GROUP BY le.user_id
    )
    SELECT
      s.profile_id AS profile_id,
      COALESCE(p.username, left(s.profile_id::text, 8)) AS username,
      p.avatar_url,
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
      WHERE le.entry_type IN ('diamond_earn', 'diamond_earn_team_pool_gift')
        AND le.delta_diamonds > 0
        AND (v_start IS NULL OR le.created_at >= v_start)
      GROUP BY le.user_id
    )
    SELECT
      s.profile_id AS profile_id,
      COALESCE(p.username, left(s.profile_id::text, 8)) AS username,
      p.avatar_url,
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

-- 2. Update Team Score Events View (v_team_score_events) to include pool gifts
CREATE OR REPLACE VIEW public.v_team_score_events AS
WITH live_sessions AS (
  SELECT
    ls.id AS live_stream_id,
    ls.profile_id AS host_profile_id,
    ls.started_at,
    COALESCE(ls.ended_at, ls.started_at) AS ended_at,
    tlt.membership_team_id,
    tlt.team_id,
    tlt.team_slug,
    tlt.team_name,
    tlt.banner_url,
    tlt.image_url
  FROM public.live_streams ls
  JOIN LATERAL (
    SELECT public.team_id_for_live_stream(ls.id) AS membership_team_id
  ) map ON map.membership_team_id IS NOT NULL
  JOIN public.v_team_leaderboard_teams tlt ON tlt.membership_team_id = map.membership_team_id
),
live_stream_metrics AS (
  SELECT
    ls.id,
    ls.started_at,
    COALESCE(ls.ended_at, now()) AS ended_at,
    GREATEST(EXTRACT(EPOCH FROM (COALESCE(ls.ended_at, now()) - ls.started_at)) / 60.0, 0) AS live_minutes,
    COALESCE(ls.total_viewer_minutes, 0)::numeric AS viewer_minutes
  FROM public.live_streams ls
),
live_activity AS (
  SELECT
    l.team_id,
    l.membership_team_id,
    l.team_slug,
    l.team_name,
    l.banner_url,
    l.image_url,
    'live_streams' AS source_table,
    (l.live_stream_id::text || ':live_minutes') AS source_id,
    'activity' AS dimension,
    'live_minutes' AS metric_type,
    m.live_minutes AS amount,
    'live_streams:' || l.live_stream_id::text || ':activity:live_minutes' AS event_uid,
    COALESCE(m.ended_at, m.started_at, l.started_at) AS occurred_at,
    NULL::uuid AS actor_profile_id
  FROM live_sessions l
  JOIN live_stream_metrics m ON m.id = l.live_stream_id
  WHERE m.live_minutes > 0
),
live_presence_minutes AS (
  SELECT
    l.team_id,
    l.membership_team_id,
    l.team_slug,
    l.team_name,
    l.banner_url,
    l.image_url,
    'live_streams' AS source_table,
    (l.live_stream_id::text || ':viewer_minutes') AS source_id,
    'presence' AS dimension,
    'viewer_minutes' AS metric_type,
    m.viewer_minutes AS amount,
    'live_streams:' || l.live_stream_id::text || ':presence:viewer_minutes' AS event_uid,
    COALESCE(m.ended_at, m.started_at, l.started_at) AS occurred_at,
    NULL::uuid AS actor_profile_id
  FROM live_sessions l
  JOIN live_stream_metrics m ON m.id = l.live_stream_id
  WHERE m.viewer_minutes > 0
),
live_participation AS (
  SELECT
    l.team_id,
    l.membership_team_id,
    l.team_slug,
    l.team_name,
    l.banner_url,
    l.image_url,
    'live_streams' AS source_table,
    l.live_stream_id::text AS source_id,
    'participation' AS dimension,
    'member_minutes' AS metric_type,
    m.live_minutes AS amount,
    'live_streams:' || l.live_stream_id::text || ':participation:member_minutes' AS event_uid,
    COALESCE(m.ended_at, m.started_at, l.started_at) AS occurred_at,
    l.host_profile_id AS actor_profile_id
  FROM live_sessions l
  JOIN live_stream_metrics m ON m.id = l.live_stream_id
  WHERE m.live_minutes > 0
),
post_activity AS (
  SELECT
    teams.team_id,
    teams.membership_team_id,
    teams.team_slug,
    teams.team_name,
    teams.banner_url,
    teams.image_url,
    'team_feed_posts' AS source_table,
    p.id::text AS source_id,
    'activity' AS dimension,
    'post_count' AS metric_type,
    1::numeric AS amount,
    'team_feed_posts:' || p.id::text || ':activity:post_count' AS event_uid,
    p.created_at AS occurred_at,
    NULL::uuid AS actor_profile_id
  FROM public.team_feed_posts p
  JOIN public.v_team_leaderboard_teams teams ON teams.membership_team_id = p.team_id
),
post_participation AS (
  SELECT
    teams.team_id,
    teams.membership_team_id,
    teams.team_slug,
    teams.team_name,
    teams.banner_url,
    teams.image_url,
    'team_feed_posts' AS source_table,
    p.id::text AS source_id,
    'participation' AS dimension,
    'member_activity' AS metric_type,
    1::numeric AS amount,
    'team_feed_posts:' || p.id::text || ':participation:member_activity' AS event_uid,
    p.created_at AS occurred_at,
    p.author_id AS actor_profile_id
  FROM public.team_feed_posts p
  JOIN public.v_team_leaderboard_teams teams ON teams.membership_team_id = p.team_id
),
gifting_events AS (
  SELECT
    members.team_id,
    members.membership_team_id,
    members.team_slug,
    members.team_name,
    members.banner_url,
    members.image_url,
    'ledger_entries' AS source_table,
    le.id::text AS source_id,
    'gifting' AS dimension,
    'gifting_diamonds' AS metric_type,
    GREATEST(le.delta_diamonds, 0)::numeric AS amount,
    'ledger_entries:' || le.id::text || ':gifting' AS event_uid,
    le.created_at AS occurred_at,
    le.user_id AS actor_profile_id
  FROM public.ledger_entries le
  JOIN public.v_team_leaderboard_members members ON members.profile_id = le.user_id
  WHERE le.entry_type IN ('diamond_earn', 'diamond_earn_team_pool_gift')
    AND COALESCE(le.delta_diamonds, 0) > 0
),
live_join_dedup AS (
  SELECT DISTINCT ON (
    teams.team_id,
    lje.stream_id,
    COALESCE(lje.profile_id::text, lje.meta->>'viewer_key', lje.id::text),
    date_trunc('day', lje.created_at AT TIME ZONE 'UTC')
  )
    teams.team_id,
    teams.membership_team_id,
    teams.team_slug,
    teams.team_name,
    teams.banner_url,
    teams.image_url,
    lje.created_at,
    COALESCE(lje.profile_id::text, lje.meta->>'viewer_key', lje.id::text) AS viewer_key
  FROM public.live_join_events lje
  JOIN public.team_live_rooms tlr ON tlr.live_stream_id = lje.stream_id
  JOIN public.v_team_leaderboard_teams teams ON teams.membership_team_id = tlr.team_id
  WHERE lje.phase = 'room_connected'
),
presence_unique AS (
  SELECT
    d.team_id,
    d.membership_team_id,
    d.team_slug,
    d.team_name,
    d.banner_url,
    d.image_url,
    'live_join_events' AS source_table,
    (d.viewer_key || ':' || date_trunc('day', d.created_at AT TIME ZONE 'UTC')::date)::text AS source_id,
    'presence' AS dimension,
    'unique_viewer' AS metric_type,
    1::numeric AS amount,
    'live_join_events:' || d.viewer_key || ':' || to_char(date_trunc('day', d.created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS event_uid,
    d.created_at AS occurred_at,
    NULL::uuid AS actor_profile_id
  FROM live_join_dedup d
),
events_union AS (
  SELECT * FROM live_activity
  UNION ALL SELECT * FROM live_presence_minutes
  UNION ALL SELECT * FROM live_participation
  UNION ALL SELECT * FROM post_activity
  UNION ALL SELECT * FROM post_participation
  UNION ALL SELECT * FROM gifting_events
  UNION ALL SELECT * FROM presence_unique
)
SELECT DISTINCT ON (team_id, event_uid)
  e.team_id,
  e.membership_team_id,
  e.team_slug,
  e.team_name,
  e.banner_url,
  e.image_url,
  e.source_table,
  e.source_id,
  e.dimension,
  e.metric_type,
  e.amount,
  e.event_uid,
  e.occurred_at,
  e.actor_profile_id
FROM events_union e
ORDER BY e.team_id, e.event_uid, e.occurred_at DESC;

NOTIFY pgrst, 'reload schema';

COMMIT;
