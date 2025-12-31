-- Find YOUR recent messages to see where they're actually saving
SELECT 
  id,
  content,
  room_id,
  live_stream_id,
  created_at
FROM chat_messages
WHERE profile_id = '2b4a1178-3c39-4179-94ea-314dd824a818'
ORDER BY created_at DESC
LIMIT 20;

-- This will show us if your messages have room_id or live_stream_id set
