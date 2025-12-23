-- Cleanup script to remove fake/test live_streams records
-- This identifies and removes streams that appear to be seed/test data

-- First, let's see what fake streams exist (for review)
SELECT 
  ls.id,
  ls.profile_id,
  p.username,
  ls.live_available,
  ls.is_published,
  ls.created_at
FROM live_streams ls
LEFT JOIN profiles p ON ls.profile_id = p.id
WHERE 
  -- Seed/test profile IDs
  ls.profile_id LIKE 'seed-%' OR
  ls.profile_id LIKE 'demo-%' OR
  -- Seed/test usernames
  p.username LIKE 'demo_user_%' OR
  p.username LIKE 'seed-%' OR
  -- Very old test data (older than 7 days, adjust as needed)
  (ls.created_at < NOW() - INTERVAL '7 days' AND ls.live_available = false AND ls.is_published = false)
ORDER BY ls.created_at DESC;

-- Uncomment the DELETE statement below to actually remove fake streams
-- WARNING: This will permanently delete the records!

/*
DELETE FROM live_streams
WHERE id IN (
  SELECT ls.id
  FROM live_streams ls
  LEFT JOIN profiles p ON ls.profile_id = p.id
  WHERE 
    ls.profile_id LIKE 'seed-%' OR
    ls.profile_id LIKE 'demo-%' OR
    p.username LIKE 'demo_user_%' OR
    p.username LIKE 'seed-%' OR
    (ls.created_at < NOW() - INTERVAL '7 days' AND ls.live_available = false AND ls.is_published = false)
);
*/

-- Alternative: Just set all fake streams to inactive (safer)
-- Uncomment to set fake streams to inactive instead of deleting
/*
UPDATE live_streams
SET 
  live_available = false,
  is_published = false,
  updated_at = NOW()
WHERE id IN (
  SELECT ls.id
  FROM live_streams ls
  LEFT JOIN profiles p ON ls.profile_id = p.id
  WHERE 
    ls.profile_id LIKE 'seed-%' OR
    ls.profile_id LIKE 'demo-%' OR
    p.username LIKE 'demo_user_%' OR
    p.username LIKE 'seed-%'
);
*/

