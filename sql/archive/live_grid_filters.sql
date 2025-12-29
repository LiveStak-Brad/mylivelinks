-- ============================================================================
-- MyLiveLinks: Live Grid Filter System
-- ============================================================================
-- Adds sorting filters for the live grid: Most Viewed, Most Gifted, Newest
-- ============================================================================

-- ============================================================================
-- 1. ADD went_live_at FIELD TO live_streams
-- ============================================================================

ALTER TABLE live_streams 
ADD COLUMN IF NOT EXISTS went_live_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_live_streams_went_live_at ON live_streams(went_live_at DESC) WHERE went_live_at IS NOT NULL;

COMMENT ON COLUMN live_streams.went_live_at IS 'Server-set timestamp when live_available changes from false to true. Clients cannot write this field.';

-- ============================================================================
-- 2. CREATE TRIGGER TO SET went_live_at
-- ============================================================================

CREATE OR REPLACE FUNCTION set_went_live_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Set went_live_at when live_available changes from false to true
    IF NEW.live_available = TRUE AND (OLD.live_available IS NULL OR OLD.live_available = FALSE) THEN
        NEW.went_live_at := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_went_live_at ON live_streams;
CREATE TRIGGER trigger_set_went_live_at
    BEFORE INSERT OR UPDATE ON live_streams
    FOR EACH ROW
    EXECUTE FUNCTION set_went_live_at();

COMMENT ON FUNCTION set_went_live_at IS 'Automatically sets went_live_at when live_available becomes true. Prevents client manipulation.';

-- ============================================================================
-- 3. CREATE RPC FUNCTION: get_live_grid
-- ============================================================================

