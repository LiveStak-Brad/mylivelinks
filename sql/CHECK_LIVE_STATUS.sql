-- Check if any streams are showing as "live" when they shouldn't be

-- 1. Check your profile's live status
SELECT 
  p.username,
  p.display_name,
  p.is_live AS profile_is_live,
  ls.id AS stream_id,
  ls.live_available AS stream_live_available,
  ls.trending_score,
  ls.started_at,
  ls.ended_at
FROM profiles p
LEFT JOIN live_streams ls ON p.id = ls.profile_id
WHERE p.username = 'CannaStreams' -- Replace with your username if different
ORDER BY ls.started_at DESC
LIMIT 5;

-- 2. Check what the trending RPC would return right now
SELECT * FROM rpc_get_trending_live_streams(10, 0);

-- 3. See ALL streams in live_streams table (live or not)
SELECT 
  ls.id,
  p.username,
  ls.live_available,
  p.is_live AS profile_is_live,
  ls.trending_score,
  ls.started_at,
  ls.ended_at
FROM live_streams ls
INNER JOIN profiles p ON ls.profile_id = p.id
ORDER BY ls.started_at DESC
LIMIT 10;

-- 4. If you need to manually end your stream:
-- UPDATE live_streams SET live_available = FALSE, ended_at = now() WHERE profile_id = (SELECT id FROM profiles WHERE username = 'CannaStreams');
-- UPDATE profiles SET is_live = FALSE WHERE username = 'CannaStreams';
