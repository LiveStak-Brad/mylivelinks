-- ============================================================================
-- GLOBAL SEARCH BACKEND VALIDATION TESTS
-- Run these queries in Supabase SQL Editor to verify search works
-- ============================================================================

-- TEST 1: Check if tables exist and have data
-- ============================================================================
SELECT 'profiles' as table_name, COUNT(*) as row_count FROM profiles
UNION ALL
SELECT 'posts', COUNT(*) FROM posts
UNION ALL
SELECT 'teams', COUNT(*) FROM teams
UNION ALL
SELECT 'team_feed_posts', COUNT(*) FROM team_feed_posts;

-- Expected: All tables should have > 0 rows


-- TEST 2: Check RLS status
-- ============================================================================
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'posts', 'teams', 'team_feed_posts')
ORDER BY tablename;

-- Expected: Shows which tables have RLS enabled


-- TEST 3: Check RLS policies for search tables
-- ============================================================================
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  SUBSTRING(qual::text, 1, 100) as condition_preview
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'posts', 'teams', 'team_feed_posts')
ORDER BY tablename, policyname;

-- Expected: Should see SELECT policies that allow anon/authenticated reads


-- TEST 4: Profiles search (exact match from lib/search.ts)
-- ============================================================================
SELECT 
  id, 
  username, 
  display_name, 
  avatar_url, 
  is_live, 
  follower_count,
  adult_verified_at,
  bio
FROM profiles
WHERE username ILIKE '%canna%' OR display_name ILIKE '%canna%'
ORDER BY follower_count DESC NULLS LAST
LIMIT 5;

-- Expected: Returns profiles with 'canna' in username or display_name


-- TEST 5: Posts search (text content only, no nested filters)
-- ============================================================================
SELECT 
  p.id,
  p.text_content,
  p.created_at,
  p.media_url,
  p.like_count,
  p.comment_count,
  p.author_id
FROM posts p
WHERE p.text_content ILIKE '%canna%'
ORDER BY p.created_at DESC
LIMIT 10;

-- Expected: Returns posts containing 'canna' in text


-- TEST 6: Posts search WITH author join (tests nested relation)
-- ============================================================================
SELECT 
  p.id,
  p.text_content,
  p.created_at,
  p.media_url,
  p.like_count,
  p.comment_count,
  pr.id as author_id,
  pr.username as author_username,
  pr.display_name as author_display_name,
  pr.avatar_url as author_avatar_url
FROM posts p
LEFT JOIN profiles pr ON p.author_id = pr.id
WHERE 
  p.text_content ILIKE '%canna%'
  OR pr.username ILIKE '%canna%'
  OR pr.display_name ILIKE '%canna%'
ORDER BY p.created_at DESC
LIMIT 10;

-- Expected: Returns posts where text OR author name contains 'canna'
-- If this fails, nested relation filters in Supabase client won't work


-- TEST 7: Team posts search WITH joins
-- ============================================================================
SELECT 
  tfp.id,
  tfp.text_content,
  tfp.created_at,
  tfp.media_url,
  tfp.comment_count,
  tfp.reaction_count,
  t.id as team_id,
  t.name as team_name,
  t.slug as team_slug,
  pr.id as author_id,
  pr.username as author_username,
  pr.display_name as author_display_name,
  pr.avatar_url as author_avatar_url
FROM team_feed_posts tfp
LEFT JOIN teams t ON tfp.team_id = t.id
LEFT JOIN profiles pr ON tfp.author_id = pr.id
WHERE 
  tfp.text_content ILIKE '%canna%'
  OR t.name ILIKE '%canna%'
  OR t.slug ILIKE '%canna%'
  OR pr.username ILIKE '%canna%'
  OR pr.display_name ILIKE '%canna%'
ORDER BY tfp.created_at DESC
LIMIT 10;

-- Expected: Returns team posts matching search term


-- TEST 8: Teams search
-- ============================================================================
SELECT 
  id, 
  name, 
  slug, 
  description, 
  icon_url, 
  banner_url, 
  approved_member_count
FROM teams
WHERE name ILIKE '%canna%' OR description ILIKE '%canna%'
ORDER BY approved_member_count DESC NULLS LAST
LIMIT 5;

-- Expected: Returns teams with 'canna' in name or description


-- TEST 9: Live profiles search
-- ============================================================================
SELECT 
  id, 
  username, 
  display_name, 
  avatar_url, 
  is_live
