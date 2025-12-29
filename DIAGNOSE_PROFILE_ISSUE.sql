-- ============================================================================
-- DIAGNOSE: Check what's wrong with the profile
-- ============================================================================

-- Step 1: Check if your profile exists
SELECT 
    id,
    username,
    display_name
FROM profiles
WHERE username = 'CannaStreams';

-- Step 2: Check which columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN (
    'profile_type',
    'enabled_modules',
    'enabled_tabs',
    'button_color',
    'content_text_color',
    'ui_text_color',
    'link_color',
    'show_top_friends',
    'top_friends_title'
)
ORDER BY column_name;

-- Step 3: Try calling the function directly
SELECT get_public_profile_with_adult_filtering('CannaStreams', NULL, 'web');

-- Step 4: Check for errors in PostgreSQL logs
-- Look for any error messages in the Supabase dashboard logs

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- Step 1 should show your profile ID
-- Step 2 should show which columns exist (some may be missing)
-- Step 3 should return JSON or show an error
-- ============================================================================

