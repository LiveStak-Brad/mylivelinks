-- ============================================
-- CLEAN UP AND FIX CHAT POLICIES FOR REALTIME
-- ============================================

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "chat_messages_delete_admin" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete_own" ON chat_messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert chat messages" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_scoped" ON chat_messages;
DROP POLICY IF EXISTS "Anyone can view chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Chat messages are viewable by everyone" ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their scope" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_select_scoped" ON chat_messages;

-- Step 2: Create ONE simple SELECT policy for realtime
CREATE POLICY "enable_read_for_realtime" ON chat_messages
  FOR SELECT
  USING (true); -- Allow all authenticated users to read all messages

-- Step 3: Create ONE simple INSERT policy
CREATE POLICY "enable_insert_for_authenticated" ON chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id); -- Can only insert as yourself

-- Step 4: Create DELETE policies (optional, for cleanup)
CREATE POLICY "enable_delete_own_messages" ON chat_messages
  FOR DELETE
  USING (auth.uid() = profile_id); -- Can only delete your own messages

-- Step 5: Verify
SELECT 
  'Policies after cleanup' as status,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'chat_messages'
ORDER BY cmd, policyname;

SELECT '✅ Policies cleaned up! Refresh your app now.' as status;
