-- ============================================================================
-- FIX: Ensure RPC returns all customization fields including colors
-- ============================================================================
-- The profile page needs these color fields but the RPC might not be returning them
-- ============================================================================

-- Step 1: Verify your data was saved (replace YOUR_USERNAME)
SELECT 
    username,
    button_color,
    content_text_color,
    ui_text_color,
    link_color,
    accent_color,
    font_preset
FROM profiles
WHERE username = 'YOUR_USERNAME';

-- Step 2: Find and update the RPC function
-- First, let's see what columns the function is currently selecting

-- List all profile-related RPC functions
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%profile%'
ORDER BY routine_name;

-- ============================================================================
-- COMMON ISSUE: RPC needs to be updated to include new color columns
-- ============================================================================
-- The get_public_profile_with_adult_filtering function needs to SELECT
-- these new color columns from the profiles table:
--
-- - button_color
-- - content_text_color  
-- - ui_text_color
-- - link_color
--
-- If your Step 1 query shows NULL values, the colors weren't saved.
-- If your Step 1 query shows color values, then the RPC needs updating.
-- ============================================================================

-- Step 3: Quick workaround - Check if direct query works
-- This bypasses the RPC to test if data exists
SELECT 
    id,
    username,
    display_name,
    bio,
    profile_type,
    enabled_modules,
    button_color,
    content_text_color,
    ui_text_color,
    link_color,
    accent_color,
    font_preset,
    card_color,
    card_opacity
FROM profiles
WHERE username = 'YOUR_USERNAME';

-- ============================================================================
-- NEXT STEPS:
-- 1. Run Step 1 - see if your colors were saved
-- 2. If colors are NULL, try saving profile again after running:
--    - APPLY_COLOR_CUSTOMIZATION.sql (adds columns)
--    - FIX_ENABLED_MODULES_CONSTRAINT.sql (fixes save)
-- 3. If colors have values, the RPC needs to be updated (we'll do that next)
-- ============================================================================

