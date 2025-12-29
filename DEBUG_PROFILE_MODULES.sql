-- ============================================================================
-- DEBUG: Check what was actually saved to the database
-- ============================================================================

-- 1. Check your profile data (replace with your username)
SELECT 
    username,
    profile_type,
    enabled_modules,
    enabled_tabs,
    updated_at
FROM profiles 
WHERE username = 'YOUR_USERNAME'  -- Replace with your actual username
LIMIT 1;

-- 2. Check the data type of enabled_modules
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('enabled_modules', 'enabled_tabs');

-- 3. Find the RPC function that fetches profile data
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
    routine_name LIKE '%profile%'
    OR routine_name LIKE '%bundle%'
)
ORDER BY routine_name;

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Run query #1 with your username to see if enabled_modules was saved
-- 2. Run query #2 to confirm it's jsonb type
-- 3. Run query #3 to find which RPC function needs updating
-- ============================================================================

