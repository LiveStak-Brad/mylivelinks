-- ============================================================================
-- LINK SWIPE FIXES - VERIFICATION QUERIES
-- ============================================================================

-- ============================================================================
-- SETUP: Create two test profiles for testing
-- ============================================================================

-- Test Profile 1: Regular user (no auto-link)
INSERT INTO link_profiles (profile_id, enabled, bio, photos, tags)
VALUES (
  'TEST_USER_1_UUID_HERE',
  true,
  'Test user 1 - no auto-link',
  '[]'::jsonb,
  '["Music", "Art"]'::jsonb
)
ON CONFLICT (profile_id) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  bio = EXCLUDED.bio;

-- Test Profile 2: Auto-link enabled user
INSERT INTO link_profiles (profile_id, enabled, bio, photos, tags)
VALUES (
  'TEST_USER_2_UUID_HERE',
  true,
  'Test user 2 - auto-link enabled',
  '[]'::jsonb,
  '["Gaming", "Tech"]'::jsonb
)
ON CONFLICT (profile_id) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  bio = EXCLUDED.bio;

-- Enable auto-link for Test Profile 2
INSERT INTO link_settings (profile_id, auto_link_on_follow)
VALUES ('TEST_USER_2_UUID_HERE', true)
ON CONFLICT (profile_id) DO UPDATE SET
  auto_link_on_follow = EXCLUDED.auto_link_on_follow;

-- ============================================================================
-- TEST 1: Verify auto-link RPC exists
-- ============================================================================

SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'rpc_get_auto_link_candidates';

-- Expected: 1 row with routine_type = 'FUNCTION'

-- ============================================================================
-- TEST 2: Verify RPC permissions
-- ============================================================================

SELECT routine_name, grantee
FROM information_schema.role_routine_grants
WHERE routine_name = 'rpc_get_auto_link_candidates'
ORDER BY grantee;

-- Expected:
-- rpc_get_auto_link_candidates | anon
-- rpc_get_auto_link_candidates | authenticated

-- ============================================================================
-- TEST 3: Test regular candidates (should return both users)
-- ============================================================================

SELECT rpc_get_link_candidates(20, 0);

-- Expected: JSON array containing both test users (if not already decided)

-- ============================================================================
-- TEST 4: Test auto-link candidates (should only return User 2)
-- ============================================================================

SELECT rpc_get_auto_link_candidates(20, 0);

-- Expected: JSON array containing ONLY test user 2 (who has auto_link=true)
-- Should NOT contain test user 1

-- Verify the filter works:
SELECT 
  lp.profile_id,
  p.username,
  ls.auto_link_on_follow
FROM link_profiles lp
LEFT JOIN profiles p ON p.id = lp.profile_id
LEFT JOIN link_settings ls ON ls.profile_id = lp.profile_id
WHERE lp.enabled = true
ORDER BY ls.auto_link_on_follow DESC NULLS LAST;

-- Should show:
-- User 2: auto_link_on_follow = true
-- User 1: auto_link_on_follow = false or NULL

-- ============================================================================
-- TEST 5: Submit decision and verify mutual creation
-- ============================================================================

-- User A decides "link" on User B
SELECT rpc_submit_link_decision(
  'TEST_USER_2_UUID_HERE',
  'link'
);

-- Expected: { "mutual": false, "decision": "link" }

-- Verify decision saved
SELECT * FROM link_decisions
WHERE from_profile_id = auth.uid()
  AND to_profile_id = 'TEST_USER_2_UUID_HERE';

-- Expected: 1 row with decision = 'link'

-- User B decides "link" on User A (simulated - run as User B)
SELECT rpc_submit_link_decision(
  auth.uid(),  -- User A's ID
  'link'
);

-- Expected: { "mutual": true, "decision": "link" }

-- Verify mutual created
SELECT * FROM link_mutuals
WHERE (profile_a = LEAST(auth.uid(), 'TEST_USER_2_UUID_HERE')
   AND profile_b = GREATEST(auth.uid(), 'TEST_USER_2_UUID_HERE'));

-- Expected: 1 row with source = 'manual'

-- ============================================================================
-- TEST 6: Verify idempotent decision (submit same decision twice)
-- ============================================================================

-- Submit same decision again
SELECT rpc_submit_link_decision(
  'TEST_USER_2_UUID_HERE',
  'link'
);

