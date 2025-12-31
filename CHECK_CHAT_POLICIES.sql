-- Check RLS policies on chat_messages
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'chat_messages'
ORDER BY cmd, policyname;

-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'chat_messages';
