-- ============================================================================
-- LINK LOGIC INTEGRITY AUDIT
-- Task 4: Verify state consistency and data correctness
-- ============================================================================

-- ============================================================================
-- TEST 1: No duplicate mutuals (ordered pairs enforced)
-- ============================================================================

-- Check for duplicates (should return 0)
SELECT 
  COUNT(*) as duplicate_count,
  profile_a,
  profile_b
FROM link_mutuals
GROUP BY profile_a, profile_b
HAVING COUNT(*) > 1;

-- Expected: 0 rows (no duplicates)

-- Verify all pairs are ordered (profile_a < profile_b)
SELECT COUNT(*) as unordered_pairs
FROM link_mutuals
WHERE profile_a >= profile_b;

-- Expected: 0 (all pairs properly ordered)

-- ============================================================================
-- TEST 2: No duplicate dating matches
-- ============================================================================

SELECT 
  COUNT(*) as duplicate_count,
  profile_a,
  profile_b
FROM dating_matches
GROUP BY profile_a, profile_b
HAVING COUNT(*) > 1;

-- Expected: 0 rows (no duplicates)

-- Verify all pairs are ordered
SELECT COUNT(*) as unordered_pairs
FROM dating_matches
WHERE profile_a >= profile_b;

-- Expected: 0 (all pairs properly ordered)

-- ============================================================================
-- TEST 3: Dating matches never leak into Link mutuals
-- ============================================================================

-- Check for profiles in both link_mutuals AND dating_matches (allowed but verify separation)
SELECT 
  'in_both' as status,
  COUNT(*) as count
FROM (
  SELECT profile_a, profile_b FROM link_mutuals
  INTERSECT
  SELECT profile_a, profile_b FROM dating_matches
) overlap;

-- Expected: Some count is OK (same people can match in both modes)
-- But verify: source field distinguishes them

-- Verify link_mutuals has source field
SELECT COUNT(*) as link_mutuals_with_source
FROM link_mutuals
WHERE source IS NOT NULL;

-- Expected: All rows have source ('manual' or 'auto_follow')

-- Verify dating_matches has NO source field (different table)
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'dating_matches'
  AND column_name = 'source';

-- Expected: 0 rows (dating_matches doesn't have source field)

-- ============================================================================
-- TEST 4: One decision = one row (idempotency)
-- ============================================================================

-- Check for duplicate decisions (should return 0)
SELECT 
  from_profile_id,
  to_profile_id,
  COUNT(*) as decision_count
FROM link_decisions
GROUP BY from_profile_id, to_profile_id
HAVING COUNT(*) > 1;

-- Expected: 0 rows (unique constraint enforced)

-- Same for dating
SELECT 
  from_profile_id,
  to_profile_id,
  COUNT(*) as decision_count
FROM dating_decisions
GROUP BY from_profile_id, to_profile_id
HAVING COUNT(*) > 1;

-- Expected: 0 rows (unique constraint enforced)

-- ============================================================================
-- TEST 5: Mutual creation is atomic (both decisions exist)
-- ============================================================================

-- Find mutuals where one side doesn't have a decision (data corruption)
SELECT 
  lm.profile_a,
  lm.profile_b,
  lm.source,
  EXISTS(
    SELECT 1 FROM link_decisions ld
    WHERE (ld.from_profile_id = lm.profile_a AND ld.to_profile_id = lm.profile_b AND ld.decision = 'link')
  ) as a_to_b_exists,
  EXISTS(
    SELECT 1 FROM link_decisions ld
    WHERE (ld.from_profile_id = lm.profile_b AND ld.to_profile_id = lm.profile_a AND ld.decision = 'link')
  ) as b_to_a_exists
FROM link_mutuals lm
WHERE lm.source = 'manual'
  AND (
    NOT EXISTS(
      SELECT 1 FROM link_decisions ld
      WHERE (ld.from_profile_id = lm.profile_a AND ld.to_profile_id = lm.profile_b AND ld.decision = 'link')
    )
    OR NOT EXISTS(
      SELECT 1 FROM link_decisions ld
      WHERE (ld.from_profile_id = lm.profile_b AND ld.to_profile_id = lm.profile_a AND ld.decision = 'link')
    )
  );

-- Expected: 0 rows (all manual mutuals have both decisions)
-- Note: auto_follow source mutuals don't need decisions

-- Same for dating
SELECT 
  dm.profile_a,
  dm.profile_b,
  EXISTS(
    SELECT 1 FROM dating_decisions dd
    WHERE (dd.from_profile_id = dm.profile_a AND dd.to_profile_id = dm.profile_b AND dd.decision = 'like')
  ) as a_to_b_exists,
  EXISTS(
    SELECT 1 FROM dating_decisions dd
    WHERE (dd.from_profile_id = dm.profile_b AND dd.to_profile_id = dm.profile_a AND dd.decision = 'like')
  ) as b_to_a_exists
FROM dating_matches dm
WHERE NOT EXISTS(
    SELECT 1 FROM dating_decisions dd
    WHERE (dd.from_profile_id = dm.profile_a AND dd.to_profile_id = dm.profile_b AND dd.decision = 'like')
  )
  OR NOT EXISTS(
    SELECT 1 FROM dating_decisions dd
    WHERE (dd.from_profile_id = dm.profile_b AND dd.to_profile_id = dm.profile_a AND dd.decision = 'like')
  );

-- Expected: 0 rows (all matches have both decisions)

-- ============================================================================
-- TEST 6: Reads come from DB, not cache
-- ============================================================================

-- Verify RPC always queries fresh data (check for NOW() or similar)
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'rpc_get_link_candidates',
    'rpc_get_auto_link_candidates',
    'rpc_get_dating_candidates'
  );

