-- ============================================================================
-- UPDATE: Add enabled_modules to profile RPC functions
-- ============================================================================
-- Run this AFTER you've run FINAL_ENABLED_MODULES_FIX.sql
-- ============================================================================

-- This updates get_public_profile to include enabled_modules
CREATE OR REPLACE FUNCTION get_public_profile(p_username text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_profile json;
BEGIN
  SELECT json_build_object(
    'id', p.id,
    'username', p.username,
    'display_name', p.display_name,
    'avatar_url', p.avatar_url,
    'bio', p.bio,
    'profile_type', p.profile_type,
    'enabled_modules', p.enabled_modules,  -- <-- ADDED THIS
    'enabled_tabs', p.enabled_tabs,        -- <-- ADDED THIS
    'accent_color', p.accent_color,
    'button_color', p.button_color,        -- <-- ADDED THIS
    'content_text_color', p.content_text_color,  -- <-- ADDED THIS
    'ui_text_color', p.ui_text_color,      -- <-- ADDED THIS
    'link_color', p.link_color,            -- <-- ADDED THIS
    'is_live', p.is_live,
    'follower_count', p.follower_count,
    'total_gifts_received', p.total_gifts_received,
    'created_at', p.created_at
  )
  INTO v_profile
  FROM profiles p
  WHERE p.username = p_username;
  
  RETURN v_profile;
END;
$$;

-- ============================================================================
-- NOTE: You may have get_public_profile_with_adult_filtering instead
-- ============================================================================
-- If that's the case, we need to see its definition first with:
-- SELECT routine_definition FROM information_schema.routines 
-- WHERE routine_name = 'get_public_profile_with_adult_filtering';
--
-- Then update it to include enabled_modules in its SELECT statement
-- ============================================================================

