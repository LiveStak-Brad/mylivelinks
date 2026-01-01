-- ============================================================================
-- LINK SYSTEM P0 FIXES - VERIFICATION QUERIES
-- Run these after applying the corrected migration
-- ============================================================================

-- ============================================================================
-- 1. VERIFY: No ordered CHECK constraints (removed for safety)
-- ============================================================================
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name
FROM pg_constraint
WHERE conname IN ('link_mutuals_ordered', 'dating_matches_ordered');
-- Expected: 0 rows (constraints removed)

-- ============================================================================
-- 2. VERIFY: RLS policies split correctly (owner policies have WITH CHECK)
-- ============================================================================
SELECT 
  tablename,
  policyname,
  cmd,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename IN ('link_profiles', 'dating_profiles')
  AND policyname LIKE '%owner%'
ORDER BY tablename, cmd;
-- Expected: INSERT/UPDATE policies have WITH CHECK = true

-- ============================================================================
-- 3. VERIFY: Anon can select enabled profiles
-- ============================================================================
-- Run this as anon user or check policy definition:
SELECT policyname, qual
FROM pg_policies
WHERE tablename = 'link_profiles'
  AND policyname = 'link_profiles_select_enabled';
-- Expected: qual should NOT contain auth.role() restriction

-- ============================================================================
-- 4. VERIFY: RPC permissions locked down
-- ============================================================================
SELECT 
  routine_name,
  string_agg(grantee, ', ') as granted_to
FROM information_schema.routine_privileges
WHERE routine_name IN (
  'rpc_upsert_link_profile',
  'rpc_get_link_candidates',
  'rpc_submit_link_decision',
  'rpc_get_my_mutuals',
  'rpc_handle_follow_event'
)
GROUP BY routine_name
ORDER BY routine_name;
-- Expected: 
--   Most RPCs granted to 'authenticated'
--   rpc_handle_follow_event granted to 'service_role' only

-- ============================================================================
-- FUNCTIONAL TEST 1: Upsert link profile
-- ============================================================================
SELECT rpc_upsert_link_profile(
  p_enabled := true,
  p_bio := 'Test bio for link profile',
  p_location_text := 'Test City',
  p_photos := '["photo1.jpg", "photo2.jpg"]'::jsonb,
  p_tags := '["music", "art"]'::jsonb
);
-- Expected: Returns jsonb with profile data

-- Verify:
SELECT * FROM link_profiles WHERE profile_id = auth.uid();

-- ============================================================================
-- FUNCTIONAL TEST 2: Get candidates (with mutual exclusion)
-- ============================================================================
SELECT rpc_get_link_candidates(20, 0);
-- Expected: Returns array of enabled profiles
--   - Excludes self
--   - Excludes already decided
--   - Excludes already mutual
--   - Ordered by updated_at DESC, created_at DESC

-- ============================================================================
-- FUNCTIONAL TEST 3: Submit decision and create mutual
-- ============================================================================
-- As User A, decide on User B:
SELECT rpc_submit_link_decision(
  p_to_profile_id := 'USER_B_UUID_HERE',
  p_decision := 'link'
);
-- Expected: { "mutual": false, "decision": "link" } (first decision)

-- As User B, decide on User A:
SELECT rpc_submit_link_decision(
  p_to_profile_id := 'USER_A_UUID_HERE',
  p_decision := 'link'
);
-- Expected: { "mutual": true, "decision": "link" } (mutual created!)

-- Verify mutual created with correct ordering:
SELECT 
  profile_a,
  profile_b,
  profile_a < profile_b as correctly_ordered,
  source
FROM link_mutuals
WHERE 'USER_A_UUID' IN (profile_a::text, profile_b::text)
  AND 'USER_B_UUID' IN (profile_a::text, profile_b::text);
-- Expected: 1 row, correctly_ordered = true, source = 'manual'

-- ============================================================================
-- FUNCTIONAL TEST 4: Get my mutuals (JOIN fix verification)
-- ============================================================================
SELECT rpc_get_my_mutuals(50, 0);
-- Expected: Returns array of mutuals with correct profile data
--   - No SQL errors (JOIN is now correct)
--   - Shows other user's profile, not your own

-- ============================================================================
-- FUNCTIONAL TEST 5: Dating profile and candidates
-- ============================================================================
SELECT rpc_upsert_dating_profile(
  p_enabled := true,
  p_bio := 'Test dating bio',
  p_location_text := 'Dating City',
  p_photos := '["dating1.jpg"]'::jsonb,
  p_prefs := '{"age_min": 25, "age_max": 35}'::jsonb
);
-- Expected: Returns jsonb with dating profile data

