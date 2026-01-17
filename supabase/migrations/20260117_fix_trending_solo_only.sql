-- ============================================================================
-- FIX: Trending streams should ONLY show solo mode streams
-- ============================================================================
-- 
-- This migration ensures rpc_get_trending_live_streams only returns
-- streams where streaming_mode = 'solo', NOT group room streams.
--
-- Run this in Supabase SQL Editor to apply immediately.
-- ============================================================================

DROP FUNCTION IF EXISTS rpc_get_trending_live_streams(INT, INT);

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
    AND ls.streaming_mode = 'solo'  -- CRITICAL: Only solo streams, not group room streams
  ORDER BY ls.trending_score DESC, ls.started_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION rpc_get_trending_live_streams(INT, INT) TO authenticated, anon;

-- Verify the function was created correctly
DO $$
BEGIN
  RAISE NOTICE 'rpc_get_trending_live_streams updated to filter streaming_mode = solo only';
END $$;
