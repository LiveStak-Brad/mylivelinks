-- Comprehensive chat diagnosis for live_stream_id 157
-- Run this and share ALL results

-- 1. Check recent messages (should see your test messages)
SELECT 
  'Recent messages' as check_type,
  id,
  content,
  profile_id,
  live_stream_id,
  room_id,
  created_at
FROM chat_messages
WHERE live_stream_id = 157
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if profile data is joined correctly
SELECT 
  'Messages with profile data' as check_type,
  cm.id,
  cm.content,
  cm.created_at,
  p.username,
  p.avatar_url,
  p.gifter_level
FROM chat_messages cm
LEFT JOIN profiles p ON cm.profile_id = p.id
WHERE cm.live_stream_id = 157
ORDER BY cm.created_at DESC
LIMIT 10;

-- 3. Check for any NULL profile_ids (orphaned messages)
SELECT 
  'Orphaned messages' as check_type,
  COUNT(*) as count
FROM chat_messages
WHERE live_stream_id = 157 AND profile_id IS NULL;

-- 4. Check message type distribution
SELECT 
  'Message types' as check_type,
  message_type,
  COUNT(*) as count
FROM chat_messages
WHERE live_stream_id = 157
GROUP BY message_type;

-- 5. Total count by stream
SELECT 
  'Total messages' as check_type,
  live_stream_id,
  COUNT(*) as count
FROM chat_messages
WHERE live_stream_id IS NOT NULL
GROUP BY live_stream_id
ORDER BY count DESC;
