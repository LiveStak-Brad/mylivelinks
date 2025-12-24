-- ============================================================================
-- COMPLETE RESET: Economy + Leaderboards + Give Brad 100,000 coins
-- ============================================================================
-- This wipes EVERYTHING and starts fresh
-- ============================================================================

-- Step 1: Reset ALL profile balances and stats
UPDATE profiles
SET 
  coin_balance = 0,
  earnings_balance = 0,
  total_spent = 0,
  total_purchased = 0,
  total_gifts_sent = 0,
  gifter_level = 0,
  rank = NULL;

-- Step 2: Clear all transaction tables
TRUNCATE TABLE gifts RESTART IDENTITY CASCADE;
TRUNCATE TABLE diamond_conversions RESTART IDENTITY CASCADE;
TRUNCATE TABLE coin_ledger RESTART IDENTITY CASCADE;
TRUNCATE TABLE coin_purchases RESTART IDENTITY CASCADE;

-- Step 3: Clear leaderboard caches (if they exist)
-- Note: These tables may not exist in your schema yet
DELETE FROM leaderboard_cache WHERE TRUE;
DELETE FROM top_gifters WHERE TRUE;
DELETE FROM top_earners WHERE TRUE;

-- Step 4: Reset any cached stats
-- Clear follows, views, etc if you want a complete wipe
-- Uncomment if you want to reset social data too:
-- TRUNCATE TABLE follows RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE profile_views RESTART IDENTITY CASCADE;

-- Step 5: Give Brad 100,000 coins
UPDATE profiles
SET coin_balance = 100000
WHERE id = '2b4a1178-3c39-4179-94ea-314dd824a818';

-- Step 6: Verify the reset
SELECT 
  'RESET COMPLETE' as status,
  COUNT(*) as total_profiles,
  SUM(coin_balance) as total_coins_in_system,
  SUM(earnings_balance) as total_diamonds_in_system
FROM profiles;

-- Step 7: Show Brad's account
SELECT 
  username,
  coin_balance,
  earnings_balance as diamonds,
  total_spent,
  gifter_level,
  rank
FROM profiles
WHERE id = '2b4a1178-3c39-4179-94ea-314dd824a818';

-- Step 8: Show any accounts with balances (should only be Brad)
SELECT 
  username,
  coin_balance,
  earnings_balance as diamonds
FROM profiles
WHERE coin_balance > 0 OR earnings_balance > 0
ORDER BY coin_balance DESC;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- Total coins in system: 100,000
-- Total diamonds in system: 0
-- Brad's coins: 100,000
-- Brad's diamonds: 0
-- Everyone else: 0 coins, 0 diamonds
-- All leaderboards: empty/reset
-- All transactions: deleted
-- ============================================================================

