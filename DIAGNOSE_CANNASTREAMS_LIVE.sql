-- DIAGNOSTIC: Check CannaStreams profile and live_streams record
-- Run this to see what's actually in the database

-- 1. Check if profile exists
SELECT 
  'PROFILE CHECK' as check_type,
  id as profile_id,
  username,
  display_name,
  created_at
FROM profiles
WHERE username ILIKE 'CannaStreams';

-- 2. Check if live_streams record exists for this profile
SELECT 
  'LIVE_STREAMS CHECK' as check_type,
  ls.id as stream_id,
  ls.profile_id,
  ls.live_available,
  ls.stream_title,
  ls.created_at,
  ls.updated_at,
  p.username
FROM live_streams ls
JOIN profiles p ON p.id = ls.profile_id
WHERE p.username ILIKE 'CannaStreams';

-- 3. Check ALL live_streams records (to see if any exist)
SELECT 
  'ALL LIVE_STREAMS' as check_type,
  ls.id as stream_id,
  ls.profile_id,
  ls.live_available,
  ls.stream_title,
  p.username
FROM live_streams ls
JOIN profiles p ON p.id = ls.profile_id
ORDER BY ls.created_at DESC
LIMIT 10;
