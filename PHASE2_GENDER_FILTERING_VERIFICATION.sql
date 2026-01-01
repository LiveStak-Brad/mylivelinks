-- ============================================================================
-- PHASE 2 GENDER FILTERING - VERIFICATION TESTS
-- Run these tests AFTER applying 20251231_profiles_gender_dob.sql
-- ============================================================================

-- ============================================================================
-- SETUP: Create Test Users with Different Genders
-- ============================================================================

-- NOTE: Replace these UUIDs with actual test user IDs from your database
-- OR run this via app client with authenticated sessions

-- Test User A: Male, 28, interested in women
-- Test User B: Female, 25, interested in men
-- Test User C: Female, 30, interested in everyone
-- Test User D: Male, 27, NULL gender (should be excluded from filtered searches)
-- Test User E: Nonbinary, 26, interested in everyone

-- ============================================================================
-- TEST 1: Verify Gender Column Exists with Correct Constraints
-- ============================================================================

-- Expected: gender column exists, type is text, nullable
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'gender';

-- Expected: CHECK constraint allows only specific values
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND conname = 'profiles_gender_check';

-- Expected output should show:
-- CHECK (gender IS NULL OR gender IN ('male', 'female', 'nonbinary', 'other', 'prefer_not_to_say'))

-- ============================================================================
-- TEST 2: Verify DOB Column and 18+ Constraint
-- ============================================================================

-- Expected: date_of_birth column exists, type is date, nullable
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'date_of_birth';

-- Expected: CHECK constraint enforces 18+ years
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND conname = 'profiles_dob_adult_check';

-- Test age calculation function
SELECT 
  calculate_age('1995-06-15'::date) as should_be_around_30,
  calculate_age('2000-01-01'::date) as should_be_around_25,
  calculate_age('2006-12-31'::date) as should_be_18_or_19,
  calculate_age(NULL) as should_be_null;

-- ============================================================================
-- TEST 3: Verify Indexes Created
-- ============================================================================

-- Expected: idx_profiles_gender and idx_profiles_date_of_birth exist
SELECT 
  schemaname,
  tablename,
  indexname, 
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND (indexname = 'idx_profiles_gender' OR indexname = 'idx_profiles_date_of_birth');

-- ============================================================================
-- TEST 4: Gender Filtering - show_me = 'men'
-- ============================================================================

-- Setup: Set viewer's preference to "men"
-- (Run as authenticated User B - female looking for men)
SELECT rpc_upsert_dating_profile(
  true,
  NULL,
  'San Francisco',
  '["photo1.jpg"]'::jsonb,
  '{
    "age": 25,
    "gender": "female",
    "show_me": "men",
    "age_min": 24,
    "age_max": 35
  }'::jsonb
);

-- Get candidates - should ONLY return profiles with gender='male'
SELECT rpc_get_dating_candidates(20, 0);

-- Verification query (direct table check)
SELECT 
  p.username,
  p.gender,
  dp.enabled,
  calculate_age(p.date_of_birth) as age
FROM dating_profiles dp
JOIN profiles p ON p.id = dp.profile_id
WHERE dp.enabled = true
  AND p.gender = 'male'  -- Should match "show_me: men" filter
  AND dp.profile_id != auth.uid();

-- Expected: Only profiles with gender='male' are returned
-- Expected: Profiles with gender=NULL or 'prefer_not_to_say' are EXCLUDED

-- ============================================================================
-- TEST 5: Gender Filtering - show_me = 'women'
-- ============================================================================

-- Setup: Set viewer's preference to "women"
-- (Run as authenticated User A - male looking for women)
SELECT rpc_upsert_dating_profile(
  true,
  NULL,
  'Los Angeles',
  '["photo1.jpg"]'::jsonb,
  '{
    "age": 28,
    "gender": "male",
    "show_me": "women",
    "age_min": 22,
    "age_max": 32
  }'::jsonb
);

-- Get candidates - should ONLY return profiles with gender='female'
SELECT rpc_get_dating_candidates(20, 0);

-- Verification query
SELECT 
  p.username,
  p.gender,
  dp.enabled,
  calculate_age(p.date_of_birth) as age
FROM dating_profiles dp
JOIN profiles p ON p.id = dp.profile_id
WHERE dp.enabled = true
  AND p.gender = 'female'  -- Should match "show_me: women" filter
  AND dp.profile_id != auth.uid();

