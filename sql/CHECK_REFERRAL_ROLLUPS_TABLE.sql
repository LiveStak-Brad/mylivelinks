-- Check if referral_rollups table exists
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'referral_rollups'
) as table_exists;

-- If false, the RPC will fail because it checks for this table
