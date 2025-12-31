-- Check what columns are in your existing referral_rollups table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'referral_rollups'
ORDER BY ordinal_position;
