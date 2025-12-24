-- ============================================================================
-- DIAGNOSE GIFT SENDING ISSUE
-- ============================================================================

-- Step 1: Check your current balance
SELECT 
  username,
  coin_balance,
  earnings_balance as diamonds,
  total_spent
FROM profiles
WHERE id = '2b4a1178-3c39-4179-94ea-314dd824a818';

-- Step 2: Check if process_gift function exists and when it was last modified
SELECT 
  routine_name,
  routine_type,
  specific_name,
  last_altered
FROM information_schema.routines
WHERE routine_name = 'process_gift'
AND routine_schema = 'public';

-- Step 3: Check the ACTUAL code of the function (look for WHERE id = p_recipient_id)
SELECT pg_get_functiondef((
  SELECT oid 
  FROM pg_proc 
  WHERE proname = 'process_gift'
  LIMIT 1
));

-- Step 4: Test if update_coin_balance_via_ledger function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'update_coin_balance_via_ledger'
AND routine_schema = 'public';

-- ============================================================================
-- WHAT TO LOOK FOR:
-- ============================================================================
-- In Step 3 output, search for this line:
--   "WHERE id = p_recipient_id"  ✅ CORRECT (diamonds go to recipient)
--   "WHERE id = p_sender_id"     ❌ WRONG (diamonds go to sender - causes error)
--
-- If you see "WHERE id = p_sender_id" near the earnings_balance line,
-- the fix didn't apply. Try running fix_gift_properly.sql again.
-- ============================================================================

