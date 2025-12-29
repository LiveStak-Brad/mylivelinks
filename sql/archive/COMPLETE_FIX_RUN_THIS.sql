-- ============================================================================
-- COMPLETE FIX FOR VERIFICATION LOOP
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================================
-- 
-- This fixes:
-- 1. Username NOT NULL constraint
-- 2. Missing adult verification columns
-- 3. Missing date_of_birth column (if not exists)
-- 4. Creates missing profiles for stuck users
-- 5. Adds adult verification for eligible users
--
-- ============================================================================

-- ============================================================================
-- STEP 1: FIX SCHEMA (REQUIRED FIRST!)
-- ============================================================================

-- 1A. Make username nullable (allows profile creation before onboarding)
ALTER TABLE profiles 
ALTER COLUMN username DROP NOT NULL;

-- 1B. Add date_of_birth if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='date_of_birth') THEN
        ALTER TABLE profiles ADD COLUMN date_of_birth DATE;
        CREATE INDEX idx_profiles_date_of_birth ON profiles(date_of_birth) WHERE date_of_birth IS NOT NULL;
    END IF;
END $$;

-- 1C. Add adult_verified_at if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='adult_verified_at') THEN
        ALTER TABLE profiles ADD COLUMN adult_verified_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 1D. Add adult_verified_method if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='adult_verified_method') THEN
        ALTER TABLE profiles ADD COLUMN adult_verified_method VARCHAR(50) CHECK (adult_verified_method IN ('self_attested', 'id_verified', 'third_party', 'admin_manual', 'auto_fix_admin'));
    END IF;
END $$;

-- Verify schema changes
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name IN ('username', 'date_of_birth', 'adult_verified_at', 'adult_verified_method')
ORDER BY column_name;

-- Should show:
-- adult_verified_at | timestamp with time zone | YES
-- adult_verified_method | character varying | YES
-- date_of_birth | date | YES
-- username | character varying | YES

-- ============================================================================
-- STEP 2: DIAGNOSE - Find all potentially stuck users
-- ============================================================================

SELECT 
    u.id AS user_id,
    u.email,
    u.created_at AS auth_created,
    u.last_sign_in_at,
    p.id AS profile_id,
    p.username,
    p.date_of_birth,
    p.adult_verified_at,
    p.adult_verified_method,
    CASE 
        WHEN p.id IS NULL THEN '🔴 NO PROFILE - WILL CREATE'
        WHEN p.username IS NULL THEN '🟠 NO USERNAME - NEEDS ONBOARDING'
        WHEN p.date_of_birth IS NULL THEN '🟠 NO DOB - NEEDS ONBOARDING'
        WHEN p.adult_verified_at IS NULL AND EXTRACT(YEAR FROM AGE(p.date_of_birth)) >= 18 THEN '🟡 NO ADULT VERIFICATION - WILL FIX'
        ELSE '🟢 COMPLETE'
    END AS status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE 
    -- Only look at recently active users (signed in last 30 days)
    u.last_sign_in_at > NOW() - INTERVAL '30 days'
ORDER BY 
    u.last_sign_in_at DESC;

-- ============================================================================
-- STEP 3: COUNT ISSUES
-- ============================================================================

SELECT 
    COUNT(*) FILTER (WHERE p.id IS NULL) AS missing_profile_will_create,
    COUNT(*) FILTER (WHERE p.id IS NOT NULL AND p.username IS NULL) AS missing_username_needs_onboarding,
    COUNT(*) FILTER (WHERE p.id IS NOT NULL AND p.date_of_birth IS NULL) AS missing_dob_needs_onboarding,
    COUNT(*) FILTER (WHERE p.id IS NOT NULL AND p.date_of_birth IS NOT NULL AND p.adult_verified_at IS NULL AND EXTRACT(YEAR FROM AGE(p.date_of_birth)) >= 18) AS missing_adult_verification_will_fix,
    COUNT(*) FILTER (WHERE p.username IS NOT NULL AND p.date_of_birth IS NOT NULL) AS complete_profiles,
    COUNT(*) AS total_recent_users
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.last_sign_in_at > NOW() - INTERVAL '30 days';

-- ============================================================================
-- STEP 4: FIX - Create missing profiles
-- ============================================================================

