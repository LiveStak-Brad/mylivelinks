-- Remove is_published from RPC functions - we don't need it anymore

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
    viewer_count INTEGER,
    session_gifts_total BIGINT,
    went_live_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_sort_mode TEXT := LOWER(p_sort_mode);
BEGIN
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
          AND NOT EXISTS (
              SELECT 1 FROM blocks b
              WHERE (b.blocker_id = p_viewer_id AND b.blocked_id = ls.profile_id)
                 OR (b.blocker_id = ls.profile_id AND b.blocked_id = p_viewer_id)
          )
        GROUP BY ls.profile_id, p.username, p.display_name, p.avatar_url, ls.id, ls.went_live_at, ls.started_at, ls.created_at
    )
    SELECT 
        sd.streamer_id,
        sd.username,
        sd.display_name,
        sd.avatar_url,
        sd.live_stream_id,
        sd.viewer_count,
        sd.session_gifts_total,
        sd.went_live_at
    FROM streamer_data sd
    ORDER BY 
        CASE 
            WHEN v_sort_mode = 'most_viewed' THEN sd.viewer_count
            WHEN v_sort_mode = 'most_gifted' THEN sd.session_gifts_total
            WHEN v_sort_mode = 'newest' THEN EXTRACT(EPOCH FROM sd.went_live_at)
            ELSE NULL
        END DESC NULLS LAST,
        sd.went_live_at DESC NULLS LAST
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
STABLE;

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
          AND NOT EXISTS (
              SELECT 1 FROM blocks b
              WHERE (b.blocker_id = p_viewer_id AND b.blocked_id = ls.profile_id)
                 OR (b.blocker_id = ls.profile_id AND b.blocked_id = p_viewer_id)
          )
        GROUP BY ls.profile_id, p.username, p.display_name, p.avatar_url, ls.id, ls.went_live_at, ls.started_at, ls.created_at
    )
    SELECT 
        sd.streamer_id,
        sd.username,
        sd.display_name,
        sd.avatar_url,
        sd.live_stream_id,
        sd.viewer_count,
        sd.session_gifts_total,
        sd.went_live_at
    FROM streamer_data sd
    ORDER BY md5(sd.streamer_id::TEXT || v_seed::TEXT)
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
STABLE;

