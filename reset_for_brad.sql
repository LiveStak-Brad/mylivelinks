-- ============================================================================
-- RESET ECONOMY: Wipe everything and give Brad 100,000 coins
-- ============================================================================

-- Step 1: Reset ALL balances to zero for everyone
UPDATE profiles
SET 
  coin_balance = 0,
  earnings_balance = 0,
  total_spent = 0,
  total_purchased = 0,
  gifter_level = 0;

-- Step 2: Clear all transaction history
TRUNCATE TABLE gifts RESTART IDENTITY CASCADE;
TRUNCATE TABLE diamond_conversions RESTART IDENTITY CASCADE;
TRUNCATE TABLE coin_ledger RESTART IDENTITY CASCADE;

-- Step 3: Give Brad 100,000 coins only
UPDATE profiles
SET coin_balance = 100000
WHERE id = '2b4a1178-3c39-4179-94ea-314dd824a818';

-- Step 4: Verify it worked
SELECT 
  username, 
  coin_balance, 
  earnings_balance as diamonds,
  total_spent,
  gifter_level
FROM profiles
WHERE coin_balance > 0 OR earnings_balance > 0
ORDER BY coin_balance DESC;

-- You should see ONLY your account with 100,000 coins and 0 diamonds

