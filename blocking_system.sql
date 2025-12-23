-- ============================================================================
-- MyLiveLinks: Blocking System & Mini Profile
-- ============================================================================
-- 
-- Enables users to block other users
-- When blocked: chat hidden, cams hidden, not in viewer lists
-- Both users stay in room, but don't see each other
-- ============================================================================

-- ============================================================================
-- 1. CREATE BLOCKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blocks (
    id BIGSERIAL PRIMARY KEY,
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT, -- Optional reason for blocking
    CONSTRAINT check_no_self_block CHECK (blocker_id != blocked_id),
    UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked_id ON blocks(blocked_id);
CREATE INDEX idx_blocks_blocked_at ON blocks(blocked_at DESC);

-- Enable RLS on blocks
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view/manage their own blocks
CREATE POLICY "Users can view own blocks"
    ON blocks FOR SELECT
    USING (auth.uid() = blocker_id);

CREATE POLICY "Users can manage own blocks"
    ON blocks FOR ALL
    USING (auth.uid() = blocker_id)
    WITH CHECK (auth.uid() = blocker_id);

COMMENT ON TABLE blocks IS 'User blocking relationships. When A blocks B: A cannot see B chat/cams/list, B cannot see A chat/cams/list. Both stay in room.';

-- ============================================================================
-- 2. CREATE RPC: BLOCK USER
-- ============================================================================

CREATE OR REPLACE FUNCTION block_user(
    p_blocker_id UUID,
    p_blocked_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- Check if already blocked
    IF EXISTS (SELECT 1 FROM blocks WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id) THEN
        RETURN; -- Already blocked, do nothing
    END IF;
    
    -- Insert block record
    INSERT INTO blocks (blocker_id, blocked_id, reason)
    VALUES (p_blocker_id, p_blocked_id, p_reason)
    ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
    
    -- Also remove any active viewer relationships (they won't see each other)
    DELETE FROM active_viewers
    WHERE (viewer_id = p_blocker_id AND streamer_id = p_blocked_id)
       OR (viewer_id = p_blocked_id AND streamer_id = p_blocker_id);
    
    -- Remove from grid slots if they had each other
    DELETE FROM user_grid_slots
    WHERE viewer_id = p_blocker_id AND streamer_id = p_blocked_id;
    
    DELETE FROM user_grid_slots
    WHERE viewer_id = p_blocked_id AND streamer_id = p_blocker_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION block_user IS 'Block a user. Removes viewer relationships and grid slots. Both users stay in room but cannot see each other.';

-- ============================================================================
-- 3. CREATE RPC: UNBLOCK USER
-- ============================================================================

CREATE OR REPLACE FUNCTION unblock_user(
    p_blocker_id UUID,
    p_blocked_id UUID
)
RETURNS void AS $$
BEGIN
    DELETE FROM blocks
    WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION unblock_user IS 'Unblock a user. They can now see each other again.';

-- ============================================================================
-- 4. CREATE RPC: CHECK IF BLOCKED (Bidirectional)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_blocked(
    p_user_id UUID,
    p_other_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocks
        WHERE (blocker_id = p_user_id AND blocked_id = p_other_user_id)
           OR (blocker_id = p_other_user_id AND blocked_id = p_user_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION is_blocked IS 'Check if two users have blocked each other (bidirectional check). Returns true if either user blocked the other.';

-- ============================================================================
-- 5. CREATE RPC: GET BLOCKED USERS LIST
-- ============================================================================

CREATE OR REPLACE FUNCTION get_blocked_users(p_user_id UUID)
RETURNS TABLE (
    blocked_id UUID,
    blocked_username VARCHAR(50),
    blocked_display_name VARCHAR(100),
    blocked_avatar_url TEXT,
    blocked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.blocked_id,
        p.username,
        p.display_name,
        p.avatar_url,
        b.blocked_at
    FROM blocks b
    JOIN profiles p ON p.id = b.blocked_id
    WHERE b.blocker_id = p_user_id
    ORDER BY b.blocked_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION get_blocked_users IS 'Get list of users blocked by a specific user.';

-- ============================================================================
-- 6. UPDATE CHAT MESSAGES QUERY HELPER (Filter blocked users)
-- ============================================================================
-- Note: This is a helper function for filtering chat messages
-- Use this in your app queries to exclude blocked users

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
    avatar_url TEXT
) AS $$
BEGIN
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
        p.avatar_url
    FROM chat_messages cm
    LEFT JOIN profiles p ON p.id = cm.profile_id
    WHERE cm.profile_id IS NULL -- System messages always visible
       OR NOT EXISTS (
           SELECT 1 FROM blocks b
           WHERE (b.blocker_id = p_viewer_id AND b.blocked_id = cm.profile_id)
              OR (b.blocker_id = cm.profile_id AND b.blocked_id = p_viewer_id)
       )
    ORDER BY cm.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION filter_blocked_chat_messages IS 'Get chat messages filtered to exclude blocked users (bidirectional).';

-- ============================================================================
-- 7. UPDATE VIEWER LIST QUERY HELPER (Filter blocked users)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_viewer_list_filtered(
    p_viewer_id UUID,
    p_live_stream_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
    viewer_id UUID,
    username VARCHAR(50),
    display_name VARCHAR(100),
    avatar_url TEXT,
    is_live BOOLEAN,
    gifter_level INTEGER,
    joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        av.viewer_id,
        p.username,
        p.display_name,
        p.avatar_url,
        p.is_live,
        p.gifter_level,
        av.joined_at
    FROM active_viewers av
    JOIN profiles p ON p.id = av.viewer_id
    WHERE (p_live_stream_id IS NULL OR av.live_stream_id = p_live_stream_id)
      AND av.last_active_at > CURRENT_TIMESTAMP - INTERVAL '60 seconds'
      AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.blocker_id = p_viewer_id AND b.blocked_id = av.viewer_id)
             OR (b.blocker_id = av.viewer_id AND b.blocked_id = p_viewer_id)
      )
    ORDER BY av.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION get_viewer_list_filtered IS 'Get viewer list filtered to exclude blocked users (bidirectional).';

-- ============================================================================
-- 8. UPDATE VIDEO BOXES QUERY HELPER (Filter blocked streamers)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_available_streamers_filtered(
    p_viewer_id UUID
)
RETURNS TABLE (
    streamer_id UUID,
    username VARCHAR(50),
    display_name VARCHAR(100),
    avatar_url TEXT,
    live_stream_id BIGINT,
    is_published BOOLEAN,
    viewer_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ls.profile_id as streamer_id,
        p.username,
        p.display_name,
        p.avatar_url,
        ls.id as live_stream_id,
        ls.is_published,
        COUNT(DISTINCT av.viewer_id)::INTEGER as viewer_count
    FROM live_streams ls
    JOIN profiles p ON p.id = ls.profile_id
    LEFT JOIN active_viewers av ON av.live_stream_id = ls.id
        AND av.last_active_at > CURRENT_TIMESTAMP - INTERVAL '60 seconds'
    WHERE ls.live_available = TRUE
      AND ls.is_published = TRUE
      AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.blocker_id = p_viewer_id AND b.blocked_id = ls.profile_id)
             OR (b.blocker_id = ls.profile_id AND b.blocked_id = p_viewer_id)
      )
    GROUP BY ls.profile_id, p.username, p.display_name, p.avatar_url, ls.id, ls.is_published
    ORDER BY COUNT(DISTINCT av.viewer_id) DESC, ls.published_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION get_available_streamers_filtered IS 'Get available streamers filtered to exclude blocked users (bidirectional).';

-- ============================================================================
-- 9. ADD BLOCK COUNT TO PROFILES (Optional - for admin stats)
-- ============================================================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS blocked_count INTEGER DEFAULT 0 CHECK (blocked_count >= 0);

CREATE INDEX IF NOT EXISTS idx_profiles_blocked_count ON profiles(blocked_count);

-- Trigger to update blocked_count
CREATE OR REPLACE FUNCTION update_blocked_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE profiles
        SET blocked_count = blocked_count + 1
        WHERE id = NEW.blocker_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE profiles
        SET blocked_count = GREATEST(blocked_count - 1, 0)
        WHERE id = OLD.blocker_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_blocked_count
    AFTER INSERT OR DELETE ON blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_blocked_count();

COMMENT ON COLUMN profiles.blocked_count IS 'Cached count of users blocked by this user.';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE blocks IS 'User blocking relationships. Bidirectional: if A blocks B, neither sees the other chat/cams/list. Both stay in room.';
COMMENT ON FUNCTION block_user IS 'Block a user. Removes viewer relationships and grid slots.';
COMMENT ON FUNCTION unblock_user IS 'Unblock a user. They can see each other again.';
COMMENT ON FUNCTION is_blocked IS 'Check if two users have blocked each other (bidirectional).';

-- ============================================================================
-- END OF BLOCKING SYSTEM
-- ============================================================================


