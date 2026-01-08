-- ============================================================================
-- LiveTV P0 Inclusion Fix
-- ============================================================================
-- 
-- ISSUE: rpc_get_trending_live_streams filters on profiles.is_live = TRUE
--        but profiles.is_live is NEVER set anywhere in the codebase.
--        Result: Live streams may not appear on LiveTV.
--
-- FIX: 
--   1. Remove the profiles.is_live filter (dead code)
--   2. Add streaming_mode = 'solo' filter (Solo Live only on LiveTV)
--
-- The source of truth for "is live" is live_streams.live_available = TRUE
-- ============================================================================

-- Recreate the function with the corrected filter
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

-- Grant execute permissions (ensure they persist after function replacement)
GRANT EXECUTE ON FUNCTION rpc_get_trending_live_streams(INT, INT) TO authenticated, anon;

-- ============================================================================
-- VERIFICATION QUERIES (run manually to confirm fix)
-- ============================================================================
-- 
-- Before fix, this would return 0 rows for any live stream:
--   SELECT * FROM rpc_get_trending_live_streams(100, 0);
--
-- After fix, any stream with live_available=TRUE and streaming_mode='solo' 
-- will appear:
--   SELECT * FROM rpc_get_trending_live_streams(100, 0);
--
-- To manually check a specific user's stream:
--   SELECT ls.id, ls.live_available, ls.streaming_mode, p.username
--   FROM live_streams ls
--   JOIN profiles p ON ls.profile_id = p.id
--   WHERE ls.live_available = TRUE
--   ORDER BY ls.started_at DESC;
-- ============================================================================
