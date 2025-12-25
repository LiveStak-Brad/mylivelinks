-- Manual fix for user stuck in loop
-- Run this in Supabase SQL editor

-- Check current profile state
SELECT 
    id,
    username,
    display_name,
    date_of_birth,
    adult_verified_at,
    created_at
FROM profiles
WHERE id = '9ea409fd-087d-4469-85bb-48814647d6d9';

-- If user has username but missing date_of_birth, you can manually set it
-- (Replace '1990-01-01' with their actual birthdate if known)
-- Uncomment and run if needed:

/*
UPDATE profiles
SET 
    date_of_birth = '1990-01-01',  -- CHANGE THIS to actual DOB
    adult_verified_at = NOW(),
    adult_verified_method = 'admin_manual',
    updated_at = NOW()
WHERE id = '9ea409fd-087d-4469-85bb-48814647d6d9';
*/

-- After fixing, tell the user to:
-- 1. Log out completely
-- 2. Clear browser cache/cookies
-- 3. Log back in
-- 4. Should go directly to homepage now



