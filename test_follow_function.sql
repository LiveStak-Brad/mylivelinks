-- 2. CREATE TOGGLE FOLLOW RPC FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION toggle_follow(
    p_follower_id UUID,
    p_followee_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_is_following BOOLEAN;
    v_is_mutual BOOLEAN;
    v_new_status VARCHAR(20);
BEGIN
    -- Prevent self-follow
    IF p_follower_id = p_followee_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cannot follow yourself'
        );
    END IF;
    
    -- Check if already following
    SELECT EXISTS (
        SELECT 1 FROM follows 
        WHERE follower_id = p_follower_id AND followee_id = p_followee_id
    ) INTO v_is_following;
    
    IF v_is_following THEN
        -- Unfollow
        DELETE FROM follows 
        WHERE follower_id = p_follower_id AND followee_id = p_followee_id;
        v_new_status := 'none';
    ELSE
        -- Follow
        INSERT INTO follows (follower_id, followee_id)
        VALUES (p_follower_id, p_followee_id)
        ON CONFLICT (follower_id, followee_id) DO NOTHING;
        
        -- Check if mutual (friends)
        SELECT EXISTS (
            SELECT 1 FROM follows 
            WHERE follower_id = p_followee_id AND followee_id = p_follower_id
        ) INTO v_is_mutual;
        
        v_new_status := CASE WHEN v_is_mutual THEN 'friends' ELSE 'following' END;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'status', v_new_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION toggle_follow IS 'Toggle follow/unfollow a user. Returns new relationship status.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION toggle_follow TO authenticated;

-- ============================================================================
-- 3. CREATE USERNAME CHANGE FUNCTION