-- ============================================================================
-- DATING DATA MODEL EXTENSION
-- Adds rich "About You" and "Preferences" fields to dating_profiles.prefs
-- ============================================================================

-- ============================================================================
-- CURRENT SCHEMA (for reference)
-- ============================================================================
/*
CREATE TABLE dating_profiles (
  profile_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  bio text,  -- Will migrate to prefs.dating_bio
  location_text text,
  photos jsonb DEFAULT '[]'::jsonb,
  prefs jsonb DEFAULT '{}'::jsonb,  -- Will extend this
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
*/

-- ============================================================================
-- NEW PREFS STRUCTURE (jsonb)
-- ============================================================================
/*
{
  // === ABOUT YOU ===
  "age": 28,  // INT (temporary - will derive from DOB later)
  "height": "5'8\"",  // string enum: "under 5'", "5'0\"-5'3\"", "5'4\"-5'7\"", "5'8\"-5'11\"", "6'0\"-6'3\"", "over 6'3\""
  "build": "athletic",  // string enum: "slim", "athletic", "average", "curvy", "heavyset"
  "religion": "christian",  // string enum: "christian", "muslim", "jewish", "hindu", "buddhist", "atheist", "agnostic", "spiritual", "other", "prefer_not_to_say"
  "smoker": "no",  // enum: "yes", "no", "occasionally"
  "drinker": "socially",  // enum: "yes", "no", "socially"
  "interests": ["music", "travel", "fitness"],  // array of strings
  "dating_bio": "Looking for someone who...",  // text (replaces top-level bio)
  
  // === PREFERENCES ===
  "show_me": "everyone",  // enum: "everyone", "men", "women"
  "age_min": 21,  // INT
  "age_max": 35,  // INT
  "smoker_ok": "doesnt_matter",  // enum: "yes", "no", "doesnt_matter"
  "drinker_ok": "doesnt_matter",  // enum: "yes", "no", "doesnt_matter"
  "religion_pref": ["christian", "atheist"],  // array OR "doesnt_matter"
  "height_pref": "doesnt_matter",  // "doesnt_matter" OR object: {"min": "5'4\"", "max": "6'0\""}
  "build_pref": ["athletic", "slim"],  // array OR "doesnt_matter"
  "interests_pref": ["music", "fitness"]  // array OR "doesnt_matter"
}
*/

-- ============================================================================
-- VALIDATION HELPER FUNCTIONS
-- ============================================================================

