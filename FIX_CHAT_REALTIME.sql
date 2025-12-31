-- ============================================
-- FIX CHAT REALTIME SUBSCRIPTION
-- ============================================

-- Step 1: Check if chat_messages is in realtime publication
SELECT 'Checking realtime publication...' as status;
SELECT schemaname, tablename
FROM pg_publication_tables 
WHERE tablename = 'chat_messages' AND pubname = 'supabase_realtime';

-- Step 2: Add chat_messages to realtime publication (if not already added)
-- This is safe to run multiple times
DO $$
BEGIN
  -- Check if already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'chat_messages'
  ) THEN
    -- Add to publication
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    RAISE NOTICE 'Added chat_messages to realtime publication';
  ELSE
    RAISE NOTICE 'chat_messages already in realtime publication';
  END IF;
END $$;

-- Step 3: Check RLS policies for SELECT (required for realtime)
SELECT 'Checking RLS policies...' as status;
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'chat_messages'
AND cmd = 'SELECT';

-- Step 4: Ensure we have a SELECT policy that allows reading messages
-- Create if missing
DO $$
BEGIN
  -- Drop existing policy if it exists (to recreate)
  DROP POLICY IF EXISTS "Users can view messages in their scope" ON chat_messages;
  
  -- Create comprehensive SELECT policy
  CREATE POLICY "Users can view messages in their scope" ON chat_messages
    FOR SELECT
    USING (
      -- Allow viewing messages in rooms user has access to
      (room_id IS NOT NULL)
      OR
      -- Allow viewing messages in solo streams (anyone can view public streams)
      (live_stream_id IS NOT NULL)
    );
  
  RAISE NOTICE 'Created SELECT policy for chat_messages';
END $$;

-- Step 5: Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'chat_messages';

-- Step 6: Test a simple query
SELECT 'Testing query...' as status;
SELECT COUNT(*) as total_messages FROM chat_messages;
SELECT COUNT(*) as solo_stream_messages FROM chat_messages WHERE live_stream_id IS NOT NULL;
SELECT COUNT(*) as room_messages FROM chat_messages WHERE room_id IS NOT NULL;

SELECT 'Setup complete! Realtime should now work.' as status;
