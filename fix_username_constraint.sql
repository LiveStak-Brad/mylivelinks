-- EMERGENCY FIX: Make username nullable to allow onboarding flow
-- Date: December 25, 2025
-- Issue: username has NOT NULL constraint, preventing profile creation before onboarding

-- ============================================================================
-- STEP 1: Make username column nullable
-- ============================================================================

-- This allows profiles to be created with NULL username
-- Username will be set during onboarding process
ALTER TABLE profiles 
ALTER COLUMN username DROP NOT NULL;

-- Verify the change worked
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name = 'username';
-- Should show: is_nullable = 'YES'

-- ============================================================================
-- Now you can run the original fix script!
-- ============================================================================

-- After running this, go back and run fix_all_stuck_users.sql
-- The INSERT statements will now work because username can be NULL

-- ============================================================================
-- WHY THIS IS SAFE
-- ============================================================================

/*
1. Username UNIQUE constraint is still in place (no duplicates)
2. App code already handles NULL usernames properly
3. Onboarding flow sets username before user can access the app
4. NULL username indicates "incomplete profile" which is expected state
5. This is how the app was designed to work (just schema was wrong)
*/

-- ============================================================================
-- VERIFICATION: Check current state
-- ============================================================================

-- See how many profiles currently have NULL username (should be just the ones we're fixing)
SELECT 
    COUNT(*) FILTER (WHERE username IS NULL) AS null_usernames,
    COUNT(*) FILTER (WHERE username IS NOT NULL) AS has_usernames,
    COUNT(*) AS total
FROM profiles;

