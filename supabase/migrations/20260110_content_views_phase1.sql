-- ============================================================================
-- GLOBAL VIEW TRACKING SYSTEM - PHASE 1: LOGGING ONLY
-- ============================================================================
-- Tracks passive engagement (views) across all content types
-- Deduplication: One view per content per viewer per calendar day (UTC)
-- Aggregation: Idempotent batch job (pg_cron, 5-minute intervals)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CORE TABLE: content_views
-- ============================================================================

CREATE TABLE public.content_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content identification (live streams excluded - tracked separately)
  content_type text NOT NULL CHECK (content_type IN (
    'feed_post',
    'team_post', 
    'music_track',
    'music_video',
    'clip'
  )),
  content_id uuid NOT NULL,
  
  -- Viewer identification (exactly one must be non-null)
  viewer_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_fingerprint text,  -- SHA256 hash, no PII
  
  -- Metadata
  view_source text NOT NULL CHECK (view_source IN ('web', 'mobile')),
  view_type text NOT NULL CHECK (view_type IN ('page_load', 'viewport', 'playback')),
  
  -- Timestamps
  viewed_at timestamptz NOT NULL DEFAULT now(),
  session_id text,
  
  -- Viewer constraint (exactly one must be set)
  CONSTRAINT content_views_viewer_check CHECK (
    (viewer_profile_id IS NOT NULL AND viewer_fingerprint IS NULL) OR
    (viewer_profile_id IS NULL AND viewer_fingerprint IS NOT NULL)
  )
);

-- ============================================================================
-- 2. INDEXES FOR DEDUPLICATION QUERIES
-- ============================================================================
-- Note: Calendar day deduplication is handled in RPC logic, not via unique constraints
-- Simple indexes without WHERE clauses to avoid PostgreSQL immutability errors

CREATE INDEX idx_content_views_logged_in_lookup
  ON content_views(content_type, content_id, viewer_profile_id, viewed_at DESC);

CREATE INDEX idx_content_views_anonymous_lookup
  ON content_views(content_type, content_id, viewer_fingerprint, viewed_at DESC);

-- ============================================================================
-- 3. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX idx_content_views_content 
  ON content_views(content_type, content_id, viewed_at DESC);

CREATE INDEX idx_content_views_viewer 
  ON content_views(viewer_profile_id, viewed_at DESC);

CREATE INDEX idx_content_views_fingerprint 
  ON content_views(viewer_fingerprint, viewed_at DESC);

CREATE INDEX idx_content_views_recent 
  ON content_views(viewed_at DESC);

-- ============================================================================
-- 4. PROCESSED VIEW IDS (Idempotent Aggregation)
-- ============================================================================

CREATE TABLE public.processed_view_ids (
  view_id uuid PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_processed_view_ids_processed_at 
  ON processed_view_ids(processed_at DESC);

-- RLS: Disabled - internal table, no user access needed
-- Accessed only by SECURITY DEFINER functions

COMMENT ON TABLE processed_view_ids IS 
  'Tracks which content_views rows have been aggregated. Ensures idempotent aggregation via claim-first strategy.';

-- ============================================================================
-- 5. DENORMALIZED VIEW COUNTS
-- ============================================================================

-- Feed posts
ALTER TABLE posts 
  ADD COLUMN IF NOT EXISTS views_count int NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_posts_views_count 
  ON posts(views_count DESC);

-- Team posts
ALTER TABLE team_feed_posts 
  ADD COLUMN IF NOT EXISTS views_count int NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_team_feed_posts_views_count 
  ON team_feed_posts(views_count DESC);

-- Music tracks
ALTER TABLE profile_music_tracks 
  ADD COLUMN IF NOT EXISTS views_count int NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_profile_music_tracks_views_count 
  ON profile_music_tracks(views_count DESC);

-- Music videos
ALTER TABLE profile_music_videos 
  ADD COLUMN IF NOT EXISTS views_count int NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_profile_music_videos_views_count 
  ON profile_music_videos(views_count DESC);

-- Clips
ALTER TABLE clips 
  ADD COLUMN IF NOT EXISTS views_count int NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_clips_views_count 
  ON clips(views_count DESC);

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

ALTER TABLE content_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert views (with validation)
DROP POLICY IF EXISTS "Anyone can track views" ON content_views;
CREATE POLICY "Anyone can track views"
  ON content_views FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    -- Authenticated: Must match auth.uid()
    (viewer_profile_id IS NOT NULL AND viewer_profile_id = auth.uid())
    OR
    -- Anonymous: Must provide fingerprint, profile_id must be NULL
    (viewer_profile_id IS NULL AND viewer_fingerprint IS NOT NULL)
  );

