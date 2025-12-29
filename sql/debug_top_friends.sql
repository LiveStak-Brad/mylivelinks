-- ============================================================================
-- DEBUG: Check Top Friends Data Flow
-- ============================================================================
-- Run these queries to debug why customization isn't showing

-- STEP 1: Check if columns exist in database
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name LIKE '%top_friends%'
ORDER BY column_name;
-- Expected: 4 rows (show_top_friends, top_friends_title, top_friends_avatar_style, top_friends_max_count)

-- STEP 2: Check YOUR actual data (replace 'your-username' with your username)
SELECT 
  username,
  show_top_friends,
  top_friends_title,
  top_friends_avatar_style,
  top_friends_max_count
FROM profiles
WHERE username = 'your-username';
-- Expected: Should show your custom values if you saved them

-- STEP 3: Test the RPC function directly (replace 'your-username')
SELECT public.get_profile_bundle('your-username'::text, NULL, 'web');
-- Expected: Should see a JSON object with profile.show_top_friends, etc.

-- STEP 4: Check if RPC function has the new fields
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'get_profile_bundle'
  AND routine_schema = 'public';
-- Expected: Should contain lines mentioning "show_top_friends", "top_friends_title", etc.

-- STEP 5: Verify the RPC was actually updated
SELECT prosrc 
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'get_profile_bundle';
-- Should contain the COALESCE statements for top friends fields

