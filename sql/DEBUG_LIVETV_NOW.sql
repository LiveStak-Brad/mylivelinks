-- ============================================================================
-- DEBUG: Why isn't CannaStreams showing in LiveTV Trending?
-- RUN EACH QUERY SEPARATELY IN SUPABASE SQL EDITOR
-- ============================================================================

-- 1. Check CannaStreams' live stream record
SELECT 
  ls.id,
  p.username,
  ls.live_available,
  ls.streaming_mode,  -- <-- This is likely the issue
  ls.trending_score,
  ls.started_at,
  ls.ended_at
FROM live_streams ls
JOIN profiles p ON ls.profile_id = p.id
WHERE p.username = 'CannaStreams'
ORDER BY ls.started_at DESC
LIMIT 3;

-- 2. Check ALL live streams right now (any streaming_mode)
SELECT 
  ls.id,
  p.username,
  ls.live_available,
  ls.streaming_mode,
  ls.trending_score
FROM live_streams ls
JOIN profiles p ON ls.profile_id = p.id
WHERE ls.live_available = TRUE
ORDER BY ls.trending_score DESC;

-- 3. Check what the RPC returns (might be empty if streaming_mode filter is wrong)
SELECT * FROM rpc_get_trending_live_streams(100, 0);

-- 4. FIX: If streaming_mode is NULL or wrong, update it:
-- UPDATE live_streams 
-- SET streaming_mode = 'solo' 
-- WHERE profile_id = (SELECT id FROM profiles WHERE username = 'CannaStreams')
--   AND live_available = TRUE;

-- 5. OR: Apply the new RPC that removes the streaming_mode filter entirely:
-- (Copy from sql/LIVETV_SHOW_ALL_STREAMS.sql and run it)
