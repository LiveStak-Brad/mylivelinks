-- Test what the RPC is ACTUALLY returning for enabled_modules
SELECT 
    (result->'profile'->>'enabled_modules') as enabled_modules_returned,
    (result->'profile'->>'profile_type') as profile_type_returned,
    (result->'profile'->>'username') as username_returned
FROM (
    SELECT get_public_profile_with_adult_filtering('CannaStreams', NULL, 'web') as result
) subquery;

