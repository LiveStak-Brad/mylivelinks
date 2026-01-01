-- ============================================================================
-- LINK SYSTEM COMPLETE AUDIT & VERIFICATION
-- Run these queries to verify everything is working
-- ============================================================================

-- ============================================================================
-- 1. VERIFY ALL TABLES EXIST
-- ============================================================================

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'link_profiles',
    'link_settings',
    'link_decisions',
    'link_mutuals',
    'dating_profiles',
    'dating_decisions',
    'dating_matches',
    'link_events'
  )
ORDER BY table_name;

-- Expected: 8 tables

-- ============================================================================
-- 2. VERIFY ALL RPCs EXIST
-- ============================================================================

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'rpc_upsert_link_profile',
    'rpc_upsert_link_settings',
    'rpc_get_link_candidates',
    'rpc_submit_link_decision',
    'rpc_get_my_mutuals',
    'rpc_upsert_dating_profile',
    'rpc_get_dating_candidates',
    'rpc_submit_dating_decision',
    'rpc_get_my_dating_matches',
    'rpc_handle_follow_event',
    'is_link_mutual',
    'is_dating_match'
  )
ORDER BY routine_name;

-- Expected: 12 functions

-- ============================================================================
-- 3. VERIFY RPC GRANTS ARE CORRECT
-- ============================================================================

-- Should be callable by anon + authenticated (discovery)
SELECT routine_name, grantee
FROM information_schema.role_routine_grants
WHERE routine_name IN ('rpc_get_link_candidates', 'rpc_get_dating_candidates')
ORDER BY routine_name, grantee;
-- Expected: Each should have anon AND authenticated

-- Should be callable by authenticated ONLY (mutations)
SELECT routine_name, grantee
FROM information_schema.role_routine_grants
WHERE routine_name IN (
  'rpc_upsert_link_profile',
  'rpc_upsert_link_settings',
  'rpc_submit_link_decision',
  'rpc_get_my_mutuals',
  'rpc_upsert_dating_profile',
  'rpc_submit_dating_decision',
  'rpc_get_my_dating_matches'
)
ORDER BY routine_name, grantee;
-- Expected: Each should have ONLY authenticated

-- Should be callable by service_role ONLY
SELECT routine_name, grantee
FROM information_schema.role_routine_grants
WHERE routine_name = 'rpc_handle_follow_event'
ORDER BY routine_name, grantee;
-- Expected: ONLY service_role

-- ============================================================================
-- 4. VERIFY RLS POLICIES
-- ============================================================================

-- Check all RLS policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN (
  'link_profiles', 'link_settings', 'link_decisions', 'link_mutuals',
  'dating_profiles', 'dating_decisions', 'dating_matches', 'link_events'
)
ORDER BY tablename, policyname;

-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'link_profiles', 'link_settings', 'link_decisions', 'link_mutuals',
    'dating_profiles', 'dating_decisions', 'dating_matches', 'link_events'
  );
-- Expected: All should have rowsecurity = true

-- ============================================================================
-- 5. TEST PROFILE CREATION (Run as authenticated user)
-- ============================================================================

-- Create a Link profile
SELECT rpc_upsert_link_profile(
  true,  -- enabled
  'Test bio for Link profile',  -- bio
  'San Francisco, CA',  -- location
  '["https://example.com/photo1.jpg"]'::jsonb,  -- photos
  '["Music", "Fitness"]'::jsonb  -- tags
);

-- Verify it was created
SELECT * FROM link_profiles WHERE profile_id = auth.uid();

-- ============================================================================
-- 6. TEST SETTINGS (Run as authenticated user)
-- ============================================================================

-- Create Auto-Link settings
SELECT rpc_upsert_link_settings(
  true,  -- auto_link_on_follow
  false,  -- auto_link_require_approval
  'everyone'  -- auto_link_policy
);

-- Verify it was created
SELECT * FROM link_settings WHERE profile_id = auth.uid();

-- ============================================================================
-- 7. TEST CANDIDATES RETRIEVAL
-- ============================================================================

-- Get Regular Link candidates (should work for anon + authenticated)
SELECT rpc_get_link_candidates(10, 0);

