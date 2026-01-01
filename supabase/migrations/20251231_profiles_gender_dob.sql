-- ============================================================================
-- PROFILES GENDER + DOB EXTENSION
-- Adds gender and date_of_birth to profiles for Dating filtering
-- ============================================================================

-- ============================================================================
-- 1. ADD GENDER COLUMN
-- ============================================================================

-- Add gender column (optional, for dating preferences)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender text;

-- Add constraint for valid gender values
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_gender_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_gender_check 
CHECK (
  gender IS NULL 
  OR gender IN ('male', 'female', 'nonbinary', 'other', 'prefer_not_to_say')
);

-- Add index for dating candidate filtering
CREATE INDEX IF NOT EXISTS idx_profiles_gender 
ON public.profiles(gender) 
WHERE gender IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.profiles.gender IS 
  'Optional gender for dating preferences. Values: male, female, nonbinary, other, prefer_not_to_say, or NULL';

-- ============================================================================
-- 2. ADD DATE OF BIRTH COLUMN
-- ============================================================================

-- Add date_of_birth column (optional, for age calculation)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Add constraint: must be at least 18 years old
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_dob_adult_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_dob_adult_check 
CHECK (
  date_of_birth IS NULL 
  OR date_of_birth <= (CURRENT_DATE - INTERVAL '18 years')
);

-- Add index for age-based filtering
CREATE INDEX IF NOT EXISTS idx_profiles_date_of_birth 
ON public.profiles(date_of_birth) 
WHERE date_of_birth IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.profiles.date_of_birth IS 
  'Date of birth for age calculation. Must be 18+ years old.';

-- ============================================================================
-- 3. AGE CALCULATION HELPER FUNCTION
-- ============================================================================

-- Calculate age from date of birth
CREATE OR REPLACE FUNCTION calculate_age(p_date_of_birth date)
RETURNS int AS $$
BEGIN
  IF p_date_of_birth IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p_date_of_birth))::int;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_age(date) IS 
  'Calculate current age from date of birth';

-- ============================================================================
-- 4. UPDATED RPC: rpc_get_dating_candidates (WITH GENDER FILTERING)
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
  v_show_me text;
  v_result jsonb;
BEGIN
  v_profile_id := auth.uid();
  
  -- For authenticated users, get their preferences
  IF v_profile_id IS NOT NULL THEN
    SELECT prefs INTO v_my_prefs
    FROM dating_profiles
    WHERE profile_id = v_profile_id;
    
    -- Default preferences if not set
    IF v_my_prefs IS NULL THEN
      v_my_prefs := '{
        "show_me": "everyone",
        "age_min": 18,
        "age_max": 99
      }'::jsonb;
    END IF;
    
    v_show_me := COALESCE(v_my_prefs->>'show_me', 'everyone');
  ELSE
    -- Anon users: default to "everyone" (no gender filtering)
    v_my_prefs := '{
      "show_me": "everyone",
      "age_min": 18,
      "age_max": 99
    }'::jsonb;
    v_show_me := 'everyone';
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
      'gender', p.gender,
      -- Computed age: prefer DOB, fallback to stored age
      'age', COALESCE(
        calculate_age(p.date_of_birth),
        (dp.prefs->>'age')::int
      ),
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
      AND (v_profile_id IS NULL OR dp.profile_id != v_profile_id)
      
      -- Exclude already decided (only for authenticated users)
      AND (
        v_profile_id IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM dating_decisions dd
          WHERE dd.from_profile_id = v_profile_id
            AND dd.to_profile_id = dp.profile_id
        )
      )
      
      -- Exclude already matched (only for authenticated users)
      AND (
        v_profile_id IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM dating_matches dm
          WHERE (dm.profile_a = LEAST(v_profile_id, dp.profile_id)
             AND dm.profile_b = GREATEST(v_profile_id, dp.profile_id))
        )
      )
      
      -- ==========================================
      -- PHASE 2: GENDER FILTERING (NOW ACTIVE)
      -- ==========================================
      AND (
        v_show_me = 'everyone'  -- No gender filter
        OR (
          v_show_me = 'men' 
          AND p.gender = 'male'  -- Only male profiles
        )
        OR (
          v_show_me = 'women' 
          AND p.gender = 'female'  -- Only female profiles
        )
      )
      -- Note: NULL or prefer_not_to_say are excluded from 'men'/'women' modes
      
      -- ==========================================
      -- AGE RANGE FILTERING (PHASE 1 - ACTIVE)
      -- ==========================================
      AND (
        -- Prefer DOB-based age, fallback to stored age
        COALESCE(
          calculate_age(p.date_of_birth),
          (dp.prefs->>'age')::int
        ) IS NULL  -- Allow if age not set
        OR (
          COALESCE(
            calculate_age(p.date_of_birth),
            (dp.prefs->>'age')::int
          ) >= COALESCE((v_my_prefs->>'age_min')::int, 18)
          AND COALESCE(
            calculate_age(p.date_of_birth),
            (dp.prefs->>'age')::int
          ) <= COALESCE((v_my_prefs->>'age_max')::int, 99)
        )
      )
      
    ORDER BY dp.updated_at DESC, dp.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) candidates;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Keep existing permissions
