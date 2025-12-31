-- Verify current policies
SELECT 
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'chat_messages'
ORDER BY cmd, policyname;

-- Should only see:
-- enable_delete_own_messages | DELETE
-- enable_insert_for_authenticated | INSERT  
-- enable_read_for_realtime | SELECT
