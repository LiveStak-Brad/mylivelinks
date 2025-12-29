-- ============================================================================
-- CHECK AND UPDATE: get_public_profile_with_adult_filtering RPC
-- ============================================================================
-- This ensures the RPC function returns enabled_modules so profile pages can
-- respect user customization choices
-- ============================================================================

-- First, let's see the current function definition
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%get_public_profile%';

-- ============================================================================
-- If the function exists, you need to update it to include enabled_modules
-- Run this query to see what it's currently selecting, then we can fix it
-- ============================================================================

-- Temporary fix: Just query your profile to see what's being returned
SELECT 
    id,
    username,
    profile_type,
    enabled_modules,
    enabled_tabs
FROM profiles 
WHERE username = 'YOUR_USERNAME_HERE'
LIMIT 1;

-- ============================================================================
-- EXPECTED OUTPUT:
-- - enabled_modules should show as jsonb array like: ["social_counts", "links"]
-- - If it shows NULL, that's why it's using profile_type defaults
-- - If it shows the data, then the RPC isn't returning it
-- ============================================================================