-- Validate height enum
CREATE OR REPLACE FUNCTION is_valid_height(p_height text)
RETURNS boolean AS $$
BEGIN
  RETURN p_height IN (
    'under_5', '5_0_to_5_3', '5_4_to_5_7', '5_8_to_5_11', '6_0_to_6_3', 'over_6_3', 'doesnt_matter'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate build enum
CREATE OR REPLACE FUNCTION is_valid_build(p_build text)
RETURNS boolean AS $$
BEGIN
  RETURN p_build IN (
    'slim', 'athletic', 'average', 'curvy', 'heavyset', 'doesnt_matter'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate religion enum
CREATE OR REPLACE FUNCTION is_valid_religion(p_religion text)
RETURNS boolean AS $$
BEGIN
  RETURN p_religion IN (
    'christian', 'muslim', 'jewish', 'hindu', 'buddhist', 
    'atheist', 'agnostic', 'spiritual', 'other', 'prefer_not_to_say', 'doesnt_matter'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate smoker/drinker enum
CREATE OR REPLACE FUNCTION is_valid_yes_no_sometimes(p_value text)
RETURNS boolean AS $$
BEGIN
  RETURN p_value IN ('yes', 'no', 'occasionally', 'socially', 'doesnt_matter');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate show_me enum
CREATE OR REPLACE FUNCTION is_valid_show_me(p_show_me text)
RETURNS boolean AS $$
BEGIN
  RETURN p_show_me IN ('everyone', 'men', 'women');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- UPDATED RPC: rpc_upsert_dating_profile
-- Now accepts prefs jsonb with full structure
-- ============================================================================

CREATE OR REPLACE FUNCTION rpc_upsert_dating_profile(
  p_enabled boolean,
  p_bio text DEFAULT NULL,  -- Kept for backward compatibility
  p_location_text text DEFAULT NULL,
  p_photos jsonb DEFAULT '[]'::jsonb,
  p_prefs jsonb DEFAULT '{}'::jsonb  -- NOW ACCEPTS FULL PREFS OBJECT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_result jsonb;
BEGIN
  v_profile_id := auth.uid();
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate photos array length
  IF jsonb_array_length(p_photos) > 5 THEN
    RAISE EXCEPTION 'Maximum 5 photos allowed';
  END IF;
  
  -- Validate age range if provided
  IF (p_prefs->>'age_min')::int IS NOT NULL 
     AND (p_prefs->>'age_max')::int IS NOT NULL 
     AND (p_prefs->>'age_min')::int > (p_prefs->>'age_max')::int THEN
    RAISE EXCEPTION 'age_min cannot be greater than age_max';
  END IF;
  
  -- Validate show_me if provided
  IF p_prefs->>'show_me' IS NOT NULL 
     AND NOT is_valid_show_me(p_prefs->>'show_me') THEN
    RAISE EXCEPTION 'Invalid show_me value';
  END IF;
  
  INSERT INTO dating_profiles (
    profile_id,
    enabled,
    bio,
    location_text,
    photos,
    prefs,
    updated_at
  )
  VALUES (
    v_profile_id,
    p_enabled,
    p_bio,
    p_location_text,
    p_photos,
    p_prefs,  -- Full prefs object stored
    now()
  )
  ON CONFLICT (profile_id) 
  DO UPDATE SET
    enabled = EXCLUDED.enabled,
    bio = EXCLUDED.bio,
    location_text = EXCLUDED.location_text,
    photos = EXCLUDED.photos,
    prefs = EXCLUDED.prefs,  -- Full prefs object updated
    updated_at = now()
  RETURNING to_jsonb(dating_profiles.*) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Update permissions (same as before)
REVOKE ALL ON FUNCTION rpc_upsert_dating_profile(boolean, text, text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_upsert_dating_profile(boolean, text, text, jsonb, jsonb) TO authenticated;

-- ============================================================================
-- UPDATED RPC: rpc_get_dating_candidates
-- Now includes preference-based filtering (Phase 1: minimal)
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
  
  -- If no preferences set, use defaults
  IF v_my_prefs IS NULL THEN
    v_my_prefs := '{
      "show_me": "everyone",
      "age_min": 18,
      "age_max": 99,
      "smoker_ok": "doesnt_matter",
      "drinker_ok": "doesnt_matter"
    }'::jsonb;
  END IF;
  
  -- Get enabled dating profiles with minimal filtering
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
      -- Add computed fields for UI
      'age', (dp.prefs->>'age')::int,
      'height', dp.prefs->>'height',
      'build', dp.prefs->>'build',
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
      -- PHASE 1 FILTERING: Age range only (if age exists)
      AND (
        (dp.prefs->>'age')::int IS NULL  -- Allow if age not set
        OR (
          (dp.prefs->>'age')::int >= COALESCE((v_my_prefs->>'age_min')::int, 18)
          AND (dp.prefs->>'age')::int <= COALESCE((v_my_prefs->>'age_max')::int, 99)
        )
      )
      -- TODO: Add gender filtering when gender field is available
      -- AND (
      --   v_my_prefs->>'show_me' = 'everyone'
      --   OR (v_my_prefs->>'show_me' = 'men' AND p.gender = 'male')
      --   OR (v_my_prefs->>'show_me' = 'women' AND p.gender = 'female')
      -- )
      -- TODO: Add more preference filters as needed (Phase 2)
    ORDER BY dp.updated_at DESC, dp.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) candidates;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Permissions remain same
REVOKE ALL ON FUNCTION rpc_get_dating_candidates(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_get_dating_candidates(int, int) TO anon, authenticated;

-- ============================================================================
-- HELPER: Get my dating profile with full prefs
-- ============================================================================

-- This RPC returns your own dating profile (not needed if using direct SELECT)
-- But useful for consistency
CREATE OR REPLACE FUNCTION rpc_get_my_dating_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_result jsonb;
BEGIN
  v_profile_id := auth.uid();
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT to_jsonb(dp.*) INTO v_result
  FROM dating_profiles dp
  WHERE dp.profile_id = v_profile_id;
  
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION rpc_get_my_dating_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_get_my_dating_profile() TO authenticated;

-- ============================================================================
-- DATA MIGRATION (Optional - if existing data needs updating)
-- ============================================================================

-- Migrate existing bio to prefs.dating_bio (if needed)
UPDATE dating_profiles
SET prefs = jsonb_set(
  COALESCE(prefs, '{}'::jsonb),
  '{dating_bio}',
  to_jsonb(bio)
)
WHERE bio IS NOT NULL 
  AND bio != ''
  AND (prefs->>'dating_bio') IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check prefs structure
SELECT 
  profile_id,
  prefs->>'age' as age,
  prefs->>'height' as height,
  prefs->>'show_me' as show_me,
  prefs->>'age_min' as age_min,
  prefs->>'age_max' as age_max
FROM dating_profiles
WHERE enabled = true
LIMIT 5;

-- Test RPC with prefs
SELECT rpc_upsert_dating_profile(
  true,  -- enabled
  'Old bio',  -- bio (backward compat)
  'New York',  -- location
  '["photo1.jpg"]'::jsonb,  -- photos
  '{
    "age": 28,
    "height": "5_8_to_5_11",
    "build": "athletic",
    "religion": "agnostic",
    "smoker": "no",
    "drinker": "socially",
    "interests": ["music", "fitness", "travel"],
    "dating_bio": "Looking for meaningful connections",
    "show_me": "everyone",
    "age_min": 24,
    "age_max": 35,
    "smoker_ok": "doesnt_matter",
    "drinker_ok": "doesnt_matter"
  }'::jsonb  -- prefs
);

-- Test candidate filtering
SELECT rpc_get_dating_candidates(10, 0);
