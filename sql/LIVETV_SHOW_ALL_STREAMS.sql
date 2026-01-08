-- ============================================================================
-- LiveTV: Show ALL Live Streams (not just solo mode)
-- ============================================================================
-- 
-- CHANGE: Remove streaming_mode = 'solo' filter
-- RESULT: ALL live streams with live_available = TRUE will appear on LiveTV
--         ordered by trending_score DESC
--
-- RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================================

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
  -- REMOVED: AND ls.streaming_mode = 'solo'
  -- Now shows ALL live streams (solo + group)
  ORDER BY ls.trending_score DESC, ls.started_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION rpc_get_trending_live_streams(INT, INT) TO authenticated, anon;

-- ============================================================================
-- VERIFICATION: Run this after applying the migration
-- ============================================================================
-- SELECT * FROM rpc_get_trending_live_streams(100, 0);
--
-- Check ALL live streams in the database:
-- SELECT ls.id, p.username, ls.live_available, ls.streaming_mode, ls.trending_score
-- FROM live_streams ls
-- JOIN profiles p ON ls.profile_id = p.id
-- WHERE ls.live_available = TRUE
-- ORDER BY ls.trending_score DESC;
-- ============================================================================
