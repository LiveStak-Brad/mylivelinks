-- ============================================================================
-- ROOM DEMAND PUBLISHING RPC FUNCTIONS
-- Replace tile-demand with room-demand for stable publishing
-- ============================================================================

-- Function: Get room presence count (excluding self)
-- Returns total count of users in room_presence (excluding the caller)
CREATE OR REPLACE FUNCTION get_room_presence_count(
    p_profile_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Count all users in room_presence with recent heartbeat (within 60 seconds)
    SELECT COUNT(*) INTO v_count
    FROM room_presence
    WHERE last_seen_at > CURRENT_TIMESTAMP - INTERVAL '60 seconds'
    AND (p_profile_id IS NULL OR profile_id != p_profile_id); -- Exclude self if provided
    
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Function: Get room presence count minus self (convenience wrapper)
-- This is the main function to use for publisher enable logic
CREATE OR REPLACE FUNCTION get_room_presence_count_minus_self()
RETURNS INTEGER AS $$
DECLARE
    v_profile_id UUID;
    v_count INTEGER;
BEGIN
    -- Get current user's profile_id
    v_profile_id := auth.uid();
    
    -- Return count excluding self
    SELECT get_room_presence_count(v_profile_id) INTO v_count;
    
    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_room_presence_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_room_presence_count_minus_self() TO authenticated;

