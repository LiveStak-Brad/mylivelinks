-- ============================================
-- ENABLE CHAT REALTIME FOR SOLO STREAMS
-- ============================================

-- Step 1: Add chat_messages to realtime publication
DO $$
BEGIN
  -- Try to add table to publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    RAISE NOTICE '✅ Added chat_messages to realtime publication';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE '✅ chat_messages already in realtime publication';
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Error adding to publication: %', SQLERRM;
  END;
END $$;

-- Step 2: Ensure SELECT policy exists (required for realtime)
DROP POLICY IF EXISTS "Anyone can view chat messages" ON chat_messages;

CREATE POLICY "Anyone can view chat messages" ON chat_messages
  FOR SELECT
  USING (true); -- Allow all users to view all messages

-- Step 3: Ensure INSERT policy exists (required to send messages)
DROP POLICY IF EXISTS "Authenticated users can send messages" ON chat_messages;

CREATE POLICY "Authenticated users can send messages" ON chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id); -- Can only insert as yourself

-- Step 4: Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'chat_messages' AND rowsecurity = true
  ) THEN
    ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ Enabled RLS on chat_messages';
  ELSE
    RAISE NOTICE '✅ RLS already enabled on chat_messages';
  END IF;
END $$;

-- Step 5: Show current state
SELECT 
  'Publication check' as check_type,
  COUNT(*) as count
FROM pg_publication_tables 
WHERE tablename = 'chat_messages' AND pubname = 'supabase_realtime';

SELECT 
  'RLS policies' as check_type,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'chat_messages'
ORDER BY cmd, policyname;

SELECT 
  'Message counts' as check_type,
  COUNT(*) FILTER (WHERE live_stream_id IS NOT NULL) as solo_stream_messages,
  COUNT(*) FILTER (WHERE room_id IS NOT NULL) as room_messages,
  COUNT(*) as total_messages
FROM chat_messages;

SELECT '✅ Setup complete! Realtime should now work for StreamChat.' as status;