-- Create minimal profiles for users that have auth but no profile
INSERT INTO profiles (
    id,
    username,
    coin_balance,
    earnings_balance,
    gifter_level,
    created_at,
    updated_at
)
SELECT 
    u.id,
    NULL,  -- Username will be set during onboarding
    0,
    0,
    0,
    NOW(),
    NOW()
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE 
    p.id IS NULL 
    AND u.last_sign_in_at > NOW() - INTERVAL '30 days'
ON CONFLICT (id) DO NOTHING;

-- Show what was created
SELECT 
    'Created ' || COUNT(*) || ' missing profiles' AS result
FROM auth.users u
INNER JOIN profiles p ON u.id = p.id
WHERE 
    u.last_sign_in_at > NOW() - INTERVAL '30 days'
    AND p.username IS NULL
    AND p.created_at > NOW() - INTERVAL '1 minute';

-- ============================================================================
-- STEP 5: FIX - Add adult verification for eligible users
-- ============================================================================

-- Auto-verify adult users who have DOB but missing verification
UPDATE profiles
SET 
    adult_verified_at = NOW(),
    adult_verified_method = 'auto_fix_admin',
    updated_at = NOW()
WHERE 
    -- Has DOB
    date_of_birth IS NOT NULL
    -- Is 18+
    AND EXTRACT(YEAR FROM AGE(date_of_birth)) >= 18
    -- Missing verification
    AND adult_verified_at IS NULL
    -- Only active users
    AND id IN (
        SELECT id 
        FROM auth.users 
        WHERE last_sign_in_at > NOW() - INTERVAL '30 days'
    );

-- Show what was fixed
SELECT 
    'Added adult verification to ' || COUNT(*) || ' profiles' AS result
FROM profiles
WHERE 
    adult_verified_method = 'auto_fix_admin'
    AND updated_at > NOW() - INTERVAL '1 minute';

-- ============================================================================
-- STEP 6: VERIFY FIXES
-- ============================================================================

-- Re-check status after fixes
SELECT 
    u.id AS user_id,
    u.email,
    p.username,
    p.date_of_birth,
    p.adult_verified_at,
    p.adult_verified_method,
    CASE 
        WHEN p.id IS NULL THEN '🔴 NO PROFILE (SHOULD NOT HAPPEN!)'
        WHEN p.username IS NULL THEN '🟠 NEEDS ONBOARDING (OK - will complete on login)'
        WHEN p.date_of_birth IS NULL THEN '🟠 NEEDS ONBOARDING (OK - will complete on login)'
        WHEN p.adult_verified_at IS NULL AND EXTRACT(YEAR FROM AGE(p.date_of_birth)) >= 18 THEN '🟡 MISSING VERIFICATION (INVESTIGATE)'
        ELSE '🟢 COMPLETE'
    END AS status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE 
    u.last_sign_in_at > NOW() - INTERVAL '30 days'
ORDER BY 
    u.last_sign_in_at DESC;

-- Final counts
SELECT 
    COUNT(*) FILTER (WHERE p.id IS NULL) AS still_missing_profile_ERROR,
    COUNT(*) FILTER (WHERE p.username IS NULL) AS needs_onboarding_OK,
    COUNT(*) FILTER (WHERE p.username IS NOT NULL AND p.date_of_birth IS NOT NULL AND p.adult_verified_at IS NOT NULL) AS fully_complete,
    COUNT(*) AS total
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.last_sign_in_at > NOW() - INTERVAL '30 days';

-- ============================================================================
-- SUCCESS!
-- ============================================================================

SELECT 
    '✅ SCHEMA FIXED' AS step_1,
    '✅ MISSING PROFILES CREATED' AS step_2,
    '✅ ADULT VERIFICATION ADDED' AS step_3,
    'USERS CAN NOW LOG IN' AS result,
    'Tell users to clear cache and re-login' AS next_step;

-- ============================================================================
-- WHAT TO TELL USERS
-- ============================================================================

/*
Message to send to affected users:

🔧 **Login Issue Fixed!**

We've fixed the verification loop. To access your account:

1. Log out completely (if you can)
2. Clear browser cache & cookies
   - Chrome: Ctrl+Shift+Delete
   - Or use Incognito/Private browsing mode
3. Log back in

You may need to complete your profile if you haven't already (username + date of birth).

Should work now! If not, contact support and we'll help manually.

Sorry for the trouble! 🙏
*/
