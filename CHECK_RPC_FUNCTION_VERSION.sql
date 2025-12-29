-- Check what version of the RPC function is currently in Supabase
-- This will show the actual function definition

SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'get_public_profile_with_adult_filtering';

