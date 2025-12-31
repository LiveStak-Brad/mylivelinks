-- Check what columns exist in the rooms table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'rooms'
ORDER BY ordinal_position;

-- Also check if these views exist and what they currently do
SELECT 
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('v_rooms_effective', 'v_rooms_public');