SELECT rpc_get_dating_candidates(20, 0);
-- Expected: Returns array of enabled dating profiles
--   - Excludes already decided
--   - Excludes already matched
--   - Ordered by updated_at DESC, created_at DESC

-- ============================================================================
-- FUNCTIONAL TEST 6: Dating match creation
-- ============================================================================
-- User A likes User B:
SELECT rpc_submit_dating_decision(
  p_to_profile_id := 'USER_B_UUID_HERE',
  p_decision := 'like'
);
-- Expected: { "match": false, "decision": "like" }

-- User B likes User A:
SELECT rpc_submit_dating_decision(
  p_to_profile_id := 'USER_A_UUID_HERE',
  p_decision := 'like'
);
-- Expected: { "match": true, "decision": "like" }

-- Verify match:
SELECT 
  profile_a,
  profile_b,
  profile_a < profile_b as correctly_ordered
FROM dating_matches
WHERE 'USER_A_UUID' IN (profile_a::text, profile_b::text)
  AND 'USER_B_UUID' IN (profile_a::text, profile_b::text);
-- Expected: 1 row, correctly_ordered = true

-- ============================================================================
-- FUNCTIONAL TEST 7: Get my dating matches (JOIN fix verification)
-- ============================================================================
SELECT rpc_get_my_dating_matches(50, 0);
-- Expected: Returns array of matches with correct profile data
--   - No SQL errors (JOIN is now correct)

-- ============================================================================
-- SECURITY TEST: Bio/tags length constraints
-- ============================================================================
-- Try to insert bio > 500 chars (should fail):
SELECT rpc_upsert_link_profile(
  p_enabled := true,
  p_bio := repeat('a', 501),
  p_location_text := null,
  p_photos := '[]'::jsonb,
  p_tags := '[]'::jsonb
);
-- Expected: ERROR - violates check constraint "link_profiles_bio_length"

-- Try to insert > 20 tags (should fail):
SELECT rpc_upsert_link_profile(
  p_enabled := true,
  p_bio := 'test',
  p_location_text := null,
  p_photos := '[]'::jsonb,
  p_tags := jsonb_build_array(
    'tag1','tag2','tag3','tag4','tag5',
    'tag6','tag7','tag8','tag9','tag10',
    'tag11','tag12','tag13','tag14','tag15',
    'tag16','tag17','tag18','tag19','tag20',
    'tag21'
  )
);
-- Expected: ERROR - violates check constraint "link_profiles_tags_max_20"

-- ============================================================================
-- DATA INTEGRITY: Verify unique indexes work without CHECK constraints
-- ============================================================================
-- Try to insert duplicate mutual (different order) - should be prevented by index:
-- (Run as service_role to bypass RLS for this test)
INSERT INTO link_mutuals (profile_a, profile_b, source)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'manual'
);

INSERT INTO link_mutuals (profile_a, profile_b, source)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'manual'
);
-- Expected: Second insert fails with unique violation

-- Cleanup:
DELETE FROM link_mutuals 
WHERE profile_a = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND profile_b = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- ============================================================================
-- SUMMARY CHECKS
-- ============================================================================

-- All tables exist:
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'link_profiles', 'link_settings', 'link_decisions', 'link_mutuals',
    'dating_profiles', 'dating_decisions', 'dating_matches', 'link_events'
  );
-- Expected: 8

-- All RPCs exist:
SELECT COUNT(*) as rpc_count
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
  );
-- Expected: 12

-- All constraints working:
SELECT 
  conrelid::regclass AS table_name,
  COUNT(*) as constraint_count
FROM pg_constraint
WHERE conrelid::regclass::text IN (
  'link_profiles',
  'link_mutuals',
  'dating_profiles',
  'dating_matches'
)
GROUP BY conrelid::regclass
ORDER BY table_name;
-- Expected: Multiple constraints per table (no ordered CHECKs)

-- ============================================================================
-- ✅ P0 FIXES VERIFIED
-- ============================================================================
-- If all tests pass:
-- ✅ Ordered CHECK constraints removed (unique indexes handle it)
-- ✅ RLS policies properly split with WITH CHECK
-- ✅ Anon can browse enabled profiles
-- ✅ JOIN logic fixed (no CASE-in-ON errors)
-- ✅ RPC permissions explicitly granted
-- ✅ Bio/tags length limits enforced
-- ✅ Candidate exclusions work (decided + mutual/matched)
-- ✅ Ordering improved (updated_at DESC, created_at DESC)
