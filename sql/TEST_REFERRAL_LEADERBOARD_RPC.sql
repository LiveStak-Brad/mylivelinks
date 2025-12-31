-- Test the referral leaderboard RPC directly
SELECT * FROM get_referrals_leaderboard(
  p_range := 'all',
  p_limit := 10,
  p_cursor := NULL
);
