-- ============================================================================
-- SIMPLE RESET: Only reset what exists (no errors)
-- ============================================================================

-- Step 1: Reset ALL profile balances and stats
UPDATE profiles
SET 
  coin_balance = 0,
  earnings_balance = 0,
  total_spent = 0,
  total_purchased = 0,
  gifter_level = 0;

-- Step 2: Clear transaction tables
TRUNCATE TABLE gifts RESTART IDENTITY CASCADE;
TRUNCATE TABLE diamond_conversions RESTART IDENTITY CASCADE;
TRUNCATE TABLE coin_ledger RESTART IDENTITY CASCADE;

-- Step 3: Clear ALL leaderboard caches
-- This includes: top_streamers, top_gifters, top_earners (all periods: daily, weekly, alltime)
DELETE FROM leaderboard_cache WHERE TRUE;

-- Verify leaderboards are empty
SELECT COUNT(*) as remaining_leaderboard_entries FROM leaderboard_cache;

-- Step 4: Give Brad 100,000 coins
UPDATE profiles
SET coin_balance = 100000
WHERE id = '2b4a1178-3c39-4179-94ea-314dd824a818';

-- Step 5: Verify the reset
SELECT 
  username,
  coin_balance,
  earnings_balance as diamonds,
  total_spent,
  gifter_level
FROM profiles
WHERE id = '2b4a1178-3c39-4179-94ea-314dd824a818';

-- Expected: Brad has 100,000 coins, everyone else has 0

