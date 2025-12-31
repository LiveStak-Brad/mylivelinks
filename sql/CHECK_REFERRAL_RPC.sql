-- Check if the referral leaderboard RPC function exists
SELECT 
  proname as function_name,
  prokind as function_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE proname = 'get_referrals_leaderboard'
  AND n.nspname = 'public';
image.png