-- Check what referral-related columns exist in profiles table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND (
    column_name LIKE '%refer%' OR 
    column_name LIKE '%invit%' OR
    column_name LIKE '%code%'
  )
ORDER BY column_name;
