-- ============================================================================
-- DATING PHASE 2 ADVANCED FILTERING
-- To be applied AFTER gender/DOB schema is confirmed
-- ============================================================================

-- ============================================================================
-- STEP 1: Confirm Schema Information
-- ============================================================================

/*
BEFORE RUNNING THIS PATCH, CONFIRM:

1. Gender field location:
   Table: profiles (or other?)
   Column: gender (or sex?)
   Values: 'male', 'female', 'non_binary', 'other', etc.?

2. Date of Birth field:
   Table: profiles (or dating_profiles?)
   Column: date_of_birth (or dob, birth_date?)
   Type: date, timestamptz, or text?

REPLACE PLACEHOLDERS BELOW WITH ACTUAL VALUES
*/

-- ============================================================================
-- STEP 2: Add Age Calculation Helper (if DOB available)
-- ============================================================================

-- Option A: DOB is in profiles table
CREATE OR REPLACE FUNCTION calculate_age(p_date_of_birth date)
RETURNS int AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM AGE(p_date_of_birth));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Option B: DOB is in dating_profiles.prefs as timestamp
CREATE OR REPLACE FUNCTION calculate_age_from_prefs(p_prefs jsonb)
RETURNS int AS $$
DECLARE
  v_dob date;
BEGIN
  IF p_prefs->>'date_of_birth' IS NULL THEN
    RETURN (p_prefs->>'age')::int; -- Fallback to stored age
  END IF;
  
  v_dob := (p_prefs->>'date_of_birth')::date;
  RETURN EXTRACT(YEAR FROM AGE(v_dob));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- STEP 3: Enhanced rpc_get_dating_candidates with Full Filtering
-- ============================================================================

CREATE OR REPLACE FUNCTION rpc_get_dating_candidates(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_my_prefs jsonb;
  v_result jsonb;
BEGIN
  v_profile_id := auth.uid();
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get my preferences
  SELECT prefs INTO v_my_prefs
  FROM dating_profiles
  WHERE profile_id = v_profile_id;
  
  -- Default preferences if not set
  IF v_my_prefs IS NULL THEN
    v_my_prefs := '{
      "show_me": "everyone",
      "age_min": 18,
      "age_max": 99,
      "smoker_ok": "doesnt_matter",
      "drinker_ok": "doesnt_matter",
      "religion_pref": "doesnt_matter",
      "height_pref": "doesnt_matter",
      "build_pref": "doesnt_matter"
    }'::jsonb;
  END IF;
  
  -- Get filtered candidates
  SELECT jsonb_agg(candidate_data)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'profile_id', dp.profile_id,
      'enabled', dp.enabled,
      'bio', COALESCE(dp.prefs->>'dating_bio', dp.bio),
      'location_text', dp.location_text,
      'photos', dp.photos,
      'prefs', dp.prefs,
      'created_at', dp.created_at,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      -- Computed fields
      'age', (dp.prefs->>'age')::int,  -- TODO: Replace with calculate_age(p.date_of_birth)
      'height', dp.prefs->>'height',
      'build', dp.prefs->>'build',
      'religion', dp.prefs->>'religion',
      'smoker', dp.prefs->>'smoker',
      'drinker', dp.prefs->>'drinker',
      'interests', dp.prefs->'interests'
    ) as candidate_data
    FROM dating_profiles dp
    JOIN profiles p ON p.id = dp.profile_id
    WHERE dp.enabled = true
      AND dp.profile_id != v_profile_id
      
      -- Exclude already decided
      AND NOT EXISTS (
        SELECT 1 FROM dating_decisions dd
        WHERE dd.from_profile_id = v_profile_id
          AND dd.to_profile_id = dp.profile_id
      )
      
      -- Exclude already matched
      AND NOT EXISTS (
        SELECT 1 FROM dating_matches dm
        WHERE (dm.profile_a = LEAST(v_profile_id, dp.profile_id)
           AND dm.profile_b = GREATEST(v_profile_id, dp.profile_id))
      )
      
      -- ==========================================
      -- PHASE 2 FILTERS (ENABLE AFTER CONFIRMATION)
      -- ==========================================
      
      -- FILTER 1: Gender (show_me preference)
      -- TODO: UNCOMMENT after confirming p.gender field exists
      /*
      AND (
        v_my_prefs->>'show_me' = 'everyone'
        OR (v_my_prefs->>'show_me' = 'men' AND p.gender = 'male')
        OR (v_my_prefs->>'show_me' = 'women' AND p.gender = 'female')
      )
      */
      
      -- FILTER 2: Age range (active in Phase 1)
      AND (
        (dp.prefs->>'age')::int IS NULL  -- Allow if age not set
        OR (
          (dp.prefs->>'age')::int >= COALESCE((v_my_prefs->>'age_min')::int, 18)
          AND (dp.prefs->>'age')::int <= COALESCE((v_my_prefs->>'age_max')::int, 99)
        )
      )
      
      -- FILTER 3: Smoker preference
      -- TODO: UNCOMMENT to enable
      /*
      AND (
        v_my_prefs->>'smoker_ok' = 'doesnt_matter'
        OR v_my_prefs->>'smoker_ok' = dp.prefs->>'smoker'
        OR dp.prefs->>'smoker' IS NULL
      )
      */
      
      -- FILTER 4: Drinker preference
      -- TODO: UNCOMMENT to enable
      /*
      AND (
        v_my_prefs->>'drinker_ok' = 'doesnt_matter'
        OR v_my_prefs->>'drinker_ok' = dp.prefs->>'drinker'
        OR dp.prefs->>'drinker' IS NULL
      )
      */
      
      -- FILTER 5: Religion preference
      -- TODO: UNCOMMENT to enable
      /*
      AND (
        v_my_prefs->>'religion_pref' = 'doesnt_matter'
        OR v_my_prefs->'religion_pref' IS NULL
        OR (
          jsonb_typeof(v_my_prefs->'religion_pref') = 'array'
          AND (
            dp.prefs->>'religion' = ANY(
              SELECT jsonb_array_elements_text(v_my_prefs->'religion_pref')
            )
          )
        )
      )
      */
      
      -- FILTER 6: Height preference
      -- TODO: UNCOMMENT to enable (requires height comparison logic)
      /*
      AND (
        v_my_prefs->>'height_pref' = 'doesnt_matter'
        OR v_my_prefs->'height_pref' IS NULL
        OR dp.prefs->>'height' IS NULL
        -- Add height range comparison if height_pref is object
      )
      */
      
      -- FILTER 7: Build preference
      -- TODO: UNCOMMENT to enable
      /*
      AND (
        v_my_prefs->>'build_pref' = 'doesnt_matter'
        OR v_my_prefs->'build_pref' IS NULL
        OR (
          jsonb_typeof(v_my_prefs->'build_pref') = 'array'
          AND (
            dp.prefs->>'build' = ANY(
              SELECT jsonb_array_elements_text(v_my_prefs->'build_pref')
            )
          )
        )
      )
      */
      
      -- FILTER 8: Interest matching (optional, could be scoring-based)
      -- TODO: IMPLEMENT interest matching logic if needed
      
    ORDER BY dp.updated_at DESC, dp.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) candidates;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ============================================================================
