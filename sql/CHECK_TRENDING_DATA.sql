-- ============================================================================
-- TRENDING SYSTEM DIAGNOSTIC
-- ============================================================================

-- 1) Check if trending columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'live_streams' 
  AND column_name IN ('views_count', 'likes_count', 'comments_count', 'gifts_value', 'trending_score', 'last_score_at')
ORDER BY column_name;

-- 2) Check if trending tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('live_stream_likes', 'live_stream_comments', 'live_stream_view_sessions')
ORDER BY table_name;

-- 3) Check current live streams and their trending data
SELECT 
  ls.id,
  ls.profile_id,
  p.username,
  ls.live_available,
  ls.views_count,
  ls.likes_count,
  ls.comments_count,
  ls.gifts_value,
  ls.trending_score,
  ls.last_score_at,
  ls.started_at
FROM live_streams ls
LEFT JOIN profiles p ON p.id = ls.profile_id
WHERE ls.live_available = TRUE
ORDER BY ls.trending_score DESC NULLS LAST;

-- 4) Check likes data
SELECT 
  COUNT(*) as total_likes,
  stream_id,
  COUNT(DISTINCT profile_id) as unique_users
FROM live_stream_likes
GROUP BY stream_id;

-- 5) Check comments data
SELECT 
  COUNT(*) as total_comments,
  stream_id
FROM live_stream_comments
GROUP BY stream_id;

-- 6) Check view sessions
SELECT 
  COUNT(*) as total_sessions,
  stream_id,
  COUNT(CASE WHEN left_at IS NULL THEN 1 END) as active_sessions
FROM live_stream_view_sessions
GROUP BY stream_id;

-- 7) Test trending score calculation for a specific stream
-- Replace 123 with your actual stream_id
DO $$
DECLARE
  v_stream_id BIGINT;
BEGIN
  -- Get the first live stream
  SELECT id INTO v_stream_id
  FROM live_streams
  WHERE live_available = TRUE
  LIMIT 1;
  
  IF v_stream_id IS NOT NULL THEN
    RAISE NOTICE 'Testing trending score for stream_id: %', v_stream_id;
    PERFORM recompute_live_trending(v_stream_id);
    RAISE NOTICE 'Score recomputed successfully';
  ELSE
    RAISE NOTICE 'No live streams found';
  END IF;
END $$;

-- 8) Check if RPC functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE 'rpc_%trending%' OR routine_name LIKE '%live_%'
ORDER BY routine_name;

-- 9) Final: Get trending streams (what the app calls)
SELECT * FROM rpc_get_trending_live_streams(10, 0);
