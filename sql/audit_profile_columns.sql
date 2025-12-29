-- Query to check all profile customization columns in database
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND (
    column_name LIKE '%custom%' 
    OR column_name LIKE '%enable%'
    OR column_name LIKE '%top_friend%'
    OR column_name LIKE '%hide%'
    OR column_name LIKE '%social_%'
    OR column_name LIKE '%profile_%'
    OR column_name LIKE '%card_%'
    OR column_name LIKE '%accent%'
    OR column_name LIKE '%links_%'
  )
ORDER BY column_name;

