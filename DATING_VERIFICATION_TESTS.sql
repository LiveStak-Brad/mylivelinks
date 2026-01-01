-- ============================================================================
-- DATING DATA MODEL VERIFICATION TESTS
-- ============================================================================
-- WARNING: These queries require authentication. Run via app client, NOT SQL editor.
-- SQL editor will show "Not authenticated" because auth.uid() is NULL.
-- ============================================================================

-- ============================================================================
-- TEST 1: Create/Update Dating Profile with Rich Prefs
-- ============================================================================

-- Expected: Returns full dating profile with prefs structure
-- Run this via app client (authenticated user)
SELECT rpc_upsert_dating_profile(
  true,  -- enabled
  'Looking for meaningful connections',  -- bio (legacy field)
  'San Francisco, CA',  -- location
  '["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]'::jsonb,  -- photos
  '{
    "age": 28,
    "height": "5_8_to_5_11",
    "build": "athletic",
    "religion": "agnostic",
    "smoker": "no",
    "drinker": "socially",
    "interests": ["music", "fitness", "travel", "photography"],
    "dating_bio": "Looking for meaningful connections with someone who shares my passions",
    "show_me": "everyone",
    "age_min": 24,
    "age_max": 35,
    "smoker_ok": "doesnt_matter",
    "drinker_ok": "doesnt_matter",
    "religion_pref": ["agnostic", "atheist", "spiritual"],
    "height_pref": "doesnt_matter",
    "build_pref": ["athletic", "slim", "average"],
    "interests_pref": ["music", "fitness"]
  }'::jsonb  -- full prefs object
);

-- ============================================================================
-- TEST 2: Retrieve My Dating Profile
-- ============================================================================

-- Expected: Returns profile with prefs structure
SELECT rpc_get_my_dating_profile();

-- Alternative: Direct table query (if RLS allows)
SELECT 
  profile_id,
  enabled,
  bio,
  location_text,
  photos,
  prefs,
  prefs->>'age' as age,
  prefs->>'height' as height,
  prefs->>'build' as build,
  prefs->>'dating_bio' as dating_bio,
  prefs->>'show_me' as show_me_preference,
  prefs->>'age_min' as age_min,
  prefs->>'age_max' as age_max,
  prefs->'interests' as interests
FROM dating_profiles
WHERE profile_id = auth.uid();

-- ============================================================================
-- TEST 3: Get Dating Candidates (with preference filtering)
-- ============================================================================

-- Expected: Returns candidates matching preferences, excluding decided/matched
SELECT rpc_get_dating_candidates(10, 0);

-- Verify returned structure has enriched fields:
-- {
--   "profile_id": "...",
--   "age": 28,
--   "height": "5_8_to_5_11",
--   "build": "athletic",
--   "interests": ["music", "fitness"],
--   "photos": [...],
--   ...
-- }

-- ============================================================================
-- TEST 4: Submit Dating Decision & Match Creation
-- ============================================================================

-- Step 1: User A likes User B
-- (Run as User A)
SELECT rpc_submit_dating_decision(
  '00000000-0000-0000-0000-000000000002'::uuid,  -- User B's profile_id
  'like'
);
-- Expected: { "match": false }

-- Step 2: User B likes User A
-- (Run as User B)
SELECT rpc_submit_dating_decision(
  '00000000-0000-0000-0000-000000000001'::uuid,  -- User A's profile_id
  'like'
);
-- Expected: { "match": true }

-- Verify match was created
SELECT * FROM dating_matches
WHERE (profile_a = LEAST(auth.uid(), '00000000-0000-0000-0000-000000000001'::uuid)
   AND profile_b = GREATEST(auth.uid(), '00000000-0000-0000-0000-000000000001'::uuid));

-- ============================================================================
-- TEST 5: Get My Dating Matches
-- ============================================================================

-- Expected: Returns list of matches with other user's profile data
SELECT rpc_get_my_dating_matches(50, 0);

-- Verify structure includes:
-- {
--   "matched_profile_id": "...",
--   "username": "...",
--   "display_name": "...",
--   "avatar_url": "...",
--   "dating_bio": "...",
--   "age": 28,
--   "interests": [...],
--   "photos": [...],
--   "matched_at": "..."
-- }

-- ============================================================================
-- TEST 6: Preference Filtering Verification
-- ============================================================================

-- Create test users with specific attributes
-- User A: age 25, height 5'8"-5'11", build athletic
-- User B: age 30, height 6'0"-6'3", build average
-- User C: age 40, height 5'4"-5'7", build slim

-- Set preferences: age 24-35, show_me everyone
-- Expected: User A and B appear, User C does not (age filter)

-- ============================================================================
-- TEST 7: "Doesn't Matter" Preferences
-- ============================================================================

-- Set all preferences to "doesnt_matter"
SELECT rpc_upsert_dating_profile(
  true,
  NULL,
  'Los Angeles',
  '[]'::jsonb,
  '{
    "age": 30,
    "show_me": "everyone",
    "age_min": 18,
    "age_max": 99,
    "smoker_ok": "doesnt_matter",
    "drinker_ok": "doesnt_matter",
    "religion_pref": "doesnt_matter",
    "height_pref": "doesnt_matter",
    "build_pref": "doesnt_matter"
  }'::jsonb
);