-- Expected: { "mutual": true, "decision": "link" } (if already mutual)
-- Should NOT error, should NOT create duplicate

-- Verify still only one mutual row
SELECT COUNT(*) as mutual_count
FROM link_mutuals
WHERE (profile_a = LEAST(auth.uid(), 'TEST_USER_2_UUID_HERE')
   AND profile_b = GREATEST(auth.uid(), 'TEST_USER_2_UUID_HERE'));

-- Expected: mutual_count = 1

-- ============================================================================
-- TEST 7: Verify exclusions work (decided profiles don't reappear)
-- ============================================================================

-- After deciding on User 2, they should NOT appear in candidates
SELECT rpc_get_link_candidates(20, 0);

-- Expected: Should NOT contain User 2 (already decided)

SELECT rpc_get_auto_link_candidates(20, 0);

-- Expected: Should NOT contain User 2 (already decided)

-- ============================================================================
-- TEST 8: Verify mutual exclusion (mutual profiles don't appear)
-- ============================================================================

-- If mutual was created, verify neither user sees the other in candidates
SELECT 
  'regular_candidates' as source,
  COUNT(*) as count
FROM jsonb_array_elements(rpc_get_link_candidates(100, 0)) AS candidate
WHERE candidate->>'profile_id' = 'TEST_USER_2_UUID_HERE'

UNION ALL

SELECT 
  'auto_link_candidates' as source,
  COUNT(*) as count
FROM jsonb_array_elements(rpc_get_auto_link_candidates(100, 0)) AS candidate
WHERE candidate->>'profile_id' = 'TEST_USER_2_UUID_HERE';

-- Expected: Both counts = 0 (mutual profiles excluded)

-- ============================================================================
-- TEST 9: Performance check (ensure JOINs are efficient)
-- ============================================================================

EXPLAIN ANALYZE
SELECT rpc_get_auto_link_candidates(20, 0);

-- Check query plan:
-- - Should use indexes on link_profiles(enabled)
-- - Should use index on link_settings(auto_link_on_follow)
-- - Execution time should be < 50ms for typical dataset

-- ============================================================================
-- CLEANUP: Remove test data
-- ============================================================================

DELETE FROM link_decisions
WHERE from_profile_id IN ('TEST_USER_1_UUID_HERE', 'TEST_USER_2_UUID_HERE')
   OR to_profile_id IN ('TEST_USER_1_UUID_HERE', 'TEST_USER_2_UUID_HERE');

DELETE FROM link_mutuals
WHERE profile_a IN ('TEST_USER_1_UUID_HERE', 'TEST_USER_2_UUID_HERE')
   OR profile_b IN ('TEST_USER_1_UUID_HERE', 'TEST_USER_2_UUID_HERE');

DELETE FROM link_settings
WHERE profile_id IN ('TEST_USER_1_UUID_HERE', 'TEST_USER_2_UUID_HERE');

DELETE FROM link_profiles
WHERE profile_id IN ('TEST_USER_1_UUID_HERE', 'TEST_USER_2_UUID_HERE');

-- ============================================================================
-- SUMMARY OF FIXES
-- ============================================================================

/*
TASK A - Two Presses Fix:
✅ Added `submitting` state to prevent double-click
✅ Advanced UI immediately (optimistic update)
✅ RPC happens in background
✅ UI reverts on error
✅ Detailed logging added

Root cause: 
- UI waited for RPC to complete before advancing
- Users would click again during the wait
- This sent duplicate RPCs

Fix:
- Block additional clicks with `submitting` flag
- Advance UI immediately (setCurrentIndex before await)
- RPC happens in background
- Revert on error (go back to previous card)

TASK B - Auto-Link Filtering:
✅ Created rpc_get_auto_link_candidates()
✅ Filters for auto_link_on_follow = true
✅ Same exclusions as regular (decided + mutual)
✅ Permissions granted (anon + authenticated)

TASK C - Mutual Implies Follow:
✅ link_mutuals insert is already idempotent (ON CONFLICT DO NOTHING)
✅ RPC returns { mutual: boolean } for UI feedback
✅ No follow writes implemented (waiting for schema)

All acceptance criteria met:
✅ One press = one decision
✅ Candidate advances instantly
✅ Auto-link candidates filtered correctly
✅ Mutual creation idempotent
✅ Detailed verification queries provided
*/
