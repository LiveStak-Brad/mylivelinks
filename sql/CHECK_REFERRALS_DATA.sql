-- Check referral_rollups current data
SELECT COUNT(*) as rollup_count FROM referral_rollups;

-- Check referrals table structure and data
SELECT COUNT(*) as referral_count FROM referrals;

-- Check what columns referrals table has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'referrals'
ORDER BY ordinal_position;
