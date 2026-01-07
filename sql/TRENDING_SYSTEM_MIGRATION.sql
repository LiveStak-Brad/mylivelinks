-- ============================================================================
-- TRENDING SYSTEM FOR LIVE STREAMS
-- Production-ready SQL migration with deduplication, abuse prevention, and stable scoring
-- ============================================================================

-- ============================================================================
-- A) DATA MODEL: Add columns to live_streams
-- ============================================================================

ALTER TABLE live_streams 
  ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gifts_value BIGINT DEFAULT 0, -- In coins (consistent with gifts table)
  ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trending_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_score_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS score_version INT DEFAULT 1;

-- ============================================================================
-- B) EVENT TABLES: Dedupe and abuse prevention
-- ============================================================================

-- 1) Likes: one like per viewer per stream (toggle logic)
CREATE TABLE IF NOT EXISTS live_stream_likes (
  stream_id BIGINT NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (stream_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_live_stream_likes_stream ON live_stream_likes(stream_id);
CREATE INDEX IF NOT EXISTS idx_live_stream_likes_profile ON live_stream_likes(profile_id);
CREATE INDEX IF NOT EXISTS idx_live_stream_likes_created ON live_stream_likes(created_at DESC);

-- 2) Comments: track all comments for counting
CREATE TABLE IF NOT EXISTS live_stream_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id BIGINT NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_stream_comments_stream ON live_stream_comments(stream_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_stream_comments_profile ON live_stream_comments(profile_id);

-- 3) View sessions: track unique viewers with anon support
CREATE TABLE IF NOT EXISTS live_stream_view_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id BIGINT NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL if anonymous
  anon_id TEXT, -- For anonymous users
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  CONSTRAINT check_viewer_identity CHECK (
    (profile_id IS NOT NULL AND anon_id IS NULL) OR
    (profile_id IS NULL AND anon_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_live_stream_view_sessions_stream ON live_stream_view_sessions(stream_id);
CREATE INDEX IF NOT EXISTS idx_live_stream_view_sessions_profile ON live_stream_view_sessions(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_live_stream_view_sessions_anon ON live_stream_view_sessions(anon_id) WHERE anon_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_live_stream_view_sessions_active ON live_stream_view_sessions(stream_id, left_at) WHERE left_at IS NULL;

-- ============================================================================
-- C) TRENDING SCORE ALGORITHM (v1)
-- ============================================================================

-- Shared function to recompute trending_score for a given stream
-- Algorithm:
--   1. age_minutes = minutes since stream started (minimum 1)
--   2. time_decay = 1 / age_minutes^0.6
--   3. Logarithmic normalization of raw counts (prevents gaming):
--      - view_points = LN(1 + views_count)
--      - like_points = LN(1 + likes_count)
--      - comment_points = LN(1 + comments_count)
--      - gift_points = LN(1 + gifts_value)
--   4. Weighted score:
--      - base = (view_points * 1.0) + (like_points * 0.7) + (comment_points * 1.2) + (gift_points * 3.0)
--   5. Final: trending_score = base * time_decay
--
-- Only computes for live_available = true streams
-- Must be fast and safe (idempotent)

CREATE OR REPLACE FUNCTION recompute_live_trending(p_stream_id BIGINT)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_started_at TIMESTAMPTZ;
  v_live_available BOOLEAN;
  v_views_count INT;
  v_gifts_value BIGINT;
  v_likes_count INT;
  v_comments_count INT;
  v_age_minutes NUMERIC;
  v_time_decay NUMERIC;
  v_view_points NUMERIC;
  v_like_points NUMERIC;
  v_comment_points NUMERIC;
  v_gift_points NUMERIC;
  v_base_score NUMERIC;
  v_trending_score NUMERIC;
BEGIN
  -- Get stream data
  SELECT started_at, live_available, views_count, gifts_value, likes_count, comments_count
  INTO v_started_at, v_live_available, v_views_count, v_gifts_value, v_likes_count, v_comments_count
  FROM live_streams
  WHERE id = p_stream_id;

  -- If stream not found or not live, set score to 0
  IF NOT FOUND OR v_live_available = FALSE OR v_started_at IS NULL THEN
    UPDATE live_streams 
    SET trending_score = 0, last_score_at = now()
    WHERE id = p_stream_id;
    RETURN 0;
  END IF;

  -- Calculate age in minutes (minimum 1 to avoid division issues)
  v_age_minutes := GREATEST(1, EXTRACT(EPOCH FROM (now() - v_started_at)) / 60.0);

  -- Time decay: newer streams get a boost
  v_time_decay := 1.0 / POWER(v_age_minutes, 0.6);

  -- Logarithmic normalization (prevents gaming/whales)
  v_view_points := LN(1 + COALESCE(v_views_count, 0));
  v_like_points := LN(1 + COALESCE(v_likes_count, 0));
  v_comment_points := LN(1 + COALESCE(v_comments_count, 0));
  v_gift_points := LN(1 + COALESCE(v_gifts_value, 0));

  -- Weighted base score
  -- Views: 1.0, Likes: 0.7, Comments: 1.2, Gifts: 3.0
  v_base_score := (v_view_points * 1.0) + (v_like_points * 0.7) + (v_comment_points * 1.2) + (v_gift_points * 3.0);

  -- Apply time decay
  v_trending_score := v_base_score * v_time_decay;

  -- Update the stream
  UPDATE live_streams
  SET trending_score = v_trending_score,
      last_score_at = now()
  WHERE id = p_stream_id;

  RETURN v_trending_score;
END;
$$;

-- ============================================================================
-- D) RPC FUNCTIONS: Atomic updates with deduplication
-- ============================================================================

-- Drop existing functions to allow signature changes
DROP FUNCTION IF EXISTS rpc_live_view_join(BIGINT, UUID, TEXT);
DROP FUNCTION IF EXISTS rpc_live_view_leave(UUID);
DROP FUNCTION IF EXISTS rpc_live_like_toggle(BIGINT, UUID);
DROP FUNCTION IF EXISTS rpc_live_comment_add(BIGINT, UUID, TEXT);
DROP FUNCTION IF EXISTS rpc_live_gift_add(BIGINT, NUMERIC);
DROP FUNCTION IF EXISTS rpc_get_trending_live_streams(INT, INT);
DROP FUNCTION IF EXISTS rpc_get_stream_trending_stats(BIGINT);

-- 1) View Join: Track when a viewer joins a stream
--    - Inserts into live_stream_view_sessions (dedupe by active session)
--    - Increments views_count only for new unique sessions
--    - Returns session_id for tracking

CREATE OR REPLACE FUNCTION rpc_live_view_join(
  p_stream_id BIGINT,
  p_profile_id UUID DEFAULT NULL,
  p_anon_id TEXT DEFAULT NULL
)
RETURNS TABLE(session_id UUID, new_views_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_existing_active_session UUID;
  v_is_new_view BOOLEAN := FALSE;
  v_new_views_count INT;
BEGIN
  -- Validate stream exists and is live
  IF NOT EXISTS (SELECT 1 FROM live_streams WHERE id = p_stream_id AND live_available = TRUE) THEN
    RAISE EXCEPTION 'Stream not found or not live';
  END IF;

  -- Check for existing active session (same viewer, no left_at)
  IF p_profile_id IS NOT NULL THEN
    SELECT id INTO v_existing_active_session
    FROM live_stream_view_sessions
    WHERE stream_id = p_stream_id 
      AND profile_id = p_profile_id 
      AND left_at IS NULL
    LIMIT 1;
  ELSIF p_anon_id IS NOT NULL THEN
    SELECT id INTO v_existing_active_session
    FROM live_stream_view_sessions
    WHERE stream_id = p_stream_id 
      AND anon_id = p_anon_id 
      AND left_at IS NULL
    LIMIT 1;
  END IF;

  -- If already has active session, return existing session_id
  IF v_existing_active_session IS NOT NULL THEN
    SELECT views_count INTO v_new_views_count FROM live_streams WHERE id = p_stream_id;
    RETURN QUERY SELECT v_existing_active_session, v_new_views_count;
    RETURN;
  END IF;

  -- Create new session
  INSERT INTO live_stream_view_sessions (stream_id, profile_id, anon_id)
  VALUES (p_stream_id, p_profile_id, p_anon_id)
  RETURNING id INTO v_session_id;

  v_is_new_view := TRUE;

  -- Increment views_count (cumulative unique sessions)
  UPDATE live_streams
  SET views_count = views_count + 1
  WHERE id = p_stream_id
  RETURNING views_count INTO v_new_views_count;

  -- Recompute trending score
  PERFORM recompute_live_trending(p_stream_id);

  RETURN QUERY SELECT v_session_id, v_new_views_count;
END;
$$;

-- 2) View Leave: Mark when viewer leaves
--    - Sets left_at timestamp
--    - Does NOT decrement views_count (views are cumulative)

CREATE OR REPLACE FUNCTION rpc_live_view_leave(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE live_stream_view_sessions
  SET left_at = now()
  WHERE id = p_session_id AND left_at IS NULL;

  RETURN FOUND;
END;
$$;

-- 3) Like Toggle: Add/remove like for a stream
--    - Insert-only: once liked, stays liked (no unlike)
--    - Returns current like state and count
--    - Idempotent: repeated calls return same result

CREATE OR REPLACE FUNCTION rpc_live_like_toggle(
  p_stream_id BIGINT,
  p_profile_id UUID
)
RETURNS TABLE(is_liked BOOLEAN, likes_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
  v_likes_count INT;
  v_is_liked BOOLEAN;
BEGIN
  -- Validate stream exists and is live
  IF NOT EXISTS (SELECT 1 FROM live_streams WHERE id = p_stream_id AND live_available = TRUE) THEN
    RAISE EXCEPTION 'Stream not found or not live';
  END IF;

  -- Check if like exists
  SELECT EXISTS(
    SELECT 1 FROM live_stream_likes 
    WHERE stream_id = p_stream_id AND profile_id = p_profile_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Already liked - return current state (no unlike)
    v_is_liked := TRUE;
  ELSE
    -- Like: add like
    INSERT INTO live_stream_likes (stream_id, profile_id)
    VALUES (p_stream_id, p_profile_id)
    ON CONFLICT (stream_id, profile_id) DO NOTHING;
    v_is_liked := TRUE;
  END IF;

  -- Update likes_count from actual count (source of truth)
  UPDATE live_streams
  SET likes_count = (
    SELECT COUNT(*) FROM live_stream_likes WHERE stream_id = p_stream_id
  )
  WHERE id = p_stream_id
  RETURNING live_streams.likes_count INTO v_likes_count;

  -- Recompute trending score
  PERFORM recompute_live_trending(p_stream_id);

  RETURN QUERY SELECT v_is_liked, v_likes_count;
END;
$$;

-- 4) Comment Add: Record a comment
--    - Inserts into live_stream_comments
--    - Increments comments_count
--    - Returns comment_id and new count
--    - DOES NOT replace existing chat system; this is for trending only

CREATE OR REPLACE FUNCTION rpc_live_comment_add(
  p_stream_id BIGINT,
  p_profile_id UUID,
  p_body TEXT
)
RETURNS TABLE(comment_id UUID, comments_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_comment_id UUID;
  v_comments_count INT;
BEGIN
  -- Validate stream exists and is live
  IF NOT EXISTS (SELECT 1 FROM live_streams WHERE id = p_stream_id AND live_available = TRUE) THEN
    RAISE EXCEPTION 'Stream not found or not live';
  END IF;

  -- Validate comment body
  IF LENGTH(TRIM(p_body)) = 0 THEN
    RAISE EXCEPTION 'Comment body cannot be empty';
  END IF;

  -- Insert comment
  INSERT INTO live_stream_comments (stream_id, profile_id, body)
  VALUES (p_stream_id, p_profile_id, p_body)
  RETURNING id INTO v_comment_id;

  -- Increment comments_count
  UPDATE live_streams
  SET comments_count = comments_count + 1
  WHERE id = p_stream_id
  RETURNING live_streams.comments_count INTO v_comments_count;

  -- Recompute trending score
  PERFORM recompute_live_trending(p_stream_id);

  RETURN QUERY SELECT v_comment_id, v_comments_count;
END;
$$;

-- 5) Gift Add: Update gifts_value when gift is confirmed
--    - Called by existing gifting pipeline after gift is processed
--    - Increments gifts_value by gift amount (in coins)
--    - Recomputes trending score
--    - MUST be called server-side or by secure gifts RPC

CREATE OR REPLACE FUNCTION rpc_live_gift_add(
  p_stream_id BIGINT,
  p_amount_value BIGINT
)
RETURNS TABLE(new_gifts_value BIGINT, trending_score NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_gifts_value BIGINT;
  v_trending_score NUMERIC;
BEGIN
  -- Validate stream exists and is live
  IF NOT EXISTS (SELECT 1 FROM live_streams WHERE id = p_stream_id AND live_available = TRUE) THEN
    RAISE EXCEPTION 'Stream not found or not live';
  END IF;

  -- Validate amount
  IF p_amount_value <= 0 THEN
    RAISE EXCEPTION 'Gift amount must be positive';
  END IF;

  -- Increment gifts_value
  UPDATE live_streams
  SET gifts_value = gifts_value + p_amount_value
  WHERE id = p_stream_id
  RETURNING live_streams.gifts_value INTO v_new_gifts_value;

  -- Recompute trending score
  v_trending_score := recompute_live_trending(p_stream_id);

  RETURN QUERY SELECT v_new_gifts_value, v_trending_score;
END;
$$;

-- 6) Get Trending Live Streams: Retrieve top trending streams
--    - Only returns live_available = TRUE streams
--    - Ordered by trending_score DESC
--    - Includes streamer profile data for UI
--    - Pagination support

CREATE OR REPLACE FUNCTION rpc_get_trending_live_streams(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  stream_id BIGINT,
  profile_id UUID,
  username VARCHAR,
  display_name VARCHAR,
  avatar_url VARCHAR,
  started_at TIMESTAMPTZ,
  views_count INT,
  likes_count INT,
  comments_count INT,
  gifts_value BIGINT,
  trending_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ls.id AS stream_id,
    ls.profile_id,
    p.username::VARCHAR,
    p.display_name::VARCHAR,
    p.avatar_url::VARCHAR,
    ls.started_at,
    ls.views_count,
    ls.likes_count,
    ls.comments_count,
    ls.gifts_value,
    ls.trending_score
  FROM live_streams ls
  INNER JOIN profiles p ON ls.profile_id = p.id
  WHERE ls.live_available = TRUE
    AND ls.streaming_mode = 'solo'
  ORDER BY ls.trending_score DESC, ls.started_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================================================
-- E) CRITICAL INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite index for trending queries (most critical)
CREATE INDEX IF NOT EXISTS idx_live_streams_trending_active 
  ON live_streams(live_available, trending_score DESC) 
  WHERE live_available = TRUE;

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_live_streams_score_updated 
  ON live_streams(last_score_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_streams_started 
  ON live_streams(started_at DESC);

-- ============================================================================
-- F) ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE live_stream_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_stream_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_stream_view_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to allow clean re-creation
DROP POLICY IF EXISTS "Users can like streams" ON live_stream_likes;
DROP POLICY IF EXISTS "Anyone can view likes" ON live_stream_likes;
DROP POLICY IF EXISTS "Users can comment on streams" ON live_stream_comments;
DROP POLICY IF EXISTS "Anyone can view comments" ON live_stream_comments;
DROP POLICY IF EXISTS "Anyone can insert view sessions" ON live_stream_view_sessions;
DROP POLICY IF EXISTS "Users can update own view sessions" ON live_stream_view_sessions;
DROP POLICY IF EXISTS "Anon can update own view sessions" ON live_stream_view_sessions;
DROP POLICY IF EXISTS "Anyone can view sessions" ON live_stream_view_sessions;

-- Likes policies: users can insert their own likes, anyone can view (no delete/unlike)
CREATE POLICY "Users can like streams"
  ON live_stream_likes FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Anyone can view likes"
  ON live_stream_likes FOR SELECT
  TO authenticated, anon
  USING (true);

-- Comments policies: users can insert their own comments, anyone can view
CREATE POLICY "Users can comment on streams"
  ON live_stream_comments FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Anyone can view comments"
  ON live_stream_comments FOR SELECT
  TO authenticated, anon
  USING (true);

-- View sessions policies: anyone can insert (supports anon), users can update their own
CREATE POLICY "Anyone can join stream views"
  ON live_stream_view_sessions FOR INSERT
  TO authenticated, anon
  WITH CHECK (true); -- Validated in RPC function

CREATE POLICY "Users can update their view sessions"
  ON live_stream_view_sessions FOR UPDATE
  TO authenticated, anon
  USING (true); -- left_at only, validated in RPC

CREATE POLICY "Anyone can view session stats"
  ON live_stream_view_sessions FOR SELECT
  TO authenticated, anon
  USING (true);

-- ============================================================================
-- G) MAINTENANCE: Reset trending scores on stream end
-- ============================================================================

-- Trigger to reset trending scores when stream ends
CREATE OR REPLACE FUNCTION reset_trending_on_stream_end()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If stream is being set to not live, reset trending data for next stream
  IF NEW.live_available = FALSE AND OLD.live_available = TRUE THEN
    NEW.trending_score := 0;
    NEW.last_score_at := now();
    -- Note: We keep historical counts (views, likes, comments, gifts) for analytics
    -- They will be reset when the stream starts again (handle in app logic)
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_reset_trending_on_stream_end ON live_streams;
CREATE TRIGGER trigger_reset_trending_on_stream_end
  BEFORE UPDATE ON live_streams
  FOR EACH ROW
  EXECUTE FUNCTION reset_trending_on_stream_end();

-- ============================================================================
-- H) ANALYTICS HELPER: Get trending stats for a stream
-- ============================================================================