-- Expected: rpc_get_dating_candidates returns all enabled profiles (no filtering beyond age range)

-- ============================================================================
-- TEST 8: Idempotency & Edge Cases
-- ============================================================================

-- Test 8a: Submit same decision twice
SELECT rpc_submit_dating_decision(
  '00000000-0000-0000-0000-000000000003'::uuid,
  'like'
);
-- Run again
SELECT rpc_submit_dating_decision(
  '00000000-0000-0000-0000-000000000003'::uuid,
  'like'
);
-- Expected: Both succeed, only one row in dating_decisions (UNIQUE constraint)

-- Test 8b: Match creation is idempotent
-- (Both users like each other, run submit multiple times)
-- Expected: Only one row in dating_matches

-- Test 8c: Cannot decide on self
SELECT rpc_submit_dating_decision(auth.uid(), 'like');
-- Expected: ERROR or decision not created (depends on constraint)

-- ============================================================================
-- TEST 9: Data Integrity Checks
-- ============================================================================

-- Check for duplicate matches (should be zero)
SELECT profile_a, profile_b, COUNT(*)
FROM dating_matches
GROUP BY profile_a, profile_b
HAVING COUNT(*) > 1;
-- Expected: Empty result

-- Check LEAST/GREATEST ordering
SELECT * FROM dating_matches
WHERE profile_a > profile_b;
-- Expected: Empty result (all pairs should be ordered)

-- Check all matches have corresponding decisions
SELECT dm.*
FROM dating_matches dm
WHERE NOT EXISTS (
  SELECT 1 FROM dating_decisions dd1
  WHERE dd1.from_profile_id = dm.profile_a
    AND dd1.to_profile_id = dm.profile_b
    AND dd1.decision = 'like'
)
OR NOT EXISTS (
  SELECT 1 FROM dating_decisions dd2
  WHERE dd2.from_profile_id = dm.profile_b
    AND dd2.to_profile_id = dm.profile_a
    AND dd2.decision = 'like'
);
-- Expected: Empty result (all matches should have mutual likes)

-- ============================================================================
-- TEST 10: Performance & Candidate Determinism
-- ============================================================================

-- Run candidates query multiple times
-- Expected: Same ordering for same parameters (deterministic ORDER BY)
SELECT jsonb_array_length(rpc_get_dating_candidates(10, 0));
SELECT jsonb_array_length(rpc_get_dating_candidates(10, 0));
-- Should return same count

-- Test pagination
SELECT rpc_get_dating_candidates(5, 0);  -- First 5
SELECT rpc_get_dating_candidates(5, 5);  -- Next 5
-- Expected: No overlap, consistent ordering

-- ============================================================================
-- ADMIN QUERIES (Direct table access, service_role only)
-- ============================================================================

-- View all dating profiles with prefs
SELECT 
  profile_id,
  enabled,
  prefs->>'age' as age,
  prefs->>'show_me' as show_me,
  prefs->>'age_min' || '-' || prefs->>'age_max' as age_range,
  prefs->'interests' as interests,
  created_at
FROM dating_profiles
ORDER BY created_at DESC
LIMIT 20;

-- View all matches
SELECT 
  dm.profile_a,
  pa.username as user_a_username,
  dm.profile_b,
  pb.username as user_b_username,
  dm.created_at
FROM dating_matches dm
JOIN profiles pa ON pa.id = dm.profile_a
JOIN profiles pb ON pb.id = dm.profile_b
ORDER BY dm.created_at DESC
LIMIT 20;

-- View decision stats
SELECT 
  from_profile_id,
  decision,
  COUNT(*) as count
FROM dating_decisions
GROUP BY from_profile_id, decision
ORDER BY from_profile_id, decision;

-- ============================================================================
-- EXPECTED OUTCOMES SUMMARY
-- ============================================================================
/*
✅ PASS CRITERIA:

1. Profile upsert accepts full prefs JSON and stores correctly
2. Candidate filtering respects age_min/age_max
3. Candidates exclude self, decided, and matched profiles
4. Match creation only happens on mutual likes
5. Matches are unique and ordered (LEAST/GREATEST)
6. "Doesn't matter" preferences do not filter
7. Decisions are idempotent (UNIQUE constraint)
8. All RPCs require authentication (fail in SQL editor)
9. RPC grants are correct (anon for candidates, authenticated for mutations)
10. Ordering is deterministic and pagination works

❌ FAIL INDICATORS:

- "Not authenticated" in SQL editor (EXPECTED - this is correct behavior)
- Duplicate matches in dating_matches
- profile_a > profile_b in any row
- Match without mutual decisions
- Candidates include already-decided profiles
- Candidates violate age range filter
- Any RPC accessible by wrong role

🔒 SECURITY CHECKS:

- anon can call rpc_get_dating_candidates ✅
- anon CANNOT call rpc_upsert_dating_profile ❌
- authenticated can call all dating RPCs except handle_follow_event ✅
- service_role can call handle_follow_event ✅
- RLS blocks direct table writes from wrong users ✅

📊 DATA QUALITY CHECKS:

- No NULL profile_ids in any table
- All photos arrays have ≤ 5 items
- All prefs JSON follows expected structure
- Timestamps are present and reasonable
*/