CREATE OR REPLACE FUNCTION get_live_grid(
    p_viewer_id UUID,
    p_sort_mode TEXT DEFAULT 'random'
)
RETURNS TABLE (
    streamer_id UUID,
    username VARCHAR(50),
    display_name VARCHAR(100),
    avatar_url TEXT,
    live_stream_id BIGINT,
    is_published BOOLEAN,
    viewer_count INTEGER,
    session_gifts_total BIGINT,
    went_live_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_sort_mode TEXT := LOWER(p_sort_mode);
BEGIN
    -- Validate sort mode
    IF v_sort_mode NOT IN ('random', 'most_viewed', 'most_gifted', 'newest') THEN
        RAISE EXCEPTION 'Invalid sort_mode: %. Must be one of: random, most_viewed, most_gifted, newest', p_sort_mode;
    END IF;

    RETURN QUERY
    WITH streamer_data AS (
        SELECT DISTINCT
            ls.profile_id as streamer_id,
            p.username,
            p.display_name,
            p.avatar_url,
            ls.id as live_stream_id,
            ls.is_published,
            ls.went_live_at,
            -- Count active viewers (is_active + unmuted + visible + subscribed + recent heartbeat)
            COUNT(DISTINCT CASE 
                WHEN av.is_active = TRUE 
                    AND av.is_unmuted = TRUE 
                    AND av.is_visible = TRUE 
                    AND av.is_subscribed = TRUE
                    AND av.last_active_at > CURRENT_TIMESTAMP - INTERVAL '60 seconds'
                THEN av.viewer_id 
            END)::INTEGER as viewer_count,
            -- Sum gifts for current live session only (gifts sent during this live_stream session)
            COALESCE(SUM(CASE 
                WHEN g.live_stream_id = ls.id 
                    AND g.sent_at >= COALESCE(ls.started_at, ls.created_at)
                THEN g.coin_amount 
                ELSE 0 
            END), 0)::BIGINT as session_gifts_total
        FROM live_streams ls
        JOIN profiles p ON p.id = ls.profile_id
        LEFT JOIN active_viewers av ON av.live_stream_id = ls.id
        LEFT JOIN gifts g ON g.live_stream_id = ls.id
        WHERE ls.live_available = TRUE
          AND ls.is_published = TRUE
          AND NOT EXISTS (
              SELECT 1 FROM blocks b
              WHERE (b.blocker_id = p_viewer_id AND b.blocked_id = ls.profile_id)
                 OR (b.blocker_id = ls.profile_id AND b.blocked_id = p_viewer_id)
          )
        GROUP BY ls.profile_id, p.username, p.display_name, p.avatar_url, ls.id, ls.is_published, ls.went_live_at, ls.started_at, ls.created_at
    )
    SELECT 
        sd.streamer_id,
        sd.username,
        sd.display_name,
        sd.avatar_url,
        sd.live_stream_id,
        sd.is_published,
        sd.viewer_count,
        sd.session_gifts_total,
        sd.went_live_at
    FROM streamer_data sd
    ORDER BY 
        CASE 
            WHEN v_sort_mode = 'most_viewed' THEN sd.viewer_count
            WHEN v_sort_mode = 'most_gifted' THEN sd.session_gifts_total
            WHEN v_sort_mode = 'newest' THEN EXTRACT(EPOCH FROM sd.went_live_at)
            ELSE NULL -- random handled separately
        END DESC NULLS LAST,
        -- Secondary sort: always by went_live_at DESC for consistency
        sd.went_live_at DESC NULLS LAST
    LIMIT 100; -- Return top 100, client will pick 12
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
STABLE;

COMMENT ON FUNCTION get_live_grid IS 'Get live streamers with server-side sorting. Sort modes: random (returns unsorted), most_viewed, most_gifted, newest.';

-- ============================================================================
-- 4. CREATE RPC FUNCTION: get_live_grid_random
-- ============================================================================
-- Separate function for random to ensure stable shuffle seed per page load

CREATE OR REPLACE FUNCTION get_live_grid_random(
    p_viewer_id UUID,
    p_seed INTEGER DEFAULT NULL
)
RETURNS TABLE (
    streamer_id UUID,
    username VARCHAR(50),
    display_name VARCHAR(100),
    avatar_url TEXT,
    live_stream_id BIGINT,
    is_published BOOLEAN,
    viewer_count INTEGER,
    session_gifts_total BIGINT,
    went_live_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_seed INTEGER := COALESCE(p_seed, EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::INTEGER);
BEGIN
    RETURN QUERY
    WITH streamer_data AS (
        SELECT DISTINCT
            ls.profile_id as streamer_id,
            p.username,
            p.display_name,
            p.avatar_url,
            ls.id as live_stream_id,
            ls.is_published,
            ls.went_live_at,
            COUNT(DISTINCT CASE 
                WHEN av.is_active = TRUE 
                    AND av.is_unmuted = TRUE 
                    AND av.is_visible = TRUE 
                    AND av.is_subscribed = TRUE
                    AND av.last_active_at > CURRENT_TIMESTAMP - INTERVAL '60 seconds'
                THEN av.viewer_id 
            END)::INTEGER as viewer_count,
            COALESCE(SUM(CASE 
                WHEN g.live_stream_id = ls.id 
                    AND g.sent_at >= COALESCE(ls.started_at, ls.created_at)
                THEN g.coin_amount 
                ELSE 0 
            END), 0)::BIGINT as session_gifts_total
        FROM live_streams ls
        JOIN profiles p ON p.id = ls.profile_id
        LEFT JOIN active_viewers av ON av.live_stream_id = ls.id
        LEFT JOIN gifts g ON g.live_stream_id = ls.id
        WHERE ls.live_available = TRUE
          AND ls.is_published = TRUE
          AND NOT EXISTS (
              SELECT 1 FROM blocks b
              WHERE (b.blocker_id = p_viewer_id AND b.blocked_id = ls.profile_id)
                 OR (b.blocker_id = ls.profile_id AND b.blocked_id = p_viewer_id)
          )
        GROUP BY ls.profile_id, p.username, p.display_name, p.avatar_url, ls.id, ls.is_published, ls.went_live_at, ls.started_at, ls.created_at
    )
    SELECT 
        sd.streamer_id,
        sd.username,
        sd.display_name,
        sd.avatar_url,
        sd.live_stream_id,
        sd.is_published,
        sd.viewer_count,
        sd.session_gifts_total,
        sd.went_live_at
    FROM streamer_data sd
    ORDER BY md5(sd.streamer_id::TEXT || v_seed::TEXT) -- Stable random shuffle
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
STABLE;

COMMENT ON FUNCTION get_live_grid_random IS 'Get live streamers in random order with stable seed. Use same seed per page load for consistent results.';

-- ============================================================================
-- 5. ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for gifts per live_stream_id (for most_gifted sort)
CREATE INDEX IF NOT EXISTS idx_gifts_live_stream_sent_at ON gifts(live_stream_id, sent_at DESC) WHERE live_stream_id IS NOT NULL;

-- Composite index for active_viewers count (for most_viewed sort)
CREATE INDEX IF NOT EXISTS idx_active_viewers_live_stream_active ON active_viewers(live_stream_id, is_active, is_unmuted, is_visible, is_subscribed, last_active_at) 
    WHERE is_active = TRUE AND is_unmuted = TRUE AND is_visible = TRUE AND is_subscribed = TRUE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test the functions:
-- SELECT * FROM get_live_grid('00000000-0000-0000-0000-000000000000'::UUID, 'most_viewed');
-- SELECT * FROM get_live_grid('00000000-0000-0000-0000-000000000000'::UUID, 'most_gifted');
-- SELECT * FROM get_live_grid('00000000-0000-0000-0000-000000000000'::UUID, 'newest');
-- SELECT * FROM get_live_grid_random('00000000-0000-0000-0000-000000000000'::UUID, 12345);


