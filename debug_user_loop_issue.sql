-- Check user profile status
-- Run this in Supabase SQL editor to diagnose the issue

SELECT 
    id,
    username,
    display_name,
    date_of_birth,
    created_at,
    updated_at,
    coin_balance,
    is_live
FROM profiles
WHERE id = '9ea409fd-087d-4469-85bb-48814647d6d9';

-- Also check auth.users table
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE id = '9ea409fd-087d-4469-85bb-48814647d6d9';



