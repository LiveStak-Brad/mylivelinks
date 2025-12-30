-- Check if chat scoping columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'chat_messages' 
  AND column_name IN ('room_id', 'live_stream_id')
ORDER BY column_name;

-- Check if any messages have been scoped
SELECT 
  COUNT(*) as total_messages,
  COUNT(room_id) as messages_with_room_id,
  COUNT(live_stream_id) as messages_with_stream_id
FROM public.chat_messages;

-- Check RLS policies
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'chat_messages'
ORDER BY policyname;