-- STEP 4: Migration to DOB-based Age (if applicable)
-- ============================================================================

-- If profiles.date_of_birth exists, update candidates query to use it:
/*
'age', calculate_age(p.date_of_birth),  -- Replace prefs->>'age'
*/

-- If dating_profiles should store DOB instead of age:
/*
-- Add DOB to prefs
UPDATE dating_profiles
SET prefs = jsonb_set(
  prefs,
  '{date_of_birth}',
  to_jsonb((current_date - ((prefs->>'age')::int * interval '1 year'))::date)
)
WHERE (prefs->>'age')::int IS NOT NULL
  AND prefs->>'date_of_birth' IS NULL;

-- Remove age field (optional, can keep for backward compat)
UPDATE dating_profiles
SET prefs = prefs - 'age'
WHERE prefs ? 'date_of_birth';
*/

-- ============================================================================
-- STEP 5: Verification Queries for Phase 2
-- ============================================================================

-- Test gender filtering
-- (Requires at least 2 profiles with different genders)
SELECT rpc_upsert_dating_profile(
  true, NULL, NULL, '[]'::jsonb,
  '{"show_me": "women", "age_min": 18, "age_max": 99}'::jsonb
);
-- Expected: rpc_get_dating_candidates only returns profiles with p.gender = 'female'

-- Test religion filtering
SELECT rpc_upsert_dating_profile(
  true, NULL, NULL, '[]'::jsonb,
  '{"religion_pref": ["christian", "atheist"], "age_min": 18, "age_max": 99}'::jsonb
);
-- Expected: Only candidates with religion in ['christian', 'atheist']

-- Test "doesnt_matter" bypasses filter
SELECT rpc_upsert_dating_profile(
  true, NULL, NULL, '[]'::jsonb,
  '{"smoker_ok": "doesnt_matter", "age_min": 18, "age_max": 99}'::jsonb
);
-- Expected: All candidates regardless of smoker status

-- ============================================================================
-- STEP 6: Performance Optimization (if needed)
-- ============================================================================

-- Add indexes for common filter columns

-- Index on gender (if filtering by gender)
-- CREATE INDEX IF NOT EXISTS idx_profiles_gender ON profiles(gender) WHERE gender IS NOT NULL;

-- Index on dating_profiles prefs age (currently used)
CREATE INDEX IF NOT EXISTS idx_dating_profiles_age 
ON dating_profiles USING BTREE (((prefs->>'age')::int)) 
WHERE enabled = true;

-- Index on DOB (if migrating to DOB-based age)
-- CREATE INDEX IF NOT EXISTS idx_profiles_date_of_birth ON profiles(date_of_birth) WHERE date_of_birth IS NOT NULL;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_dating_profiles_enabled_updated 
ON dating_profiles(enabled, updated_at DESC, created_at DESC) 
WHERE enabled = true;

-- ============================================================================
-- ROLLBACK PLAN (if Phase 2 causes issues)
-- ============================================================================

-- To revert to Phase 1 (age-only filtering), just comment out all Phase 2 filters
-- and re-run the CREATE OR REPLACE FUNCTION for rpc_get_dating_candidates

-- ============================================================================
-- CHECKLIST BEFORE ENABLING PHASE 2
-- ============================================================================

/*
✅ CONFIRM BEFORE UNCOMMENTING FILTERS:

1. [ ] Gender field exists in profiles table
2. [ ] Gender values are consistent ('male', 'female', etc.)
3. [ ] At least 10+ test profiles with varied attributes exist
4. [ ] Phase 1 (age filtering) is working correctly
5. [ ] UI is ready to handle filtered results (may return fewer candidates)
6. [ ] Indexes are created for performance
7. [ ] Backup of database is taken (production safety)

⚠️ WARNING:
Enabling too many filters at once may result in:
- Empty candidate lists for users with strict preferences
- Poor user experience if not enough profiles exist
- Performance issues if indexes are missing

RECOMMENDATION:
Enable filters gradually:
- Week 1: Gender + Age (Phase 1 + gender)
- Week 2: Add smoker/drinker
- Week 3: Add religion/build
- Monitor candidate list sizes at each step
*/
