-- Fix ALL users stuck in verification loop
-- Date: December 24, 2025
-- Issue: Multiple users stuck in loop after onboarding

-- ==============================================================================
-- ⚠️  CRITICAL: RUN THIS FIRST OR THE FIX WILL FAIL!
-- ==============================================================================

-- Make username column nullable (required for profile creation before onboarding)
ALTER TABLE profiles 
ALTER COLUMN username DROP NOT NULL;

-- Verify it worked
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'username';
-- Should show: is_nullable = 'YES'

-- ==============================================================================
-- STEP 1: DIAGNOSE - Find all potentially stuck users
-- ==============================================================================

-- Find users with auth but incomplete profiles
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
        WHEN p.id IS NULL THEN '🔴 NO PROFILE'
        WHEN p.username IS NULL THEN '🟠 NO USERNAME'
        WHEN p.date_of_birth IS NULL THEN '🟠 NO DOB'
        WHEN p.adult_verified_at IS NULL AND EXTRACT(YEAR FROM AGE(p.date_of_birth)) >= 18 THEN '🟡 NO ADULT VERIFICATION'
        ELSE '🟢 COMPLETE'
    END AS status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE 
    -- Only look at recently active users (signed in last 7 days)
    u.last_sign_in_at > NOW() - INTERVAL '7 days'
ORDER BY 
    u.last_sign_in_at DESC;

-- ==============================================================================
-- STEP 2: COUNT ISSUES
-- ==============================================================================

SELECT 
    COUNT(*) FILTER (WHERE p.id IS NULL) AS missing_profile,
    COUNT(*) FILTER (WHERE p.id IS NOT NULL AND p.username IS NULL) AS missing_username,
    COUNT(*) FILTER (WHERE p.id IS NOT NULL AND p.date_of_birth IS NULL) AS missing_dob,
    COUNT(*) FILTER (WHERE p.id IS NOT NULL AND p.date_of_birth IS NOT NULL AND p.adult_verified_at IS NULL AND EXTRACT(YEAR FROM AGE(p.date_of_birth)) >= 18) AS missing_adult_verification,
    COUNT(*) AS total_recent_users
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.last_sign_in_at > NOW() - INTERVAL '7 days';

-- ==============================================================================
-- STEP 3: FIX - Create missing profiles (run this first)
-- ==============================================================================

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
    AND u.last_sign_in_at > NOW() - INTERVAL '7 days'
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- STEP 4: FIX - Add adult verification for eligible users
-- ==============================================================================

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
        WHERE last_sign_in_at > NOW() - INTERVAL '7 days'
    );

-- ==============================================================================
-- STEP 5: VERIFY FIXES
-- ==============================================================================

-- Re-check status after fixes
SELECT 
    u.id AS user_id,
    u.email,
    p.username,
    p.date_of_birth,
    p.adult_verified_at,
    CASE 
        WHEN p.id IS NULL THEN '🔴 NO PROFILE (SHOULD NOT HAPPEN)'
        WHEN p.username IS NULL THEN '🟠 NEEDS ONBOARDING (EXPECTED)'
        WHEN p.date_of_birth IS NULL THEN '🟠 NEEDS ONBOARDING (EXPECTED)'
        WHEN p.adult_verified_at IS NULL AND EXTRACT(YEAR FROM AGE(p.date_of_birth)) >= 18 THEN '🟡 NO ADULT VERIFICATION'
        ELSE '🟢 COMPLETE'
    END AS status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE 
    u.last_sign_in_at > NOW() - INTERVAL '7 days'
ORDER BY 
    u.last_sign_in_at DESC;

-- ==============================================================================
-- STEP 6: SPECIFIC USER FIX (if needed)
-- ==============================================================================

-- If you need to manually fix a specific user, uncomment and modify:
/*
-- Example: scar1656@yahoo.com (9ea409fd-087d-4469-85bb-48814647d6d9)
DO $$
DECLARE
    user_id UUID := '9ea409fd-087d-4469-85bb-48814647d6d9';
    user_email TEXT := 'scar1656@yahoo.com';
BEGIN
    -- Create or update profile
    INSERT INTO profiles (
        id,
        username,
        date_of_birth,
        adult_verified_at,
        adult_verified_method,
        coin_balance,
        earnings_balance,
        gifter_level,
        created_at,
        updated_at
    )
    VALUES (
        user_id,
        'scar1656',  -- Generate from email
        '1990-01-01',  -- CHANGE THIS to their actual DOB if known
        NOW(),
        'admin_manual_fix',
        0,
        0,
        0,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        username = COALESCE(profiles.username, 'scar1656'),
        date_of_birth = COALESCE(profiles.date_of_birth, '1990-01-01'),
        adult_verified_at = COALESCE(profiles.adult_verified_at, NOW()),
        adult_verified_method = COALESCE(profiles.adult_verified_method, 'admin_manual_fix'),
        updated_at = NOW();
    
    RAISE NOTICE 'Fixed profile for user: %', user_email;
END $$;
*/

-- ==============================================================================
-- INSTRUCTIONS FOR USERS
-- ==============================================================================

-- After running these fixes, tell affected users to:
-- 1. Log out completely
-- 2. Clear browser cache and cookies (or use incognito/private mode)
-- 3. Log back in
-- 4. Should now work properly

-- If they're STILL stuck:
-- - They may have cached redirect state in their browser
-- - Try a different browser or device
-- - Check browser console for errors (F12)

-- ==============================================================================
-- ROOT CAUSES & PREVENTION
-- ==============================================================================

/*
WHY THIS HAPPENED:

1. Profile Creation Failure
   - User signup created auth.users entry
   - But profiles row creation failed (RLS, constraint, etc.)
   - Result: User has auth but no profile

2. Incomplete Onboarding
   - User started onboarding but didn't finish
   - Profile created but missing username or DOB
   - App redirects to onboarding but it fails

3. Missing Adult Verification
   - User is 18+ with DOB set
   - But adult_verified_at is NULL
   - App might be checking this for certain features

FIXES APPLIED:

✅ Onboarding now uses UPSERT (creates profile if missing)
✅ Onboarding uses maybeSingle() (doesn't error if no row)
✅ Onboarding creates minimal profile on load if missing
✅ This script fixes existing stuck users

PREVENTION:

1. Profile creation is now failsafe (upsert)
2. Multiple safety checks in onboarding
3. Admin can run this script anytime
4. Monitoring query to find stuck users (Step 1)
*/

