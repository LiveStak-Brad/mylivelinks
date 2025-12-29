-- ============================================================
-- PROFILE SETTINGS DIAGNOSTIC CHECKLIST
-- Run these queries to diagnose settings issues
-- ============================================================

-- ============================================================
-- TEST 1: Check if Top Friends columns exist
-- ============================================================
-- Expected: 4 rows if migration was applied
-- If 0 rows: Run sql/add_top_friends_customization.sql

SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN (
    'show_top_friends',
    'top_friends_title', 
    'top_friends_avatar_style',
    'top_friends_max_count'
  )
ORDER BY column_name;


-- ============================================================
-- TEST 2: Check your actual Top Friends data
-- ============================================================
-- Replace 'YOUR_USERNAME' with your actual username
-- Expected: Should see your custom values, not NULL

SELECT 
  username,
  show_top_friends,
  top_friends_title,
  top_friends_avatar_style,
  top_friends_max_count
FROM profiles
WHERE username = 'YOUR_USERNAME';  -- << CHANGE THIS


-- ============================================================
-- TEST 3: Check if RPC function includes Top Friends
-- ============================================================
-- Expected: Function source should contain "show_top_friends" with COALESCE
-- If not found: Run sql/update_profile_bundle_top_friends.sql

SELECT 
  p.proname as function_name,
  CASE 
    WHEN p.prosrc LIKE '%show_top_friends%' THEN 'FOUND'
    ELSE 'MISSING'
  END as has_top_friends_field,
  CASE
    WHEN p.prosrc LIKE '%COALESCE%show_top_friends%' THEN 'HAS COALESCE'
    WHEN p.prosrc LIKE '%show_top_friends%' THEN 'MISSING COALESCE'
    ELSE 'NOT FOUND'
  END as coalesce_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'get_profile_bundle';


-- ============================================================
-- TEST 4: Test RPC function output
-- ============================================================
-- Replace 'YOUR_USERNAME' with your actual username
-- Expected: JSON should contain top friends fields with values

SELECT public.get_profile_bundle(
  'YOUR_USERNAME',  -- << CHANGE THIS
  NULL,
  'web'
);


-- ============================================================
-- TEST 5: Check all profile customization columns
-- ============================================================
-- This shows ALL customization-related columns

SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND (
    column_name LIKE '%custom%'
    OR column_name LIKE '%enable%'
    OR column_name LIKE '%top_friend%'
    OR column_name LIKE '%hide%'
    OR column_name LIKE '%social_%'
    OR column_name LIKE '%profile_%'
    OR column_name LIKE '%card_%'
    OR column_name LIKE '%accent%'
    OR column_name LIKE '%links_%'
    OR column_name LIKE '%font%'
  )
ORDER BY column_name;


-- ============================================================
-- TEST 6: Check enabled_modules and enabled_tabs
-- ============================================================
-- Replace 'YOUR_USERNAME' with your actual username
-- Expected: Arrays or NULL (NULL = use profile_type defaults)

SELECT 
  username,
  profile_type,
  enabled_modules,
  enabled_tabs
FROM profiles
WHERE username = 'YOUR_USERNAME';  -- << CHANGE THIS


-- ============================================================
-- TEST 7: Check all social media fields
-- ============================================================
-- Replace 'YOUR_USERNAME' with your actual username
-- Expected: Your social media usernames (without @)

SELECT 
  username,
  social_instagram,
  social_twitter,
  social_youtube,
  social_tiktok,
  social_facebook,
  social_twitch,
  social_discord,
  social_snapchat,
  social_linkedin,
  social_github,
  social_spotify,
  social_onlyfans
FROM profiles
WHERE username = 'YOUR_USERNAME';  -- << CHANGE THIS


-- ============================================================
-- RESULTS INTERPRETATION
-- ============================================================

/*
TEST 1 Results:
- 4 rows = Columns exist, migration applied ✅
- 0 rows = Need to run sql/add_top_friends_customization.sql ❌

TEST 2 Results:
- Custom values = Data saved correctly ✅
- All NULL = Either columns don't exist or settings not saved ❌

TEST 3 Results:
- "HAS COALESCE" = RPC updated correctly ✅
- "MISSING COALESCE" = RPC needs COALESCE defaults ⚠️
- "NOT FOUND" = RPC doesn't select the field at all ❌

TEST 4 Results:
- JSON contains fields = API working ✅
- JSON missing fields = RPC not updated ❌
- Error = Column doesn't exist ❌

TEST 5 Results:
- Should see ~30 columns for all settings

TEST 6 Results:
- Arrays = Custom module/tab selection
- NULL = Using profile_type defaults

TEST 7 Results:
- Usernames without @ = Saved correctly ✅
- Empty = Not filled in or stripped
*/


-- ============================================================
-- QUICK FIX COMMANDS
-- ============================================================

/*
If TEST 1 fails (columns missing):
1. Open: sql/add_top_friends_customization.sql
2. Run entire file
3. Re-run TEST 1 to verify

If TEST 3 shows "MISSING COALESCE" or "NOT FOUND":
1. Open: sql/update_profile_bundle_top_friends.sql
2. Run entire file (it's CREATE OR REPLACE, safe to re-run)
3. Re-run TEST 3 to verify

If tests pass but profile still shows defaults:
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear site data in DevTools
3. Re-save settings in /settings/profile
4. Check profile again
*/

