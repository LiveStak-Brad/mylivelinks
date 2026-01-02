BEGIN;

--------------------------------------------------------------------------------
-- Money config defaults for team leaderboards (weights & baselines)
--------------------------------------------------------------------------------

INSERT INTO public.money_config (key, value_num)
VALUES
  ('team_lb_weight_activity', 0.35),
  ('team_lb_weight_participation', 0.25),
  ('team_lb_weight_gifting', 0.25),
  ('team_lb_weight_presence', 0.15),
  ('team_lb_baseline_activity_daily', 360),
  ('team_lb_baseline_activity_weekly', 1800),
  ('team_lb_baseline_activity_all_time', 20000),
  ('team_lb_baseline_participation_daily', 20),
  ('team_lb_baseline_participation_weekly', 120),
  ('team_lb_baseline_participation_all_time', 1200),
  ('team_lb_baseline_gifting_daily', 10000),
  ('team_lb_baseline_gifting_weekly', 70000),
  ('team_lb_baseline_gifting_all_time', 1000000),
  ('team_lb_baseline_presence_daily', 500),
  ('team_lb_baseline_presence_weekly', 3500),
  ('team_lb_baseline_presence_all_time', 25000)
ON CONFLICT (key) DO NOTHING;

--------------------------------------------------------------------------------
-- Helper functions
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.team_lb_get_config(p_key text, p_default numeric)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT value_num FROM public.money_config WHERE key = p_key),
    p_default
  );
$$;

