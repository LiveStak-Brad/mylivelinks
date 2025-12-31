-- Show all policies on chat_messages
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'chat_messages'
ORDER BY cmd, policyname;
