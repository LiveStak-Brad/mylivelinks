-- ============================================================================
-- CHECK AND UPDATE: get_public_profile_with_adult_filtering
-- ============================================================================
-- This function needs to SELECT enabled_modules from profiles table
-- ============================================================================

-- Step 1: See the current function definition
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_public_profile_with_adult_filtering';

-- Step 2: Find all mentions of enabled_modules in functions
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_definition LIKE '%enabled_modules%';

-- ============================================================================
-- If the function definition doesn't include enabled_modules, we need to add it
-- ============================================================================

-- Step 3: Check what your profile currently has
SELECT 
    id,
    username,
    profile_type,
    enabled_modules,
    updated_at
FROM profiles
WHERE username = 'CannaStreams'  -- Replace with your username if different
LIMIT 1;

-- ============================================================================
-- IMPORTANT: Look at the output from Step 3
-- ============================================================================
-- If enabled_modules shows NULL, you need to save your settings again
-- If enabled_modules shows an array like {social_counts,links}, then the
-- RPC function needs to be updated to SELECT this column
-- ============================================================================

