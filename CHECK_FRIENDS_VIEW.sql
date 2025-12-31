-- Find the v_friends view in any schema
SELECT 
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE viewname = 'v_friends';

-- Also check if there's a table called friends
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'friends';

-- Check all views with SECURITY DEFINER
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE '%friend%';
