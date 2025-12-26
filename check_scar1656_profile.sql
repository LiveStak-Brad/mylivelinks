-- Check profile data for user stuck in loop
-- User: scar1656@yahoo.com (9ea409fd-087d-4469-85bb-48814647d6d9)

SELECT 
    id,
    username,
    display_name,
    date_of_birth,
    bio,
    adult_verified_at,
    adult_verified_method,
    created_at,
    updated_at
FROM profiles
WHERE id = '9ea409fd-087d-4469-85bb-48814647d6d9';

-- If this returns NO ROWS, the profile was never created!
-- That would explain the loop - user is authenticated but has no profile

-- If it returns a row but username or date_of_birth is NULL:
-- That's also why they're stuck - profile incomplete

-- SOLUTION 1: If NO profile exists, create one:
/*
INSERT INTO profiles (
    id, 
    username, 
    display_name,
    coin_balance,
    earnings_balance,
    gifter_level
)
VALUES (
    '9ea409fd-087d-4469-85bb-48814647d6d9',
    'scar1656',  -- Generate from email
    'Scar1656',
    0,
    0,
    0
);
*/

-- SOLUTION 2: If profile exists but missing data, update it:
/*
UPDATE profiles
SET 
    username = COALESCE(username, 'scar1656'),
    date_of_birth = COALESCE(date_of_birth, '1995-01-01'),  -- Change to real DOB
    adult_verified_at = NOW(),
    adult_verified_method = 'admin_manual',
    updated_at = NOW()
WHERE id = '9ea409fd-087d-4469-85bb-48814647d6d9';
*/

-- After fixing, tell user to:
-- 1. Log out
-- 2. Clear browser cache
-- 3. Log back in