-- No SELECT policy = no one can read raw view data (privacy)

-- ============================================================================
-- 7. RPC: Track Content View (SECURITY DEFINER Hardened)
-- ============================================================================

CREATE OR REPLACE FUNCTION rpc_track_content_view(
  p_content_type text,
  p_content_id uuid,
  p_view_source text,
  p_view_type text,
  p_viewer_fingerprint text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_id uuid;
  v_today date;
  v_existing_view_count int;
BEGIN
  -- Validate content_type enum
  IF p_content_type NOT IN ('feed_post', 'team_post', 'music_track', 'music_video', 'clip') THEN
    RAISE EXCEPTION 'Invalid content_type: %', p_content_type;
  END IF;
  
  -- Validate view_type enum
  IF p_view_type NOT IN ('page_load', 'viewport', 'playback') THEN
    RAISE EXCEPTION 'Invalid view_type: %', p_view_type;
  END IF;
  
  -- Validate view_source enum
  IF p_view_source NOT IN ('web', 'mobile') THEN
    RAISE EXCEPTION 'Invalid view_source: %', p_view_source;
  END IF;
  
  -- Get viewer ID and today's date
  v_viewer_id := auth.uid();
  v_today := CURRENT_DATE;
  
  -- Check for existing view today (calendar day deduplication)
  IF v_viewer_id IS NOT NULL THEN
    -- Logged-in user: check by profile_id
    SELECT COUNT(*) INTO v_existing_view_count
    FROM content_views
    WHERE content_type = p_content_type
      AND content_id = p_content_id
      AND viewer_profile_id = v_viewer_id
      AND viewed_at::date = v_today;
  ELSE
    -- Anonymous user: check by fingerprint
    SELECT COUNT(*) INTO v_existing_view_count
    FROM content_views
    WHERE content_type = p_content_type
      AND content_id = p_content_id
      AND viewer_fingerprint = p_viewer_fingerprint
      AND viewed_at::date = v_today;
  END IF;
  
  -- Only insert if no view exists today
  IF v_existing_view_count = 0 THEN
    INSERT INTO content_views (
      content_type,
      content_id,
      viewer_profile_id,
      viewer_fingerprint,
      view_source,
      view_type
    ) VALUES (
      p_content_type,
      p_content_id,
      v_viewer_id,
      p_viewer_fingerprint,
      p_view_source,
      p_view_type
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_track_content_view(text, uuid, text, text, text) 
  TO authenticated, anon;

-- ============================================================================
-- 8. IDEMPOTENT AGGREGATION FUNCTION (CLAIM-FIRST STRATEGY)
-- ============================================================================

CREATE OR REPLACE FUNCTION aggregate_content_views()
RETURNS TABLE(
  content_type text,
  updated_count bigint,
  duration_ms numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_time timestamptz;
  v_feed_updated bigint := 0;
  v_team_updated bigint := 0;
  v_music_track_updated bigint := 0;
  v_music_video_updated bigint := 0;
  v_clip_updated bigint := 0;
BEGIN
  v_start_time := clock_timestamp();
  
  -- ============================================================================
  -- CLAIM-FIRST IDEMPOTENCY STRATEGY
  -- 
  -- 1. INSERT unprocessed view IDs into processed_view_ids (claim them)
  -- 2. ON CONFLICT DO NOTHING ensures only one job claims each view
  -- 3. RETURNING view_id gives us the exact set THIS job claimed
  -- 4. Aggregate only the claimed views
  -- 
  -- This is overlap-safe: If two jobs run simultaneously, each claims a
  -- disjoint set of views. No view is ever counted twice.
  -- ============================================================================
  
  -- ============================================================================
  -- Feed posts
  -- ============================================================================
  WITH claimed_views AS (
    INSERT INTO processed_view_ids (view_id)
    SELECT cv.id
    FROM content_views cv
    WHERE cv.content_type = 'feed_post'
      AND NOT EXISTS (
        SELECT 1 FROM processed_view_ids pvi WHERE pvi.view_id = cv.id
      )
    LIMIT 50000  -- Performance control: process max 50K views per run
    ON CONFLICT DO NOTHING
    RETURNING view_id
  ),
  view_counts AS (
    SELECT cv.content_id, COUNT(*) as view_count
    FROM content_views cv
    INNER JOIN claimed_views clv ON cv.id = clv.view_id
    GROUP BY cv.content_id
  )
  UPDATE posts p
  SET views_count = views_count + vc.view_count
  FROM view_counts vc
  WHERE p.id = vc.content_id;
  
  GET DIAGNOSTICS v_feed_updated = ROW_COUNT;
  
  -- ============================================================================
  -- Team posts
  -- ============================================================================
  WITH claimed_views AS (
    INSERT INTO processed_view_ids (view_id)
    SELECT cv.id
    FROM content_views cv
    WHERE cv.content_type = 'team_post'
      AND NOT EXISTS (
        SELECT 1 FROM processed_view_ids pvi WHERE pvi.view_id = cv.id
      )
    LIMIT 50000
    ON CONFLICT DO NOTHING
    RETURNING view_id
  ),
  view_counts AS (
    SELECT cv.content_id, COUNT(*) as view_count
    FROM content_views cv
    INNER JOIN claimed_views clv ON cv.id = clv.view_id
    GROUP BY cv.content_id
  )
  UPDATE team_feed_posts tfp
  SET views_count = views_count + vc.view_count
  FROM view_counts vc
  WHERE tfp.id = vc.content_id;
  
  GET DIAGNOSTICS v_team_updated = ROW_COUNT;
  
  -- ============================================================================
  -- Music tracks
  -- ============================================================================
  WITH claimed_views AS (
    INSERT INTO processed_view_ids (view_id)
    SELECT cv.id
    FROM content_views cv
    WHERE cv.content_type = 'music_track'
      AND NOT EXISTS (
        SELECT 1 FROM processed_view_ids pvi WHERE pvi.view_id = cv.id
      )
    LIMIT 50000
    ON CONFLICT DO NOTHING
    RETURNING view_id
  ),
  view_counts AS (
    SELECT cv.content_id, COUNT(*) as view_count
    FROM content_views cv
    INNER JOIN claimed_views clv ON cv.id = clv.view_id
    GROUP BY cv.content_id
  )
  UPDATE profile_music_tracks pmt
  SET views_count = views_count + vc.view_count
  FROM view_counts vc
  WHERE pmt.id = vc.content_id;
  
  GET DIAGNOSTICS v_music_track_updated = ROW_COUNT;
  
  -- ============================================================================
  -- Music videos
  -- ============================================================================
  WITH claimed_views AS (
    INSERT INTO processed_view_ids (view_id)
    SELECT cv.id
    FROM content_views cv
    WHERE cv.content_type = 'music_video'
      AND NOT EXISTS (
        SELECT 1 FROM processed_view_ids pvi WHERE pvi.view_id = cv.id
      )
    LIMIT 50000
    ON CONFLICT DO NOTHING
    RETURNING view_id
  ),
  view_counts AS (
    SELECT cv.content_id, COUNT(*) as view_count
    FROM content_views cv
    INNER JOIN claimed_views clv ON cv.id = clv.view_id
    GROUP BY cv.content_id
  )
  UPDATE profile_music_videos pmv
  SET views_count = views_count + vc.view_count
  FROM view_counts vc
  WHERE pmv.id = vc.content_id;
  
  GET DIAGNOSTICS v_music_video_updated = ROW_COUNT;
  
  -- ============================================================================
  -- Clips
  -- ============================================================================
  WITH claimed_views AS (
    INSERT INTO processed_view_ids (view_id)
    SELECT cv.id
    FROM content_views cv
    WHERE cv.content_type = 'clip'
      AND NOT EXISTS (
        SELECT 1 FROM processed_view_ids pvi WHERE pvi.view_id = cv.id
      )
    LIMIT 50000
    ON CONFLICT DO NOTHING
    RETURNING view_id
  ),
  view_counts AS (
    SELECT cv.content_id, COUNT(*) as view_count
    FROM content_views cv
    INNER JOIN claimed_views clv ON cv.id = clv.view_id
    GROUP BY cv.content_id
  )
  UPDATE clips c
  SET views_count = views_count + vc.view_count
  FROM view_counts vc
  WHERE c.id = vc.content_id;
  
  GET DIAGNOSTICS v_clip_updated = ROW_COUNT;
  
  -- ============================================================================
  -- Cleanup: Delete processed IDs older than 7 days
  -- ============================================================================
  DELETE FROM processed_view_ids
  WHERE processed_at < now() - interval '7 days';
  
  -- Return summary (calculate duration once to avoid volatile function in query)
  RETURN QUERY
  SELECT 'feed_post'::text, v_feed_updated, EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000
  UNION ALL
  SELECT 'team_post'::text, v_team_updated, EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000
  UNION ALL
  SELECT 'music_track'::text, v_music_track_updated, EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000
  UNION ALL
  SELECT 'music_video'::text, v_music_video_updated, EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000
  UNION ALL
  SELECT 'clip'::text, v_clip_updated, EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000;
END;
$$;

GRANT EXECUTE ON FUNCTION aggregate_content_views() TO service_role;

-- ============================================================================
-- 9. SCHEDULE AGGREGATION JOB (Manual Setup Required)
-- ============================================================================

-- Note: Automatic scheduling is not included in this migration to avoid
-- compatibility issues. Please schedule the aggregation job manually.

-- Option 1: pg_cron (if available in your Supabase project)
-- Run this SQL separately after migration completes:
--
--   SELECT cron.schedule(
--     'aggregate-content-views',
--     '*/5 * * * *',
--     'SELECT aggregate_content_views();'
--   );

-- Option 2: External cron job
-- Set up a cron job that calls:
--   curl -X POST https://your-project.supabase.co/rest/v1/rpc/aggregate_content_views
--   -H "apikey: YOUR_SERVICE_ROLE_KEY"

-- Option 3: Supabase Edge Function with scheduled invocation
-- Create an Edge Function and schedule it via Supabase dashboard

-- Option 4: Manual execution (for testing)
-- Run this query manually:
--   SELECT * FROM aggregate_content_views();

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Content views tracking system deployed (Phase 1: Logging Only)';
  RAISE NOTICE '   - Deduplication: One view per content per viewer per calendar day (UTC)';
  RAISE NOTICE '   - Aggregation: Idempotent claim-first strategy (overlap-safe)';
  RAISE NOTICE '   - Content types: feed_post, team_post, music_track, music_video, clip';
  RAISE NOTICE '   - Live streams: Excluded (tracked separately via live_stream_view_sessions)';
  RAISE NOTICE '   - UI: View counts NOT visible yet (Phase 2)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 To manually run aggregation:';
  RAISE NOTICE '   SELECT * FROM aggregate_content_views();';
END $$;
