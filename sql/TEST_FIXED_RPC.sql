-- Test if the RPC works now with the fixed schema
SELECT * FROM get_referrals_leaderboard('all', 10, NULL);
