-- Verify the exact query that SoloStreamViewer uses
-- This simulates what the app does when loading /live/cannastreams

-- Step 1: Find profile (case-insensitive)
SELECT 
  'STEP 1: Profile Query' as step,
  id,
  username,
  display_name,
  avatar_url,
  bio,
  gifter_level
FROM profiles
WHERE username ILIKE 'CannaStreams';

-- Step 2: Find live_streams for that profile
SELECT 
  'STEP 2: Live Streams Query' as step,
  ls.id,
  ls.live_available,
  ls.profile_id
FROM live_streams ls
WHERE ls.profile_id = (
  SELECT id FROM profiles WHERE username ILIKE 'CannaStreams'
);

-- Step 3: Combined query (what the app actually does)
SELECT 
  'STEP 3: Combined Query' as step,
  p.id as profile_id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.gifter_level,
  ls.id as stream_id,
  ls.live_available
FROM profiles p
LEFT JOIN live_streams ls ON ls.profile_id = p.id
WHERE p.username ILIKE 'CannaStreams';
