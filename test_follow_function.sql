-- ============================================================================
-- TEST: Verify toggle_follow function exists and works
-- ============================================================================
-- Run this in Supabase SQL Editor to test the follow function
-- ============================================================================

-- 1. Check if the function exists
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'toggle_follow';

-- Expected result: Should show 1 row with toggle_follow function

-- ============================================================================

-- 2. Check if follows table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'follows'
) AS follows_table_exists;

-- Expected result: true

-- ============================================================================

-- 3. Check RLS policies on follows table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'follows';

-- Expected result: Should show 3 policies:
-- - "Anyone can view follows" (SELECT)
-- - "Users can follow others" (INSERT)
-- - "Users can unfollow" (DELETE)

-- ============================================================================

-- 4. Test the function (replace UUIDs with actual profile IDs from your database)
-- First, get some profile IDs to test with:
SELECT id, username FROM profiles LIMIT 5;

-- Then test the function (replace with actual UUIDs from above):
-- SELECT toggle_follow('YOUR_USER_ID'::uuid, 'TARGET_USER_ID'::uuid);

-- Expected result: 
-- {"success": true, "status": "following"}
-- or
-- {"success": true, "status": "none"}

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If function doesn't exist, run:
-- add_follows_and_username_change.sql

-- If you see "permission denied for function toggle_follow":
GRANT EXECUTE ON FUNCTION toggle_follow TO authenticated;

-- If you see "relation follows does not exist":
-- Run the follows table creation from add_follows_and_username_change.sql

-- ============================================================================

