-- Check if solo stream messages are actually being saved
SELECT 
  id,
  profile_id,
  content,
  live_stream_id,
  room_id,
  created_at
FROM chat_messages
WHERE live_stream_id = 157
ORDER BY created_at DESC
LIMIT 20;

-- Show total counts
SELECT 
  'Solo stream messages' as type,
  COUNT(*) as count
FROM chat_messages
WHERE live_stream_id IS NOT NULL;

SELECT 
  'Group room messages' as type,
  COUNT(*) as count
FROM chat_messages
WHERE room_id IS NOT NULL;