CREATE OR REPLACE FUNCTION public.team_lb_norm(p_value numeric, p_baseline numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(p_value, 0) <= 0 THEN 0
    WHEN COALESCE(p_baseline, 0) <= 0 THEN LEAST(100, p_value * 100)
    ELSE LEAST(
      100,
      (LN(1 + GREATEST(p_value, 0)) / NULLIF(LN(1 + GREATEST(p_baseline, 0)), 0)) * 100
    )
  END;
$$;

--------------------------------------------------------------------------------
-- Canonical team + roster projections (rooms-first with team crosswalk)
--------------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.v_team_leaderboard_teams AS
WITH rooms_with_meta AS (
  SELECT
    r.id AS team_id,
    r.room_key,
    r.name,
    r.banner_url,
    r.image_url,
    r.theme_color,
    r.feature_flags,
    r.category,
    r.status,
    r.created_at,
    r.updated_at,
    NULLIF(r.feature_flags->>'team_id', '')::uuid AS feature_team_id,
    NULLIF(r.feature_flags->>'team_slug', '') AS feature_team_slug,
    COALESCE((r.feature_flags->>'is_team')::boolean, false) AS is_team_flag
  FROM public.rooms r
)
SELECT
  r.team_id,
  t.id AS membership_team_id,
  COALESCE(r.room_key, t.slug) AS team_slug,
  COALESCE(r.name, t.name) AS team_name,
  r.banner_url,
  r.image_url,
  r.theme_color,
  t.team_tag,
  t.approved_member_count AS roster_size,
  r.feature_flags,
  r.created_at,
  r.updated_at
FROM rooms_with_meta r
JOIN public.teams t
  ON (
    (r.feature_team_id IS NOT NULL AND t.id = r.feature_team_id)
    OR (r.feature_team_id IS NULL AND lower(r.room_key) = lower(t.slug))
    OR (r.feature_team_slug IS NOT NULL AND lower(r.feature_team_slug) = lower(t.slug))
  )
WHERE
  r.status IS DISTINCT FROM 'draft'
  AND (
    r.is_team_flag
    OR r.feature_team_id IS NOT NULL
    OR r.feature_team_slug IS NOT NULL
    OR r.category = 'teams'
  );

CREATE OR REPLACE VIEW public.v_team_leaderboard_members AS
SELECT
  teams.team_id,
  teams.membership_team_id,
  teams.team_slug,
  teams.team_name,
  teams.banner_url,
  teams.image_url,
  teams.roster_size,
  roster.profile_id,
  roster.role,
  roster.status,
  roster.requested_at,
  roster.approved_at,
  roster.rejected_at,
  roster.left_at,
  roster.banned_at,
  roster.last_status_changed_at
FROM public.v_team_leaderboard_teams teams
JOIN public.v_team_roster roster
  ON roster.team_id = teams.membership_team_id
WHERE roster.status = 'approved';

--------------------------------------------------------------------------------
-- Unified event feed (no double counting)
--------------------------------------------------------------------------------

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
  WHERE le.entry_type = 'diamond_earn'
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
  -- Simplified: team_live_rooms directly links live_stream_id to team_id
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

--------------------------------------------------------------------------------
-- Adjustment log (logic view + backing table)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.team_score_adjustment_log (
  id bigserial PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  applies_on date NOT NULL,
  dimension text NOT NULL CHECK (dimension IN ('activity','participation','gifting','presence')),
  amount numeric NOT NULL,
  reason text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_score_adjustment_log_team_day
  ON public.team_score_adjustment_log(team_id, applies_on);

CREATE OR REPLACE VIEW public.team_score_adjustments AS
SELECT
  team_id,
  applies_on,
  dimension,
  amount,
  reason,
  created_at,
  created_by
FROM public.team_score_adjustment_log;

--------------------------------------------------------------------------------
-- Daily snapshot materialized view
--------------------------------------------------------------------------------

CREATE MATERIALIZED VIEW IF NOT EXISTS public.team_score_daily_mv AS
WITH bucketed AS (
  SELECT
    e.team_id,
    e.membership_team_id,
    e.team_slug,
    e.team_name,
    e.banner_url,
    e.image_url,
    e.dimension,
    e.metric_type,
    e.amount,
    e.actor_profile_id,
    date_trunc('day', e.occurred_at AT TIME ZONE 'UTC')::date AS day,
    e.occurred_at
  FROM public.v_team_score_events e
),
aggregated AS (
  SELECT
    b.team_id,
    b.membership_team_id,
    b.team_slug,
    b.team_name,
    b.banner_url,
    b.image_url,
    b.day,
    SUM(CASE WHEN b.dimension = 'activity' AND b.metric_type = 'live_minutes' THEN b.amount ELSE 0 END) AS activity_live_minutes,
    SUM(CASE WHEN b.dimension = 'activity' AND b.metric_type = 'post_count' THEN b.amount ELSE 0 END) AS activity_post_count,
    0::numeric AS activity_battle_points,
    COUNT(DISTINCT CASE WHEN b.dimension = 'participation' AND b.actor_profile_id IS NOT NULL THEN b.actor_profile_id END) AS participation_active_members,
    SUM(CASE WHEN b.dimension = 'participation' AND b.metric_type = 'member_minutes' THEN b.amount ELSE 0 END) AS participation_member_minutes,
    SUM(CASE WHEN b.dimension = 'gifting' THEN b.amount ELSE 0 END) AS gifting_raw,
    SUM(CASE WHEN b.dimension = 'presence' AND b.metric_type = 'viewer_minutes' THEN b.amount ELSE 0 END) AS presence_viewer_minutes,
    SUM(CASE WHEN b.dimension = 'presence' AND b.metric_type = 'unique_viewer' THEN b.amount ELSE 0 END) AS presence_unique_viewers,
    MAX(b.occurred_at) AS last_event_at
  FROM bucketed b
  GROUP BY
    b.team_id,
    b.membership_team_id,
    b.team_slug,
    b.team_name,
    b.banner_url,
    b.image_url,
    b.day
)
SELECT
  agg.team_id,
  agg.membership_team_id,
  agg.team_slug,
  agg.team_name,
  agg.banner_url,
  agg.image_url,
  agg.day,
  agg.activity_live_minutes,
  agg.activity_post_count,
  agg.activity_battle_points,
  agg.participation_active_members,
  agg.participation_member_minutes,
  agg.gifting_raw,
  agg.presence_viewer_minutes,
  agg.presence_unique_viewers,
  agg.last_event_at,
  teams.roster_size,
  (
    0.6 * (agg.activity_live_minutes / 10.0)
    + 0.3 * agg.activity_post_count
    + 0.1 * agg.activity_battle_points
  ) AS activity_raw,
  (
    agg.participation_active_members * (
      1 + LEAST(
        COALESCE(agg.participation_member_minutes, 0) / 60.0
        / NULLIF(4 * GREATEST(teams.roster_size, 1), 0),
        1
      )
    )
  ) AS participation_raw,
  agg.gifting_raw AS gifting_raw,
  (
    0.7 * (agg.presence_viewer_minutes / 5.0)
    + 0.3 * agg.presence_unique_viewers
  ) AS presence_raw
FROM aggregated agg
JOIN public.v_team_leaderboard_teams teams ON teams.team_id = agg.team_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_score_daily_mv_day_team
  ON public.team_score_daily_mv(day, team_id);

--------------------------------------------------------------------------------
-- Weekly and all-time rollups (computed-on-read views)
--------------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.team_score_weekly_view AS
WITH anchor AS (
  SELECT COALESCE(MAX(day), CURRENT_DATE) AS max_day FROM public.team_score_daily_mv
)
SELECT
  d.team_id,
  d.membership_team_id,
  d.team_slug,
  d.team_name,
  d.banner_url,
  d.image_url,
  a.max_day - 6 AS window_start_day,
  a.max_day AS window_end_day,
  SUM(d.activity_raw) AS activity_raw,
  SUM(d.participation_raw) AS participation_raw,
  SUM(d.gifting_raw) AS gifting_raw,
  SUM(d.presence_raw) AS presence_raw,
  SUM(d.activity_live_minutes) AS activity_live_minutes,
  SUM(d.activity_post_count) AS activity_post_count,
  SUM(d.participation_active_members) AS participation_active_members,
  SUM(d.participation_member_minutes) AS participation_member_minutes,
  SUM(d.presence_viewer_minutes) AS presence_viewer_minutes,
  SUM(d.presence_unique_viewers) AS presence_unique_viewers,
  MAX(d.last_event_at) AS last_event_at,
  MAX(d.roster_size) AS roster_size
FROM public.team_score_daily_mv d
CROSS JOIN anchor a
WHERE d.day BETWEEN (a.max_day - 6) AND a.max_day
GROUP BY
  d.team_id,
  d.membership_team_id,
  d.team_slug,
  d.team_name,
  d.banner_url,
  d.image_url,
  a.max_day;

CREATE OR REPLACE VIEW public.team_score_all_time_view AS
WITH anchor AS (
  SELECT
    COALESCE(MIN(day), CURRENT_DATE) AS min_day,
    COALESCE(MAX(day), CURRENT_DATE) AS max_day
  FROM public.team_score_daily_mv
)
SELECT
  d.team_id,
  d.membership_team_id,
  d.team_slug,
  d.team_name,
  d.banner_url,
  d.image_url,
  a.min_day AS window_start_day,
  a.max_day AS window_end_day,
  SUM(d.activity_raw) AS activity_raw,
  SUM(d.participation_raw) AS participation_raw,
  SUM(d.gifting_raw) AS gifting_raw,
  SUM(d.presence_raw) AS presence_raw,
  SUM(d.activity_live_minutes) AS activity_live_minutes,
  SUM(d.activity_post_count) AS activity_post_count,
  SUM(d.participation_active_members) AS participation_active_members,
  SUM(d.participation_member_minutes) AS participation_member_minutes,
  SUM(d.presence_viewer_minutes) AS presence_viewer_minutes,
  SUM(d.presence_unique_viewers) AS presence_unique_viewers,
  MAX(d.last_event_at) AS last_event_at,
  MAX(d.roster_size) AS roster_size
FROM public.team_score_daily_mv d
CROSS JOIN anchor a
GROUP BY
  d.team_id,
  d.membership_team_id,
  d.team_slug,
  d.team_name,
  d.banner_url,
  d.image_url,
  a.min_day,
  a.max_day;

--------------------------------------------------------------------------------
-- Window computation helper
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.team_lb_compute_window(p_window text)
RETURNS TABLE(
  rank int,
  team_id uuid,
  membership_team_id uuid,
  team_slug text,
  team_name text,
  banner_url text,
  image_url text,
  roster_size int,
  window_start timestamptz,
  window_end timestamptz,
  last_event_at timestamptz,
  activity_raw numeric,
  participation_raw numeric,
  gifting_raw numeric,
  presence_raw numeric,
  activity_score numeric,
  participation_score numeric,
  gifting_score numeric,
  presence_score numeric,
  total_score numeric,
  breakdown jsonb,
  weight_version text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_window text;
  v_day date;
  v_weights record;
  v_weight_version text;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_source text;
BEGIN
  v_window := lower(p_window);
  IF v_window NOT IN ('daily','weekly','all_time') THEN
    RAISE EXCEPTION 'invalid_window';
  END IF;

  SELECT
    public.team_lb_get_config('team_lb_weight_activity', 0.35) AS w_activity,
    public.team_lb_get_config('team_lb_weight_participation', 0.25) AS w_participation,
    public.team_lb_get_config('team_lb_weight_gifting', 0.25) AS w_gifting,
    public.team_lb_get_config('team_lb_weight_presence', 0.15) AS w_presence,
    public.team_lb_get_config('team_lb_baseline_activity_' || v_window, 100) AS b_activity,
    public.team_lb_get_config('team_lb_baseline_participation_' || v_window, 10) AS b_participation,
    public.team_lb_get_config('team_lb_baseline_gifting_' || v_window, 1000) AS b_gifting,
    public.team_lb_get_config('team_lb_baseline_presence_' || v_window, 100) AS b_presence
  INTO v_weights;

  v_weight_version := md5(
    v_weights.w_activity::text || ':' ||
    v_weights.w_participation::text || ':' ||
    v_weights.w_gifting::text || ':' ||
    v_weights.w_presence::text || ':' ||
    v_weights.b_activity::text || ':' ||
    v_weights.b_participation::text || ':' ||
    v_weights.b_gifting::text || ':' ||
    v_weights.b_presence::text
  );

  IF v_window = 'daily' THEN
    SELECT MAX(day) INTO v_day FROM public.team_score_daily_mv;
    IF v_day IS NULL THEN
      RETURN;
    END IF;
    v_window_start := (v_day)::timestamptz AT TIME ZONE 'UTC';
    v_window_end := (v_day + 1)::timestamptz AT TIME ZONE 'UTC';

    RETURN QUERY
    WITH base AS (
      SELECT
        d.team_id,
        d.membership_team_id,
        d.team_slug,
        d.team_name,
        d.banner_url,
        d.image_url,
        d.roster_size,
        d.activity_raw,
        d.participation_raw,
        d.gifting_raw,
        d.presence_raw,
        d.last_event_at
      FROM public.team_score_daily_mv d
      WHERE d.day = v_day
    ),
    adjustments AS (
      SELECT
        team_id,
        SUM(CASE WHEN dimension = 'activity' THEN amount ELSE 0 END) AS adj_activity,
        SUM(CASE WHEN dimension = 'participation' THEN amount ELSE 0 END) AS adj_participation,
        SUM(CASE WHEN dimension = 'gifting' THEN amount ELSE 0 END) AS adj_gifting,
        SUM(CASE WHEN dimension = 'presence' THEN amount ELSE 0 END) AS adj_presence
      FROM public.team_score_adjustments
      WHERE applies_on = v_day
      GROUP BY team_id
    ),
    scored AS (
      SELECT
        b.team_id,
        b.membership_team_id,
        b.team_slug,
        b.team_name,
        b.banner_url,
        b.image_url,
        b.roster_size,
        v_window_start AS window_start,
        v_window_end AS window_end,
        b.last_event_at,
        (b.activity_raw + COALESCE(a.adj_activity, 0)) AS activity_raw,
        (b.participation_raw + COALESCE(a.adj_participation, 0)) AS participation_raw,
        (b.gifting_raw + COALESCE(a.adj_gifting, 0)) AS gifting_raw,
        (b.presence_raw + COALESCE(a.adj_presence, 0)) AS presence_raw
      FROM base b
      LEFT JOIN adjustments a ON a.team_id = b.team_id
    )
    SELECT
      RANK() OVER (ORDER BY total_score DESC, team_id) AS rank,
      scored.team_id,
      scored.membership_team_id,
      scored.team_slug,
      scored.team_name,
      scored.banner_url,
      scored.image_url,
      scored.roster_size,
      scored.window_start,
      scored.window_end,
      scored.last_event_at,
      scored.activity_raw,
      scored.participation_raw,
      scored.gifting_raw,
      scored.presence_raw,
      public.team_lb_norm(scored.activity_raw, v_weights.b_activity) AS activity_score,
      public.team_lb_norm(scored.participation_raw, v_weights.b_participation) AS participation_score,
      public.team_lb_norm(scored.gifting_raw, v_weights.b_gifting) AS gifting_score,
      public.team_lb_norm(scored.presence_raw, v_weights.b_presence) AS presence_score,
      ROUND(
        v_weights.w_activity * public.team_lb_norm(scored.activity_raw, v_weights.b_activity) +
        v_weights.w_participation * public.team_lb_norm(scored.participation_raw, v_weights.b_participation) +
        v_weights.w_gifting * public.team_lb_norm(scored.gifting_raw, v_weights.b_gifting) +
        v_weights.w_presence * public.team_lb_norm(scored.presence_raw, v_weights.b_presence),
        2
      ) AS total_score,
      jsonb_build_object(
        'activity', jsonb_build_object(
          'raw', scored.activity_raw,
          'normalized', public.team_lb_norm(scored.activity_raw, v_weights.b_activity),
          'weight', v_weights.w_activity
        ),
        'participation', jsonb_build_object(
          'raw', scored.participation_raw,
          'normalized', public.team_lb_norm(scored.participation_raw, v_weights.b_participation),
          'weight', v_weights.w_participation
        ),
        'gifting', jsonb_build_object(
          'raw', scored.gifting_raw,
          'normalized', public.team_lb_norm(scored.gifting_raw, v_weights.b_gifting),
          'weight', v_weights.w_gifting
        ),
        'presence', jsonb_build_object(
          'raw', scored.presence_raw,
          'normalized', public.team_lb_norm(scored.presence_raw, v_weights.b_presence),
          'weight', v_weights.w_presence
        )
      ) AS breakdown,
      v_weight_version AS weight_version
    FROM scored;

  ELSIF v_window = 'weekly' THEN
    RETURN QUERY
    WITH base AS (
      SELECT
        w.team_id,
        w.membership_team_id,
        w.team_slug,
        w.team_name,
        w.banner_url,
        w.image_url,
        w.window_start_day,
        w.window_end_day,
        (w.window_start_day)::timestamptz AT TIME ZONE 'UTC' AS window_start,
        (w.window_end_day + 1)::timestamptz AT TIME ZONE 'UTC' AS window_end,
        w.roster_size,
        w.last_event_at,
        w.activity_raw,
        w.participation_raw,
        w.gifting_raw,
        w.presence_raw
      FROM public.team_score_weekly_view w
    ),
    window_bounds AS (
      SELECT
        MIN(window_start_day) AS window_start_day,
        MAX(window_end_day) AS window_end_day
      FROM base
    ),
    adjustments AS (
      SELECT
        adj.team_id,
        SUM(CASE WHEN adj.dimension = 'activity' THEN adj.amount ELSE 0 END) AS adj_activity,
        SUM(CASE WHEN adj.dimension = 'participation' THEN adj.amount ELSE 0 END) AS adj_participation,
        SUM(CASE WHEN adj.dimension = 'gifting' THEN adj.amount ELSE 0 END) AS adj_gifting,
        SUM(CASE WHEN adj.dimension = 'presence' THEN adj.amount ELSE 0 END) AS adj_presence
      FROM public.team_score_adjustments adj
      CROSS JOIN window_bounds wb
      WHERE adj.applies_on BETWEEN wb.window_start_day AND wb.window_end_day
      GROUP BY adj.team_id
    ),
    adjusted AS (
      SELECT
        b.team_id,
        b.membership_team_id,
        b.team_slug,
        b.team_name,
        b.banner_url,
        b.image_url,
        b.window_start,
        b.window_end,
        b.roster_size,
        b.last_event_at,
        (b.activity_raw + COALESCE(a.adj_activity, 0)) AS activity_raw,
        (b.participation_raw + COALESCE(a.adj_participation, 0)) AS participation_raw,
        (b.gifting_raw + COALESCE(a.adj_gifting, 0)) AS gifting_raw,
        (b.presence_raw + COALESCE(a.adj_presence, 0)) AS presence_raw
      FROM base b
      LEFT JOIN adjustments a ON a.team_id = b.team_id
    ),
    scored AS (
      SELECT
        adj.*,
        public.team_lb_norm(adj.activity_raw, v_weights.b_activity) AS activity_score,
        public.team_lb_norm(adj.participation_raw, v_weights.b_participation) AS participation_score,
        public.team_lb_norm(adj.gifting_raw, v_weights.b_gifting) AS gifting_score,
        public.team_lb_norm(adj.presence_raw, v_weights.b_presence) AS presence_score
      FROM adjusted adj
    )
    SELECT
      RANK() OVER (ORDER BY total_score DESC, team_id) AS rank,
      team_id,
      membership_team_id,
      team_slug,
      team_name,
      banner_url,
      image_url,
      roster_size,
      window_start,
      window_end,
      last_event_at,
      activity_raw,
      participation_raw,
      gifting_raw,
      presence_raw,
      activity_score,
      participation_score,
      gifting_score,
      presence_score,
      ROUND(
        v_weights.w_activity * activity_score +
        v_weights.w_participation * participation_score +
        v_weights.w_gifting * gifting_score +
        v_weights.w_presence * presence_score,
        2
      ) AS total_score,
      jsonb_build_object(
        'activity', jsonb_build_object('raw', activity_raw, 'normalized', activity_score, 'weight', v_weights.w_activity),
        'participation', jsonb_build_object('raw', participation_raw, 'normalized', participation_score, 'weight', v_weights.w_participation),
        'gifting', jsonb_build_object('raw', gifting_raw, 'normalized', gifting_score, 'weight', v_weights.w_gifting),
        'presence', jsonb_build_object('raw', presence_raw, 'normalized', presence_score, 'weight', v_weights.w_presence)
      ) AS breakdown,
      v_weight_version AS weight_version
    FROM scored;

  ELSE
    RETURN QUERY
    WITH base AS (
      SELECT
        a.team_id,
        a.membership_team_id,
        a.team_slug,
        a.team_name,
        a.banner_url,
        a.image_url,
        a.window_start_day,
        a.window_end_day,
        (a.window_start_day)::timestamptz AT TIME ZONE 'UTC' AS window_start,
        (a.window_end_day + 1)::timestamptz AT TIME ZONE 'UTC' AS window_end,
        a.roster_size,
        a.last_event_at,
        a.activity_raw,
        a.participation_raw,
        a.gifting_raw,
        a.presence_raw
      FROM public.team_score_all_time_view a
    ),
    window_bounds AS (
      SELECT
        MIN(window_start_day) AS window_start_day,
        MAX(window_end_day) AS window_end_day
      FROM base
    ),
    adjustments AS (
      SELECT
        adj.team_id,
        SUM(CASE WHEN adj.dimension = 'activity' THEN adj.amount ELSE 0 END) AS adj_activity,
        SUM(CASE WHEN adj.dimension = 'participation' THEN adj.amount ELSE 0 END) AS adj_participation,
        SUM(CASE WHEN adj.dimension = 'gifting' THEN adj.amount ELSE 0 END) AS adj_gifting,
        SUM(CASE WHEN adj.dimension = 'presence' THEN adj.amount ELSE 0 END) AS adj_presence
      FROM public.team_score_adjustments adj
      CROSS JOIN window_bounds wb
      WHERE adj.applies_on BETWEEN wb.window_start_day AND wb.window_end_day
      GROUP BY adj.team_id
    ),
    adjusted AS (
      SELECT
        b.team_id,
        b.membership_team_id,
        b.team_slug,
        b.team_name,
        b.banner_url,
        b.image_url,
        b.window_start,
        b.window_end,
        b.roster_size,
        b.last_event_at,
        (b.activity_raw + COALESCE(a.adj_activity, 0)) AS activity_raw,
        (b.participation_raw + COALESCE(a.adj_participation, 0)) AS participation_raw,
        (b.gifting_raw + COALESCE(a.adj_gifting, 0)) AS gifting_raw,
        (b.presence_raw + COALESCE(a.adj_presence, 0)) AS presence_raw
      FROM base b
      LEFT JOIN adjustments a ON a.team_id = b.team_id
    ),
    scored AS (
      SELECT
        adj.*,
        public.team_lb_norm(adj.activity_raw, v_weights.b_activity) AS activity_score,
        public.team_lb_norm(adj.participation_raw, v_weights.b_participation) AS participation_score,
        public.team_lb_norm(adj.gifting_raw, v_weights.b_gifting) AS gifting_score,
        public.team_lb_norm(adj.presence_raw, v_weights.b_presence) AS presence_score
      FROM adjusted adj
    )
    SELECT
      RANK() OVER (ORDER BY total_score DESC, team_id) AS rank,
      team_id,
      membership_team_id,
      team_slug,
      team_name,
      banner_url,
      image_url,
      roster_size,
      window_start,
      window_end,
      last_event_at,
      activity_raw,
      participation_raw,
      gifting_raw,
      presence_raw,
      activity_score,
      participation_score,
      gifting_score,
      presence_score,
      ROUND(
        v_weights.w_activity * activity_score +
        v_weights.w_participation * participation_score +
        v_weights.w_gifting * gifting_score +
        v_weights.w_presence * presence_score,
        2
      ) AS total_score,
      jsonb_build_object(
        'activity', jsonb_build_object('raw', activity_raw, 'normalized', activity_score, 'weight', v_weights.w_activity),
        'participation', jsonb_build_object('raw', participation_raw, 'normalized', participation_score, 'weight', v_weights.w_participation),
        'gifting', jsonb_build_object('raw', gifting_raw, 'normalized', gifting_score, 'weight', v_weights.w_gifting),
        'presence', jsonb_build_object('raw', presence_raw, 'normalized', presence_score, 'weight', v_weights.w_presence)
      ) AS breakdown,
      v_weight_version AS weight_version
    FROM scored;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.team_lb_compute_window(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.team_lb_compute_window(text) TO anon, authenticated;

--------------------------------------------------------------------------------
-- Leaderboard cache adjustments (new keys + payload column)
--------------------------------------------------------------------------------

ALTER TABLE public.leaderboard_cache
  ADD COLUMN IF NOT EXISTS data jsonb;

ALTER TABLE public.leaderboard_cache
  DROP CONSTRAINT IF EXISTS leaderboard_cache_profile_id_fkey;

ALTER TABLE public.leaderboard_cache
  DROP CONSTRAINT IF EXISTS leaderboard_cache_leaderboard_type_check;

ALTER TABLE public.leaderboard_cache
  ADD CONSTRAINT leaderboard_cache_leaderboard_type_check
  CHECK (
    leaderboard_type IN (
      'top_streamers_daily',
      'top_streamers_weekly',
      'top_streamers_alltime',
      'top_gifters_daily',
      'top_gifters_weekly',
      'top_gifters_alltime',
      'team_lb:daily',
      'team_lb:weekly',
      'team_lb:all_time'
    )
  );

--------------------------------------------------------------------------------
-- Cache refresh helper
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.team_lb_refresh_cache(p_window text, p_limit int DEFAULT 200)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_window text := lower(p_window);
  v_lb_type text;
  v_limit int := GREATEST(1, LEAST(COALESCE(p_limit, 200), 1000));
BEGIN
  IF v_window NOT IN ('daily','weekly','all_time') THEN
    RAISE EXCEPTION 'invalid_window';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_lb_type := CASE v_window
    WHEN 'daily' THEN 'team_lb:daily'
    WHEN 'weekly' THEN 'team_lb:weekly'
    ELSE 'team_lb:all_time'
  END;

  DELETE FROM public.leaderboard_cache
  WHERE leaderboard_type = v_lb_type;

  INSERT INTO public.leaderboard_cache (
    leaderboard_type,
    profile_id,
    rank,
    metric_value,
    period_start,
    period_end,
    computed_at,
    data
  )
  SELECT
    v_lb_type,
    team_id,
    rank,
    ROUND(total_score * 100)::bigint,
    window_start,
    window_end,
    now(),
    jsonb_build_object(
      'team_slug', team_slug,
      'team_name', team_name,
      'banner_url', banner_url,
      'image_url', image_url,
      'roster_size', roster_size,
      'last_event_at', last_event_at,
      'total_score', total_score,
      'breakdown', breakdown,
      'weight_version', weight_version
    )
  FROM public.team_lb_compute_window(v_window)
  ORDER BY rank
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.team_lb_refresh_cache(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.team_lb_refresh_cache(text, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.team_lb_refresh_cache(text, int) TO postgres;

--------------------------------------------------------------------------------
-- RPC: rpc_get_team_leaderboard
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rpc_get_team_leaderboard(
  p_team_id uuid DEFAULT NULL,
  p_window text,
  p_limit int DEFAULT 50
)
RETURNS TABLE(
  rank int,
  team_id uuid,
  team_slug text,
  team_name text,
  banner_url text,
  image_url text,
  total_score numeric,
  breakdown jsonb,
  window_start timestamptz,
  window_end timestamptz,
  roster_size int,
  last_event_at timestamptz,
  highlight boolean,
  weight_version text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_window text := lower(p_window);
  v_limit int := GREATEST(1, LEAST(COALESCE(p_limit, 50), 100));
  v_lb_type text;
  v_cache_threshold interval;
  v_cache_ready boolean := false;
  v_cache_min timestamptz;
  v_cache_count int := 0;
  v_highlight_row public.team_lb_compute_window%ROWTYPE;
  v_have_highlight boolean := false;
BEGIN
  IF v_window NOT IN ('daily','weekly','all_time') THEN
    RAISE EXCEPTION 'invalid_window';
  END IF;

  v_lb_type := CASE v_window
    WHEN 'daily' THEN 'team_lb:daily'
    WHEN 'weekly' THEN 'team_lb:weekly'
    ELSE 'team_lb:all_time'
  END;

  v_cache_threshold := CASE v_window
    WHEN 'daily' THEN interval '20 minutes'
    WHEN 'weekly' THEN interval '2 hours'
    ELSE interval '6 hours'
  END;

  SELECT COUNT(*), MIN(computed_at)
  INTO v_cache_count, v_cache_min
  FROM public.leaderboard_cache
  WHERE leaderboard_type = v_lb_type;

  IF v_cache_count >= v_limit
     AND v_cache_min IS NOT NULL
     AND (now() - v_cache_min) <= v_cache_threshold THEN
    v_cache_ready := true;
  END IF;

  IF v_cache_ready THEN
    IF p_team_id IS NOT NULL THEN
      SELECT *
      INTO v_highlight_row
      FROM public.team_lb_compute_window(v_window)
      WHERE team_id = p_team_id
      LIMIT 1;

      v_have_highlight := FOUND;
    END IF;

    RETURN QUERY
    WITH cache AS (
      SELECT
        c.rank,
        c.profile_id AS team_id,
        (c.data->>'team_slug') AS team_slug,
        (c.data->>'team_name') AS team_name,
        (c.data->>'banner_url') AS banner_url,
        (c.data->>'image_url') AS image_url,
        ((c.data->>'total_score')::numeric) AS total_score,
        c.data->'breakdown' AS breakdown,
        c.period_start AS window_start,
        c.period_end AS window_end,
        (c.data->>'roster_size')::int AS roster_size,
        (c.data->>'last_event_at')::timestamptz AS last_event_at,
        (c.data->>'weight_version') AS weight_version
      FROM public.leaderboard_cache c
      WHERE c.leaderboard_type = v_lb_type
      ORDER BY c.rank
      LIMIT v_limit
    ),
    highlighted AS (
      SELECT
        v_highlight_row.rank,
        v_highlight_row.team_id,
        v_highlight_row.team_slug,
        v_highlight_row.team_name,
        v_highlight_row.banner_url,
        v_highlight_row.image_url,
        v_highlight_row.total_score,
        v_highlight_row.breakdown,
        v_highlight_row.window_start,
        v_highlight_row.window_end,
        v_highlight_row.roster_size,
        v_highlight_row.last_event_at,
        v_highlight_row.weight_version
      WHERE v_have_highlight
    ),
    combined AS (
      SELECT
        cache.rank,
        cache.team_id,
        cache.team_slug,
        cache.team_name,
        cache.banner_url,
        cache.image_url,
        cache.total_score,
        cache.breakdown,
        cache.window_start,
        cache.window_end,
        cache.roster_size,
        cache.last_event_at,
        false AS highlight,
        cache.weight_version
      FROM cache
      UNION ALL
      SELECT
        h.rank,
        h.team_id,
        h.team_slug,
        h.team_name,
        h.banner_url,
        h.image_url,
        h.total_score,
        h.breakdown,
        h.window_start,
        h.window_end,
        h.roster_size,
        h.last_event_at,
        true AS highlight,
        h.weight_version
      FROM highlighted h
      WHERE NOT EXISTS (
        SELECT 1 FROM cache c WHERE c.team_id = h.team_id
      )
    )
    SELECT
      rank,
      team_id,
      team_slug,
      team_name,
      banner_url,
      image_url,
      total_score,
      breakdown,
      window_start,
      window_end,
      roster_size,
      last_event_at,
      highlight OR (team_id = p_team_id) AS highlight,
      weight_version
    FROM combined
    ORDER BY rank, highlight DESC;
  ELSE
    RETURN QUERY
    WITH computed AS (
      SELECT * FROM public.team_lb_compute_window(v_window)
    ),
    limited AS (
      SELECT * FROM computed WHERE rank <= v_limit
    ),
    highlighted AS (
      SELECT * FROM computed WHERE p_team_id IS NOT NULL AND team_id = p_team_id
    ),
    combined AS (
      SELECT * FROM limited
      UNION ALL
      SELECT * FROM highlighted h
      WHERE NOT EXISTS (SELECT 1 FROM limited l WHERE l.team_id = h.team_id)
    )
    SELECT
      rank,
      team_id,
      team_slug,
      team_name,
      banner_url,
      image_url,
      total_score,
      breakdown,
      window_start,
      window_end,
      roster_size,
      last_event_at,
      (team_id = p_team_id) AS highlight,
      weight_version
    FROM combined
    ORDER BY rank, highlight DESC;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_get_team_leaderboard(uuid, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_team_leaderboard(uuid, text, int) TO anon, authenticated;

COMMIT;