REVOKE ALL ON FUNCTION rpc_get_dating_candidates(int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_dating_candidates(int, int) TO anon, authenticated;

COMMENT ON FUNCTION rpc_get_dating_candidates(int, int) IS 
  'Get dating candidates with gender and age filtering. Anon users get unfiltered "everyone" results.';

-- ============================================================================
-- 5. HELPER: Get profile with computed age
-- ============================================================================

-- This view can be used to easily get profiles with computed age
CREATE OR REPLACE VIEW profiles_with_age AS
SELECT 
  p.*,
  calculate_age(p.date_of_birth) as computed_age
FROM profiles p;

COMMENT ON VIEW profiles_with_age IS 
  'Profiles with computed age from DOB. Falls back to NULL if DOB not set.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Query 1: Check gender column exists and has correct constraint
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name IN ('gender', 'date_of_birth');

-- Query 2: Check gender constraint values
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND conname LIKE '%gender%';

-- Query 3: Check DOB constraint (18+ years)
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND conname LIKE '%dob%';

-- Query 4: Test calculate_age function
SELECT 
  calculate_age('1995-06-15'::date) as age_1995,
  calculate_age('2000-01-01'::date) as age_2000,
  calculate_age('2006-12-31'::date) as age_2006,
  calculate_age(NULL) as age_null;

-- Query 5: Check indexes created
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND (indexname LIKE '%gender%' OR indexname LIKE '%date_of_birth%');

-- ============================================================================
-- TESTING DATA (Optional - for verification)
-- ============================================================================

-- Create test profiles with different genders (uncomment to use)
/*
-- Test user 1: Male, 28 years old
UPDATE profiles 
SET gender = 'male', date_of_birth = '1997-01-01'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Test user 2: Female, 25 years old
UPDATE profiles 
SET gender = 'female', date_of_birth = '2000-06-15'
WHERE id = '00000000-0000-0000-0000-000000000002';

-- Test user 3: Nonbinary, 30 years old
UPDATE profiles 
SET gender = 'nonbinary', date_of_birth = '1995-03-20'
WHERE id = '00000000-0000-0000-0000-000000000003';

-- Test user 4: Prefer not to say, 27 years old
UPDATE profiles 
SET gender = 'prefer_not_to_say', date_of_birth = '1998-09-10'
WHERE id = '00000000-0000-0000-0000-000000000004';

-- Test user 5: NULL gender, 26 years old
UPDATE profiles 
SET gender = NULL, date_of_birth = '1999-11-05'
WHERE id = '00000000-0000-0000-0000-000000000005';
*/
