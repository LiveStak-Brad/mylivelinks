-- ============================================================================
-- Ensure Follows System is Complete + Add Username Change Functionality
-- ============================================================================
-- This ensures the follows table exists and adds username change capability
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENSURE FOLLOWS TABLE EXISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS follows (
    id BIGSERIAL PRIMARY KEY,
    follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    followee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    followed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, followee_id),
    CHECK (follower_id != followee_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_id);
CREATE INDEX IF NOT EXISTS idx_follows_created ON follows(followed_at DESC);

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view follows" ON follows;
CREATE POLICY "Anyone can view follows"
    ON follows FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON follows;
CREATE POLICY "Users can follow others"
    ON follows FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Users can unfollow"
    ON follows FOR DELETE
    TO authenticated
    USING (auth.uid() = follower_id);

COMMENT ON TABLE follows IS 'User follow relationships';

-- ============================================================================
-- 2. CREATE USERNAME CHANGE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION change_username(
    p_profile_id UUID,
    p_new_username VARCHAR(50)
)
RETURNS JSON AS $$
DECLARE
    v_current_username VARCHAR(50);
    v_username_available BOOLEAN;
BEGIN
    -- Get current username
    SELECT username INTO v_current_username
    FROM profiles
    WHERE id = p_profile_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Profile not found'
        );
    END IF;
    
    -- If username hasn't changed, allow it
    IF LOWER(v_current_username) = LOWER(p_new_username) THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Username unchanged'
        );
    END IF;
    
    -- Validate username format
    IF p_new_username IS NULL OR LENGTH(TRIM(p_new_username)) < 3 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Username must be at least 3 characters'
        );
    END IF;
    
    IF LENGTH(p_new_username) > 50 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Username must be 50 characters or less'
        );
    END IF;
    
    -- Check if username contains only valid characters (alphanumeric, underscore, hyphen)
    IF p_new_username !~ '^[a-zA-Z0-9_-]+$' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Username can only contain letters, numbers, underscores, and hyphens'
        );
    END IF;
    
    -- Check if username is available
    SELECT NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE LOWER(username) = LOWER(p_new_username)
        AND id != p_profile_id
    ) INTO v_username_available;
    
    IF NOT v_username_available THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Username is already taken'
        );
    END IF;
    
    -- Update username
    UPDATE profiles
    SET username = p_new_username,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_profile_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Username updated successfully',
        'new_username', p_new_username
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION change_username IS 'Change username with validation and availability check';

-- ============================================================================
-- 3. CREATE USERNAME AVAILABILITY CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_username_availability(
    p_username VARCHAR(50),
    p_current_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_available BOOLEAN;
    v_suggestions TEXT[];
BEGIN
    -- Validate format first
    IF p_username IS NULL OR LENGTH(TRIM(p_username)) < 3 THEN
        RETURN json_build_object(
            'available', false,
            'error', 'Username must be at least 3 characters'
        );
    END IF;
    
    IF LENGTH(p_username) > 50 THEN
        RETURN json_build_object(
            'available', false,
            'error', 'Username must be 50 characters or less'
        );
    END IF;
    
    IF p_username !~ '^[a-zA-Z0-9_-]+$' THEN
        RETURN json_build_object(
            'available', false,
            'error', 'Username can only contain letters, numbers, underscores, and hyphens'
        );
    END IF;
    
    -- Check availability
    SELECT NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE LOWER(username) = LOWER(p_username)
        AND (p_current_user_id IS NULL OR id != p_current_user_id)
    ) INTO v_available;
    
    -- Generate suggestions if not available
    IF NOT v_available THEN
        SELECT ARRAY[
            p_username || '_' || FLOOR(RANDOM() * 1000)::TEXT,
            p_username || FLOOR(RANDOM() * 10000)::TEXT,
            p_username || '_official'
        ] INTO v_suggestions;
        
        RETURN json_build_object(
            'available', false,
            'error', 'Username is already taken',
            'suggestions', v_suggestions
        );
    END IF;
    
    RETURN json_build_object(
        'available', true,
        'message', 'Username is available!'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION check_username_availability IS 'Check if username is available and suggest alternatives';

-- ============================================================================
-- 4. GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION change_username TO authenticated;
GRANT EXECUTE ON FUNCTION check_username_availability TO authenticated, anon;

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE ✅
-- ============================================================================
-- 
-- What was added:
-- ✅ Follows table (ensured it exists)
-- ✅ Follow/unfollow RLS policies
-- ✅ Username change function with validation
-- ✅ Username availability checker with suggestions
-- ✅ Proper indexes for performance
--
-- Users can now:
-- - Follow/unfollow others
-- - Change their username (if available)
-- - Check username availability before changing
-- - Get username suggestions if taken
-- ============================================================================

