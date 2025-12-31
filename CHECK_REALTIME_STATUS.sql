-- Check if realtime is actually enabled
SELECT 
  schemaname, 
  tablename,
  pubname
FROM pg_publication_tables 
WHERE tablename = 'chat_messages';

-- If you see no rows, the table is NOT in the publication
-- If you see a row with pubname = 'supabase_realtime', it IS in the publication
