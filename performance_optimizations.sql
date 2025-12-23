-- ============================================================================
-- MyLiveLinks: Performance Optimizations
-- ============================================================================
-- Fix slow chat and leaderboard queries
-- ============================================================================

-- ============================================================================
-- 1. ADD MISSING INDEXES FOR CHAT MESSAGES
-- ============================================================================

-- Index on created_at for fast ordering
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Index on profile_id for joins
CREATE INDEX IF NOT EXISTS idx_chat_messages_profile_id ON chat_messages(profile_id) WHERE profile_id IS NOT NULL;

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_chat_messages_profile_created ON chat_messages(profile_id, created_at DESC) WHERE profile_id IS NOT NULL;

-- ============================================================================
-- 2. OPTIMIZE filter_blocked_chat_messages RPC FUNCTION
-- ============================================================================
-- Use CTE to pre-compute blocked user IDs for much faster filtering

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
WITH blocked_users AS (
    -- Pre-compute all blocked user IDs (bidirectional) in one query
    SELECT DISTINCT 
        CASE 
            WHEN blocker_id = p_viewer_id THEN blocked_id
            ELSE blocker_id
        END AS blocked_user_id
    FROM blocks
    WHERE blocker_id = p_viewer_id OR blocked_id = p_viewer_id
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
LEFT JOIN blocked_users bu ON bu.blocked_user_id = cm.profile_id
WHERE (cm.profile_id IS NULL OR bu.blocked_user_id IS NULL) -- System messages OR not in blocked list
ORDER BY cm.created_at DESC
LIMIT p_limit;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
STABLE; -- Mark as STABLE for query optimization

COMMENT ON FUNCTION filter_blocked_chat_messages IS 'Get chat messages filtered to exclude blocked users (bidirectional). Optimized with CTE for pre-computed blocked user list.';

-- ============================================================================
-- 3. ADD INDEXES FOR BLOCKS TABLE (if not already exist)
-- ============================================================================

-- Composite index for bidirectional block checks (most common query)
CREATE INDEX IF NOT EXISTS idx_blocks_bidirectional ON blocks(blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocks_reverse ON blocks(blocked_id, blocker_id);

-- Additional index for reverse lookup (already have idx_blocks_reverse, but ensure it exists)
-- The existing idx_blocks_bidirectional and idx_blocks_reverse should cover the CTE query

-- ============================================================================
-- 4. ADD INDEXES FOR LEADERBOARD QUERIES
-- ============================================================================

-- Index on total_gifts_received for top streamers
CREATE INDEX IF NOT EXISTS idx_profiles_total_gifts_received ON profiles(total_gifts_received DESC) WHERE total_gifts_received > 0;

-- Index on total_spent for top gifters
CREATE INDEX IF NOT EXISTS idx_profiles_total_spent ON profiles(total_spent DESC) WHERE total_spent > 0;

-- Index on gifter_level for badge lookups
CREATE INDEX IF NOT EXISTS idx_profiles_gifter_level ON profiles(gifter_level) WHERE gifter_level > 0;

-- ============================================================================
-- 5. ADD INDEXES FOR LEADERBOARD CACHE
-- ============================================================================

-- Composite index for leaderboard cache lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_type_rank_composite ON leaderboard_cache(leaderboard_type, rank ASC, period_start DESC);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check indexes on chat_messages
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'chat_messages';

-- Check indexes on blocks
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'blocks';

-- Check indexes on profiles
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'profiles';

-- Test RPC performance
-- EXPLAIN ANALYZE SELECT * FROM filter_blocked_chat_messages('00000000-0000-0000-0000-000000000000'::UUID, 50);