-- Expected: Only profiles with gender='female' are returned
-- Expected: Profiles with gender=NULL or 'prefer_not_to_say' are EXCLUDED

-- ============================================================================
-- TEST 6: Gender Filtering - show_me = 'everyone'
-- ============================================================================

-- Setup: Set viewer's preference to "everyone"
-- (Run as authenticated User C - female looking for everyone)
SELECT rpc_upsert_dating_profile(
  true,
  NULL,
  'New York',
  '["photo1.jpg"]'::jsonb,
  '{
    "age": 30,
    "gender": "female",
    "show_me": "everyone",
    "age_min": 25,
    "age_max": 40
  }'::jsonb
);

-- Get candidates - should return ALL enabled profiles (any gender)
SELECT rpc_get_dating_candidates(20, 0);

-- Verification query
SELECT 
  p.username,
  p.gender,
  dp.enabled,
  calculate_age(p.date_of_birth) as age
FROM dating_profiles dp
JOIN profiles p ON p.id = dp.profile_id
WHERE dp.enabled = true
  AND dp.profile_id != auth.uid()
ORDER BY dp.updated_at DESC;

-- Expected: All enabled profiles returned regardless of gender
-- Expected: Includes male, female, nonbinary, other, prefer_not_to_say, NULL

-- ============================================================================
-- TEST 7: NULL Gender Exclusion from Filtered Searches
-- ============================================================================

-- Create a test profile with NULL gender
-- (Run as test user D)
UPDATE profiles SET gender = NULL WHERE id = auth.uid();

SELECT rpc_upsert_dating_profile(
  true,
  NULL,
  'Seattle',
  '["photo1.jpg"]'::jsonb,
  '{
    "age": 27
  }'::jsonb
);

-- Now search as User A (show_me='women')
-- Expected: User D (NULL gender) should NOT appear

-- Verification: Count candidates with NULL gender when filtering by 'men' or 'women'
SELECT COUNT(*) as null_gender_count
FROM dating_profiles dp
JOIN profiles p ON p.id = dp.profile_id
WHERE dp.enabled = true
  AND p.gender IS NULL;

-- Expected: This count should be > 0 (NULL genders exist)
-- But when filtering by 'men' or 'women', these should not appear

-- ============================================================================
-- TEST 8: Prefer Not To Say Exclusion from Filtered Searches
-- ============================================================================

-- Create a test profile with 'prefer_not_to_say' gender
-- (Run as test user E)
UPDATE profiles SET gender = 'prefer_not_to_say' WHERE id = auth.uid();

SELECT rpc_upsert_dating_profile(
  true,
  NULL,
  'Portland',
  '["photo1.jpg"]'::jsonb,
  '{
    "age": 29
  }'::jsonb
);

-- Now search as User A (show_me='women') or User B (show_me='men')
-- Expected: User E (prefer_not_to_say) should NOT appear in either

-- Verification query
SELECT 
  p.username,
  p.gender,
  'should not appear in men/women filters' as note
FROM dating_profiles dp
JOIN profiles p ON p.id = dp.profile_id
WHERE dp.enabled = true
  AND p.gender = 'prefer_not_to_say';

-- ============================================================================
-- TEST 9: Anon User Browsing (Graceful Handling)
-- ============================================================================

-- Call rpc_get_dating_candidates without authentication
-- Expected: Returns enabled profiles with show_me='everyone' behavior (no gender filter)
-- OR: Returns empty/error (depending on implementation choice)

-- This must be tested via frontend (logout, then call API)
-- Anon users should get unfiltered results (all enabled profiles)

-- ============================================================================
-- TEST 10: Age Calculation from DOB vs Stored Age
-- ============================================================================

-- User with DOB set (should use calculated age)
UPDATE profiles SET date_of_birth = '1995-06-15' WHERE id = '00000000-0000-0000-0000-000000000001';

-- User without DOB (should fall back to prefs.age)
UPDATE profiles SET date_of_birth = NULL WHERE id = '00000000-0000-0000-0000-000000000002';
-- Set prefs.age for user 2
-- (via rpc_upsert_dating_profile with age in prefs)

-- Verify computed age
SELECT 
  p.id,
  p.username,
  p.date_of_birth,
  calculate_age(p.date_of_birth) as computed_age_from_dob,
  dp.prefs->>'age' as stored_age,
  COALESCE(
    calculate_age(p.date_of_birth),
    (dp.prefs->>'age')::int
  ) as final_age_used
FROM profiles p
LEFT JOIN dating_profiles dp ON dp.profile_id = p.id
WHERE p.id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