-- Verify no caching logic in RPCs (manual review)
-- Expected: RPCs query tables directly with WHERE clauses

-- ============================================================================
-- TEST 7: Optimistic UI consistency (decision always saved)
-- ============================================================================

-- This test requires app-level logging, but we can verify RPC behavior:
-- Run a decision twice with same params (idempotent test)

-- Simulate: User A decides on User B
-- (Replace with actual UUIDs for testing)
/*
SELECT rpc_submit_link_decision('USER_B_UUID', 'link');
-- Returns: { mutual: false/true, decision: 'link' }

-- Run again (simulate double-click)
SELECT rpc_submit_link_decision('USER_B_UUID', 'link');
-- Should return same result, no error, no duplicate row

-- Verify only one decision row
SELECT COUNT(*) FROM link_decisions
WHERE from_profile_id = auth.uid()
  AND to_profile_id = 'USER_B_UUID';
-- Expected: 1 row
*/

-- ============================================================================
-- TEST 8: Auto-Link candidates filtered correctly
-- ============================================================================

-- Get all enabled link profiles
WITH all_enabled AS (
  SELECT profile_id FROM link_profiles WHERE enabled = true
),
auto_link_enabled AS (
  SELECT profile_id FROM link_settings WHERE auto_link_on_follow = true
)
SELECT 
  'total_enabled' as metric,
  COUNT(*) as count
FROM all_enabled
UNION ALL
SELECT 
  'auto_link_enabled' as metric,
  COUNT(*) as count
FROM auto_link_enabled
UNION ALL
SELECT 
  'both_enabled' as metric,
  COUNT(*) as count
FROM all_enabled
INNER JOIN auto_link_enabled USING (profile_id);

-- Verify: both_enabled <= auto_link_enabled <= total_enabled

-- Test RPC returns correct count
SELECT 
  'rpc_auto_link_count' as metric,
  jsonb_array_length(rpc_get_auto_link_candidates(1000, 0)) as count;

-- Should match: both_enabled - 1 (self) - decided - mutual

-- ============================================================================
-- TEST 9: Deterministic ordering (same query = same order)
-- ============================================================================

-- Run twice and compare
WITH first_run AS (
  SELECT rpc_get_link_candidates(10, 0) as result
),
second_run AS (
  SELECT rpc_get_link_candidates(10, 0) as result
)
SELECT 
  CASE 
    WHEN first_run.result = second_run.result THEN 'DETERMINISTIC'
    ELSE 'NON-DETERMINISTIC'
  END as ordering_status
FROM first_run, second_run;

-- Expected: DETERMINISTIC (same order every time)

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- Run all tests and verify:
-- ✅ No duplicate mutuals/matches
-- ✅ Dating matches separate from link mutuals
-- ✅ One decision = one row
-- ✅ Mutuals have both decisions (for manual source)
-- ✅ No caching (reads from DB)
-- ✅ Idempotent operations
-- ✅ Auto-link filter works correctly
-- ✅ Deterministic ordering

-- If all tests pass: Data integrity is maintained ✅
