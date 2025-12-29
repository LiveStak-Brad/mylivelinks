-- Check what's actually saved for CannaStreams profile
SELECT 
    username,
    profile_type,
    enabled_modules,
    enabled_tabs
FROM profiles
WHERE username = 'CannaStreams';

