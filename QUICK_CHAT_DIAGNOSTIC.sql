-- Quick diagnostic: Run ALL these at once to see what's working
-- Copy/paste this entire block into Supabase SQL Editor

-- 1. Check RPC functions exist
SELECT routine_name 
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%team_chat%'
ORDER BY routine_name;

-- 2. Check if you have any messages at all
SELECT COUNT(*) as total_messages FROM team_chat_messages;

-- 3. Check if you're a member of any team
SELECT 
  t.name as team_name,
  t.slug,
  tm.status,
  tm.role
FROM team_memberships tm
JOIN teams t ON t.id = tm.team_id
WHERE tm.profile_id = auth.uid()
ORDER BY t.name;

-- 4. Try to insert a test message (replace TEAM_SLUG with one from query #3)
-- Uncomment and replace TEAM_SLUG:
/*
INSERT INTO team_chat_messages (team_id, author_id, content)
SELECT t.id, auth.uid(), 'Test message'
FROM teams t
WHERE t.slug = 'REPLACE_WITH_YOUR_TEAM_SLUG'
RETURNING id, content, created_at;
*/
