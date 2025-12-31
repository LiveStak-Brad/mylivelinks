-- Test if we can insert into chat_messages
-- This will help diagnose if RLS or permissions are blocking inserts

-- Get your current user ID (replace with your actual user ID if you know it)
SELECT 
  'Current auth user' as info,
  auth.uid() as user_id;

-- Try a test insert (replace USER_ID and LIVE_STREAM_ID with real values)
-- Example: INSERT INTO chat_messages (profile_id, message_type, content, live_stream_id, room_id)
-- VALUES ('your-user-id-here', 'text', 'TEST MESSAGE', 123, null);

-- Check existing messages
SELECT 
  id,
  profile_id,
  message_type,
  content,
  created_at,
  room_id,
  live_stream_id
FROM chat_messages
ORDER BY created_at DESC
LIMIT 10;

-- Check RLS policies
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
WHERE tablename = 'chat_messages'
ORDER BY cmd, policyname;

-- Check if table has RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'chat_messages';