-- Expected:
-- User 1: computed_age_from_dob is ~30, final_age_used is ~30
-- User 2: computed_age_from_dob is NULL, final_age_used is stored_age

-- ============================================================================
-- TEST 11: RPC Permissions Still Intact
-- ============================================================================

-- Verify rpc_get_dating_candidates is executable by anon and authenticated
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.role_routine_grants
WHERE routine_name = 'rpc_get_dating_candidates'
ORDER BY grantee;

-- Expected: anon and authenticated have EXECUTE permission

-- ============================================================================
-- TEST 12: Combined Age + Gender Filtering
-- ============================================================================

-- Setup: User A (male, 28) looking for women aged 24-30
SELECT rpc_upsert_dating_profile(
  true,
  NULL,
  'Chicago',
  '["photo1.jpg"]'::jsonb,
  '{
    "age": 28,
    "show_me": "women",
    "age_min": 24,
    "age_max": 30
  }'::jsonb
);

-- Get candidates
SELECT rpc_get_dating_candidates(20, 0);

-- Verification query: should match RPC results
SELECT 
  p.username,
  p.gender,
  COALESCE(
    calculate_age(p.date_of_birth),
    (dp.prefs->>'age')::int
  ) as age
FROM dating_profiles dp
JOIN profiles p ON p.id = dp.profile_id
WHERE dp.enabled = true
  AND dp.profile_id != auth.uid()
  AND p.gender = 'female'  -- Gender filter
  AND COALESCE(
    calculate_age(p.date_of_birth),
    (dp.prefs->>'age')::int
  ) BETWEEN 24 AND 30  -- Age filter
ORDER BY dp.updated_at DESC;

-- Expected: Only female profiles aged 24-30

-- ============================================================================
-- TEST 13: No SQL Errors / RLS Intact
-- ============================================================================

-- Test authenticated user can get candidates
SELECT jsonb_array_length(rpc_get_dating_candidates(10, 0)) as candidate_count;

-- Test authenticated user can upsert their own profile
SELECT rpc_upsert_dating_profile(
  true,
  NULL,
  'Miami',
  '[]'::jsonb,
  '{"age": 25, "show_me": "everyone"}'::jsonb
);

-- Test authenticated user can submit decision
-- (Replace UUID with actual candidate ID)
SELECT rpc_submit_dating_decision(
  '00000000-0000-0000-0000-000000000999'::uuid,
  'like'
);

-- Test authenticated user can get matches
SELECT rpc_get_my_dating_matches(10, 0);

-- All queries should execute without permission errors

-- ============================================================================
-- SUMMARY OF EXPECTED RESULTS
-- ============================================================================

/*
✅ PASS CRITERIA:

1. Gender column exists with CHECK constraint (5 allowed values + NULL)
2. DOB column exists with 18+ constraint
3. Indexes created for gender and date_of_birth
4. calculate_age() function works correctly
5. show_me='men' returns ONLY gender='male' profiles
6. show_me='women' returns ONLY gender='female' profiles
7. show_me='everyone' returns ALL enabled profiles (any gender)
8. NULL gender profiles are EXCLUDED from 'men'/'women' searches
9. 'prefer_not_to_say' profiles are EXCLUDED from 'men'/'women' searches
10. Anon users can browse (unfiltered "everyone" mode)
11. Age calculation prefers DOB, falls back to stored age
12. Combined age + gender filtering works correctly
13. RPC permissions intact (anon + authenticated can execute)
14. No RLS errors or permission issues

❌ FAIL INDICATORS:

- Gender constraint allows invalid values
- DOB allows users under 18
- NULL/prefer_not_to_say appear in 'men' or 'women' filtered searches
- Anon users cannot browse (should allow with default 'everyone')
- Age calculation fails when DOB exists
- RPC returns permission errors
- Candidates include already-decided or matched profiles

🎯 BEHAVIOR NOTE (ANON BROWSING):

✅ **Decision:** Anon users CAN browse dating candidates.
- They receive unfiltered results (show_me='everyone' behavior)
- No gender filtering applied (safe default)
- No exclusion of decided/matched profiles (since anon has no profile)
- This allows discovery before signup (growth-friendly)

Rationale: Dating discovery is public-safe, decisions/matches require auth.
If you want to restrict anon browsing, add:
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to view dating candidates';
  END IF;

Current implementation: Anon browsing ALLOWED with safe defaults.
*/