-- Get Dating candidates (should work for anon + authenticated)
SELECT rpc_get_dating_candidates(10, 0);

-- ============================================================================
-- 8. TEST DECISION SUBMISSION (Run as authenticated user)
-- ============================================================================

-- Submit a Link decision
-- (Replace 'target-profile-id' with actual UUID)
SELECT rpc_submit_link_decision(
  'target-profile-id'::uuid,
  'link'
);

-- Check decision was recorded
SELECT * FROM link_decisions 
WHERE from_profile_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 9. TEST MUTUAL CREATION
-- ============================================================================

-- To test mutuals, you need two users who both "link" each other
-- User A links User B
-- User B links User A
-- Then check:

SELECT * FROM link_mutuals
WHERE profile_a = LEAST(auth.uid(), 'other-user-id'::uuid)
  AND profile_b = GREATEST(auth.uid(), 'other-user-id'::uuid);

-- ============================================================================
-- 10. VERIFY STORAGE BUCKET EXISTS
-- ============================================================================

-- Check if link-photos bucket exists (run in SQL editor)
SELECT id, name, public
FROM storage.buckets
WHERE name = 'link-photos';

-- Expected: 1 row with name='link-photos', public=true

-- ============================================================================
-- 11. VERIFY STORAGE POLICIES
-- ============================================================================

SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%link_photos%'
ORDER BY policyname;

-- Expected: 3 policies (upload_own, public_read, delete_own)

-- ============================================================================
-- 12. TEST DATA INTEGRITY
-- ============================================================================

-- Check for duplicate mutuals (should be 0)
SELECT profile_a, profile_b, COUNT(*)
FROM link_mutuals
GROUP BY profile_a, profile_b
HAVING COUNT(*) > 1;
-- Expected: Empty result

-- Check for misordered pairs (should be 0)
SELECT * FROM link_mutuals
WHERE profile_a > profile_b;
-- Expected: Empty result

-- Check for duplicate matches (should be 0)
SELECT profile_a, profile_b, COUNT(*)
FROM dating_matches
GROUP BY profile_a, profile_b
HAVING COUNT(*) > 1;
-- Expected: Empty result

-- Check for misordered pairs (should be 0)
SELECT * FROM dating_matches
WHERE profile_a > profile_b;
-- Expected: Empty result

-- ============================================================================
-- 13. VERIFY INDEXES EXIST
-- ============================================================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'link_profiles', 'link_settings', 'link_decisions', 'link_mutuals',
    'dating_profiles', 'dating_decisions', 'dating_matches', 'link_events'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- 14. CHECK FOR ORPHANED DATA
-- ============================================================================

-- Check for link_profiles without matching profile
SELECT lp.profile_id
FROM link_profiles lp
LEFT JOIN profiles p ON p.id = lp.profile_id
WHERE p.id IS NULL;
-- Expected: Empty result

-- Check for link_decisions referencing non-existent profiles
SELECT ld.from_profile_id, ld.to_profile_id
FROM link_decisions ld
LEFT JOIN profiles p1 ON p1.id = ld.from_profile_id
LEFT JOIN profiles p2 ON p2.id = ld.to_profile_id
WHERE p1.id IS NULL OR p2.id IS NULL;
-- Expected: Empty result

-- ============================================================================
-- AUDIT SUMMARY
-- ============================================================================

-- ✅ Tables: 8 required
-- ✅ RPCs: 12 required
-- ✅ RLS Policies: Enabled on all tables
-- ✅ Grants: Correct for each RPC
-- ✅ Indexes: Present for performance
-- ✅ Storage: link-photos bucket + 3 policies
-- ✅ Data Integrity: No duplicates, ordered pairs
-- ✅ Referential Integrity: No orphaned data

/*
PASS CRITERIA:
- All 8 tables exist
- All 12 RPCs exist
- RLS enabled on all tables
- Correct grants (anon/authenticated/service_role)
- Storage bucket exists with 3 policies
- No duplicate mutuals/matches
- All pairs ordered (profile_a < profile_b)
- No orphaned data

If any check fails, review the corresponding section above for details.
*/
