-- ============================================================================
-- LiveTV P0 Inclusion Fix - APPLY THIS IN SUPABASE SQL EDITOR
-- ============================================================================
-- 
-- ISSUE: Streams may not appear on LiveTV because profiles.is_live was never set
-- FIX: Remove profiles.is_live filter, use streaming_mode = 'solo' filter
--
-- Run this entire script in Supabase SQL Editor to apply the fix.
-- ============================================================================

-- Step 1: Apply the fixed RPC function
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

-- Step 2: Ensure permissions are granted
GRANT EXECUTE ON FUNCTION rpc_get_trending_live_streams(INT, INT) TO authenticated, anon;

-- Step 3: Verify the fix by checking for any live streams
SELECT 'VERIFICATION: Current live solo streams' AS check_type;
SELECT 
  ls.id AS stream_id,
  p.username,
  ls.live_available,
  ls.streaming_mode,
  ls.trending_score,
  ls.started_at
FROM live_streams ls
JOIN profiles p ON ls.profile_id = p.id
WHERE ls.live_available = TRUE
  AND ls.streaming_mode = 'solo'
ORDER BY ls.started_at DESC
LIMIT 10;

-- Step 4: Test the RPC directly
SELECT 'VERIFICATION: RPC output test' AS check_type;
SELECT * FROM rpc_get_trending_live_streams(10, 0);

-- ============================================================================
-- EXPECTED RESULTS:
-- - Any solo stream with live_available=TRUE should appear in both queries
-- - If no one is live, both queries return 0 rows (expected)
-- - Go live with a test account and re-run to verify inclusion
-- ============================================================================
