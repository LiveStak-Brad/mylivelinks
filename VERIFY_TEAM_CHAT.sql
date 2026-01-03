-- ============================================================================
-- TEAM CHAT VERIFICATION QUERIES
-- ============================================================================
-- Run these in Supabase SQL Editor to verify chat is working
-- ============================================================================

-- 1. Check if table exists and has data
SELECT 
  'team_chat_messages' as table_name,
  COUNT(*) as message_count,
  COUNT(DISTINCT team_id) as teams_with_messages,
  MIN(created_at) as oldest_message,
  MAX(created_at) as newest_message
FROM public.team_chat_messages;

-- 2. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'team_chat_messages'
ORDER BY policyname;

-- 3. Check grants
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'team_chat_messages'
  AND table_schema = 'public';

-- 4. Check RPC function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%team_chat%'
ORDER BY routine_name;

-- 5. Test RPC manually (replace with real team_id)
-- SELECT * FROM rpc_get_team_chat_messages(
--   'YOUR_TEAM_ID_HERE'::uuid,
--   50,
--   NULL,
--   NULL
-- );

-- 6. Check realtime publication
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'team_chat_messages';

-- 7. Insert test message (replace with real IDs)
-- INSERT INTO public.team_chat_messages (team_id, author_id, content)
-- VALUES (
--   'YOUR_TEAM_ID_HERE'::uuid,
--   auth.uid(),
--   'Test message from SQL'
-- )
-- RETURNING *;

-- 8. View recent messages for a specific team
-- SELECT 
--   m.id,
--   m.content,
--   m.created_at,
--   p.username,
--   p.display_name
-- FROM public.team_chat_messages m
-- JOIN public.profiles p ON p.id = m.author_id
-- WHERE m.team_id = 'YOUR_TEAM_ID_HERE'::uuid
-- ORDER BY m.created_at DESC
-- LIMIT 20;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- 1. Table should exist (may have 0 messages if no one has chatted yet)
-- 2. Should see 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)
-- 3. Should see authenticated role has SELECT, INSERT, UPDATE grants
-- 4. Should see rpc_get_team_chat_messages, rpc_send_team_chat_message, etc.
-- 5. RPC should return messages (empty array is OK if no messages yet)
-- 6. Should show team_chat_messages in supabase_realtime publication
-- ============================================================================
