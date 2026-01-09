-- Test search queries to identify the issue
-- Run these in Supabase SQL Editor

-- 1. Check posts table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'posts' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Test profile search (should work)
SELECT id, username, display_name, avatar_url, is_live, follower_count
FROM profiles
WHERE username ILIKE '%canna%' OR display_name ILIKE '%canna%'
ORDER BY follower_count DESC
LIMIT 5;

-- 3. Test posts search with text_content (lib/search.ts uses this)
SELECT 
  id,
  text_content,
  created_at,
  media_url,
  like_count,
  comment_count
FROM posts
WHERE text_content ILIKE '%canna%'
ORDER BY created_at DESC
LIMIT 5;

-- 4. Test posts search - FIXED: SearchClient.tsx now uses text_content
SELECT 
  id,
  text_content,
  created_at,
  media_url,
  like_count,
  comment_count
FROM posts
WHERE text_content ILIKE '%canna%'
ORDER BY created_at DESC
LIMIT 5;

-- 5. Test teams search
SELECT id, name, slug, description, icon_url, banner_url, approved_member_count
FROM teams
WHERE name ILIKE '%canna%' OR description ILIKE '%canna%'
ORDER BY approved_member_count DESC
LIMIT 5;

-- 6. Test team_feed_posts search
SELECT 
  id,
  text_content,
  created_at,
  media_url,
  comment_count,
  reaction_count,
  team_id,
  author_id
FROM team_feed_posts
WHERE text_content ILIKE '%canna%'
ORDER BY created_at DESC
LIMIT 5;
