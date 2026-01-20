-- Check CannaStreams profile username
SELECT 
    id,
    username,
    display_name,
    avatar_url,
    is_live
FROM profiles
WHERE username ILIKE '%canna%' OR display_name ILIKE '%canna%';

-- Check if there's a wcba.mo user
SELECT 
    id,
    username,
    display_name,
    avatar_url,
    is_live
FROM profiles
WHERE username ILIKE '%wcba%';

-- Check live_streams for CannaStreams
SELECT 
    ls.id,
    ls.profile_id,
    p.username,
    p.display_name,
    ls.streaming_mode,
    ls.live_available,
    ls.started_at
FROM live_streams ls
JOIN profiles p ON ls.profile_id = p.id
WHERE p.username ILIKE '%canna%'
ORDER BY ls.started_at DESC
LIMIT 5;