FROM profiles
WHERE is_live = true
AND (username ILIKE '%canna%' OR display_name ILIKE '%canna%')
ORDER BY username
LIMIT 5;

-- Expected: Returns currently live profiles matching search term


-- TEST 10: Check for common usernames to test exact match
-- ============================================================================
SELECT 
  username,
  display_name,
  follower_count,
  is_live
FROM profiles
WHERE username IS NOT NULL
ORDER BY follower_count DESC NULLS LAST
LIMIT 10;

-- Expected: Shows top profiles by follower count (use these for testing)


-- TEST 11: Check if posts table has author_id foreign key
-- ============================================================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('posts', 'team_feed_posts')
AND kcu.column_name LIKE '%author%';

-- Expected: Shows foreign key relationships for author columns


-- TEST 12: Sample data check - verify we have searchable content
-- ============================================================================
SELECT 
  'profiles with username' as data_type,
  COUNT(*) as count
FROM profiles
WHERE username IS NOT NULL AND username != ''
UNION ALL
SELECT 
  'posts with text',
  COUNT(*)
FROM posts
WHERE text_content IS NOT NULL AND text_content != ''
UNION ALL
SELECT 
  'teams with name',
  COUNT(*)
FROM teams
WHERE name IS NOT NULL AND name != ''
UNION ALL
SELECT 
  'team posts with text',
  COUNT(*)
FROM team_feed_posts
WHERE text_content IS NOT NULL AND text_content != '';

-- Expected: All counts should be > 0 for search to return results


-- ============================================================================
-- DIAGNOSTIC: If search returns empty results, run this
-- ============================================================================
DO $$
DECLARE
  profile_count int;
  post_count int;
  team_count int;
  rls_enabled_profiles boolean;
  rls_enabled_posts boolean;
  rls_enabled_teams boolean;
BEGIN
  -- Check data exists
  SELECT COUNT(*) INTO profile_count FROM profiles WHERE username ILIKE '%a%';
  SELECT COUNT(*) INTO post_count FROM posts WHERE text_content ILIKE '%a%';
  SELECT COUNT(*) INTO team_count FROM teams WHERE name ILIKE '%a%';
  
  -- Check RLS status
  SELECT rowsecurity INTO rls_enabled_profiles FROM pg_tables WHERE tablename = 'profiles';
  SELECT rowsecurity INTO rls_enabled_posts FROM pg_tables WHERE tablename = 'posts';
  SELECT rowsecurity INTO rls_enabled_teams FROM pg_tables WHERE tablename = 'teams';
  
  RAISE NOTICE '=== SEARCH DIAGNOSTIC ===';
  RAISE NOTICE 'Profiles with "a": %', profile_count;
  RAISE NOTICE 'Posts with "a": %', post_count;
  RAISE NOTICE 'Teams with "a": %', team_count;
  RAISE NOTICE 'Profiles RLS enabled: %', rls_enabled_profiles;
  RAISE NOTICE 'Posts RLS enabled: %', rls_enabled_posts;
  RAISE NOTICE 'Teams RLS enabled: %', rls_enabled_teams;
  
  IF profile_count = 0 THEN
    RAISE NOTICE '❌ No profiles found - database may be empty';
  END IF;
  
  IF rls_enabled_profiles AND NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND cmd = 'SELECT'
  ) THEN
    RAISE NOTICE '❌ Profiles has RLS but no SELECT policies - search will fail';
  END IF;
END $$;


-- ============================================================================
-- QUICK FIX: If RLS is blocking search, temporarily grant access
-- (Only run this if you confirm RLS is the issue)
-- ============================================================================

-- UNCOMMENT BELOW TO FIX RLS ISSUES:

/*
-- Allow public reads on profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow public reads on posts
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON posts;
CREATE POLICY "Public posts are viewable by everyone"
  ON posts FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow public reads on teams
DROP POLICY IF EXISTS "Public teams are viewable by everyone" ON teams;
CREATE POLICY "Public teams are viewable by everyone"
  ON teams FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow public reads on team posts
DROP POLICY IF EXISTS "Public team posts are viewable by everyone" ON team_feed_posts;
CREATE POLICY "Public team posts are viewable by everyone"
  ON team_feed_posts FOR SELECT
  TO anon, authenticated
  USING (true);
*/
