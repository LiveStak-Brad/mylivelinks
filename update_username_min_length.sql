-- Update username minimum length from 3 to 4 characters
-- Run this in Supabase SQL editor

-- Update change_username function
CREATE OR REPLACE FUNCTION change_username(
    p_profile_id UUID,
    p_new_username VARCHAR(15)
)
RETURNS JSON AS $$
DECLARE
    v_current_username VARCHAR(15);
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
    
    -- Validate username format (UPDATED: minimum 4 characters)
    IF p_new_username IS NULL OR LENGTH(TRIM(p_new_username)) < 4 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Username must be at least 4 characters'
        );
    END IF;
    
    IF LENGTH(p_new_username) > 15 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Username must be 15 characters or less'
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
        SELECT 1 
        FROM profiles 
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
    SET username = LOWER(TRIM(p_new_username)),
        updated_at = NOW()
    WHERE id = p_profile_id;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Username changed successfully',
        'new_username', LOWER(TRIM(p_new_username))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Username minimum length updated to 4 characters';
    RAISE NOTICE 'Frontend validation also updated in:';
    RAISE NOTICE '  - app/login/page.tsx';
    RAISE NOTICE '  - app/onboarding/page.tsx';
END $$;






