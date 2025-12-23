-- ============================================================================
-- MyLiveLinks: AGGRESSIVE Performance Fixes
-- ============================================================================
-- If queries are still slow (14+ seconds), run this SQL
-- ============================================================================

-- ============================================================================
-- 1. ANALYZE TABLES (Update statistics for query planner)
-- ============================================================================

ANALYZE chat_messages;
ANALYZE blocks;
ANALYZE profiles;
ANALYZE leaderboard_cache;
ANALYZE gifter_levels;

-- ============================================================================
-- 2. DROP AND RECREATE OPTIMIZED RPC FUNCTION (Much Simpler)
-- ============================================================================

DROP FUNCTION IF EXISTS filter_blocked_chat_messages(UUID, INTEGER);

CREATE OR REPLACE FUNCTION filter_blocked_chat_messages(
    p_viewer_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id BIGINT,
    profile_id UUID,
    message_type VARCHAR(20),
    content TEXT,
    gift_id BIGINT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    username VARCHAR(50),
    display_name VARCHAR(100),
    avatar_url TEXT,
    gifter_level INTEGER
) AS $$
BEGIN
    -- If no viewer_id, return all messages (fast path)
    IF p_viewer_id IS NULL THEN
        RETURN QUERY
        SELECT 
            cm.id,
            cm.profile_id,
            cm.message_type,
            cm.content,
            cm.gift_id,
            cm.metadata,
            cm.created_at,
            p.username,
            p.display_name,
            p.avatar_url,
            COALESCE(p.gifter_level, 0) as gifter_level
        FROM chat_messages cm
        LEFT JOIN profiles p ON p.id = cm.profile_id
        ORDER BY cm.created_at DESC
        LIMIT p_limit;
        RETURN;
    END IF;

    -- Fast path: Check if user has any blocks first
    IF NOT EXISTS (SELECT 1 FROM blocks WHERE blocker_id = p_viewer_id OR blocked_id = p_viewer_id LIMIT 1) THEN
        -- No blocks, return all messages (fast path)
        RETURN QUERY
        SELECT 
            cm.id,
            cm.profile_id,
            cm.message_type,
            cm.content,
            cm.gift_id,
            cm.metadata,
            cm.created_at,
            p.username,
            p.display_name,
            p.avatar_url,
            COALESCE(p.gifter_level, 0) as gifter_level
        FROM chat_messages cm
        LEFT JOIN profiles p ON p.id = cm.profile_id
        ORDER BY cm.created_at DESC
        LIMIT p_limit;
        RETURN;
    END IF;

    -- User has blocks, filter them out
    RETURN QUERY
    WITH blocked_ids AS (
        SELECT blocked_id as user_id FROM blocks WHERE blocker_id = p_viewer_id
        UNION
        SELECT blocker_id as user_id FROM blocks WHERE blocked_id = p_viewer_id
    )
    SELECT 
        cm.id,
        cm.profile_id,
        cm.message_type,
        cm.content,
        cm.gift_id,
        cm.metadata,
        cm.created_at,
        p.username,
        p.display_name,
        p.avatar_url,
        COALESCE(p.gifter_level, 0) as gifter_level
    FROM chat_messages cm
    LEFT JOIN profiles p ON p.id = cm.profile_id
    LEFT JOIN blocked_ids bi ON bi.user_id = cm.profile_id
    WHERE cm.profile_id IS NULL OR bi.user_id IS NULL
    ORDER BY cm.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
STABLE
PARALLEL SAFE;

COMMENT ON FUNCTION filter_blocked_chat_messages IS 'Optimized chat messages with fast paths for no blocks. Uses UNION instead of OR for better index usage.';

-- ============================================================================
-- 3. ADD CRITICAL INDEXES (If missing)
-- ============================================================================

-- Chat messages: Covering index for the main query
CREATE INDEX IF NOT EXISTS idx_chat_messages_covering ON chat_messages(created_at DESC, profile_id) 
    INCLUDE (id, message_type, content, gift_id, metadata);

-- Blocks: Optimize for the UNION query pattern
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id_fast ON blocks(blocker_id) WHERE blocker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id_fast ON blocks(blocked_id) WHERE blocked_id IS NOT NULL;

-- Profiles: Covering index for chat join
CREATE INDEX IF NOT EXISTS idx_profiles_covering ON profiles(id) 
    INCLUDE (username, display_name, avatar_url, gifter_level);

-- Leaderboard cache: Optimize the join query
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_profile_join ON leaderboard_cache(profile_id, leaderboard_type, rank);

-- ============================================================================
-- 4. OPTIMIZE LEADERBOARD QUERY WITH MATERIALIZED VIEW (Optional but fast)
-- ============================================================================

-- Create a materialized view for faster leaderboard lookups
-- Note: This needs to be refreshed periodically, but reads are instant

-- Drop if exists
DROP MATERIALIZED VIEW IF EXISTS leaderboard_mv;

CREATE MATERIALIZED VIEW leaderboard_mv AS
SELECT 
    lc.leaderboard_type,
    lc.profile_id,
    lc.rank,
    lc.metric_value,
    p.username,
    p.avatar_url,
    p.gifter_level
FROM leaderboard_cache lc
JOIN profiles p ON p.id = lc.profile_id
WHERE lc.rank <= 100;

CREATE UNIQUE INDEX idx_leaderboard_mv_unique ON leaderboard_mv(leaderboard_type, rank);
CREATE INDEX idx_leaderboard_mv_type ON leaderboard_mv(leaderboard_type, rank);

-- Refresh function (call this periodically or via trigger)
CREATE OR REPLACE FUNCTION refresh_leaderboard_mv()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_mv;
END;
$$ LANGUAGE plpgsql;

-- Initial refresh
REFRESH MATERIALIZED VIEW leaderboard_mv;

COMMENT ON MATERIALIZED VIEW leaderboard_mv IS 'Materialized view for instant leaderboard reads. Refresh periodically.';

-- ============================================================================
-- 5. SET POSTGRESQL CONFIGURATION (If you have access)
-- ============================================================================

-- Increase work_mem for better sorting (if you can modify postgresql.conf)
-- work_mem = 16MB (default is 4MB)

-- Increase shared_buffers (if you can modify postgresql.conf)
-- shared_buffers = 256MB (or higher based on your plan)

-- ============================================================================
-- 6. CREATE PARTIAL INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Note: Cannot use NOW() in index predicates (not IMMUTABLE)
-- Instead, create regular indexes - PostgreSQL will still use them efficiently
-- for recent data queries due to the DESC ordering

-- Index for recent messages (PostgreSQL will use this efficiently for recent queries)
CREATE INDEX IF NOT EXISTS idx_chat_messages_recent ON chat_messages(created_at DESC);

-- Index for blocks (already exists, but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_blocked ON blocks(blocker_id, blocked_id);

-- ============================================================================
-- 7. VERIFICATION AND TESTING
-- ============================================================================

-- Check if indexes are being used
-- EXPLAIN ANALYZE SELECT * FROM filter_blocked_chat_messages('YOUR_USER_ID'::UUID, 50);

-- Check table sizes
-- SELECT 
--     schemaname,
--     tablename,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
-- SELECT 
--     schemaname,
--     tablename,
--     indexname,
--     idx_scan,
--     idx_tup_read,
--     idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- ============================================================================
-- 8. IF STILL SLOW: Consider simplifying the query
-- ============================================================================

-- Alternative: Skip RPC entirely and filter in application
-- This might be faster if you have few blocks

-- For now, the optimized RPC above should be much faster

