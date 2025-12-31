-- Check what referral-related tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%referral%'
ORDER BY table_name;
