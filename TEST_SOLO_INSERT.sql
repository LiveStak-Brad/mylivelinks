-- Check INSERT policy details
SELECT 
  policyname,
  with_check
FROM pg_policies 
WHERE tablename = 'chat_messages' AND cmd = 'INSERT';

-- Test if we can manually insert a solo stream message
-- Replace with your actual user ID
INSERT INTO chat_messages (profile_id, message_type, content, live_stream_id, room_id)
VALUES 
  ('2b4a1178-3c39-4179-94ea-314dd824a818', 'text', 'TEST SOLO MESSAGE', 157, null);

-- Check if it worked
SELECT 
  id,
  content,
  live_stream_id,
  room_id,
  created_at
FROM chat_messages
WHERE content = 'TEST SOLO MESSAGE';