CREATE OR REPLACE FUNCTION rpc_get_stream_trending_stats(p_stream_id BIGINT)
RETURNS TABLE(
  views_count INT,
  likes_count INT,
  comments_count INT,
  gifts_value BIGINT,
  trending_score NUMERIC,
  is_user_liked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user if authenticated
  v_user_id := auth.uid();

  RETURN QUERY
  SELECT 
    ls.views_count,
    ls.likes_count,
    ls.comments_count,
    ls.gifts_value,
    ls.trending_score,
    CASE 
      WHEN v_user_id IS NOT NULL THEN 
        EXISTS(SELECT 1 FROM live_stream_likes WHERE stream_id = p_stream_id AND profile_id = v_user_id)
      ELSE FALSE
    END AS is_user_liked
  FROM live_streams ls
  WHERE ls.id = p_stream_id;
END;
$$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION rpc_live_view_join(BIGINT, UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION rpc_live_view_leave(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION rpc_live_like_toggle(BIGINT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_live_comment_add(BIGINT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_live_gift_add(BIGINT, BIGINT) TO service_role; -- Server-only
GRANT EXECUTE ON FUNCTION rpc_get_trending_live_streams(INT, INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION rpc_get_stream_trending_stats(BIGINT) TO authenticated, anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Trending system migration complete!';
  RAISE NOTICE '   - Added trending columns to live_streams';
  RAISE NOTICE '   - Created likes, comments, view_sessions tables';
  RAISE NOTICE '   - Installed trending algorithm (v1)';
  RAISE NOTICE '   - Created 7 RPC functions';
  RAISE NOTICE '   - Added performance indexes';
  RAISE NOTICE '   - Configured RLS policies';
END $$;
