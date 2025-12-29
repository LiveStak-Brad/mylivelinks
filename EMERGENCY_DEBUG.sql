-- ============================================================================
-- EMERGENCY DEBUG: Find out what's wrong
-- ============================================================================

-- 1. Does your profile exist?
SELECT id, username FROM profiles WHERE username = 'CannaStreams';

-- 2. Does the function exist?
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'get_public_profile_with_adult_filtering';

-- 3. Try a simple direct query
SELECT 
    id,
    username,
    display_name
FROM profiles p
WHERE LOWER(p.username) = LOWER('CannaStreams');

-- 4. Check if there are any errors by trying to call it
DO $$
DECLARE
    result json;
BEGIN
    result := get_public_profile_with_adult_filtering('CannaStreams', NULL, 'web');
    RAISE NOTICE 'Result: %', result;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error: % %', SQLERRM, SQLSTATE;
END $$;

