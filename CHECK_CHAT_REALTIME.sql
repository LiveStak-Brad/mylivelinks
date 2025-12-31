-- Check if realtime is enabled for chat_messages
SELECT schemaname, tablename, replication
FROM pg_publication_tables 
WHERE tablename = 'chat_messages';

-- If not enabled, enable it:
-- ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Check current RLS policies
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
ORDER BY policyname;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'chat_messages';
