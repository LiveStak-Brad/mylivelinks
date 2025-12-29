-- ============================================
-- FIX #1: SYNC FOLLOWER_COUNT CACHE
-- ============================================
-- Root Cause: follower_count in profiles table is stale (11 vs actual 39)
-- Solution: Update the cached count to match reality

-- Update Brad's follower count to match actual follows table
UPDATE profiles
SET follower_count = (
  SELECT COUNT(*)
  FROM follows
  WHERE followee_id = '2b4a1178-3c39-4179-94ea-314dd824a818'
)
WHERE id = '2b4a1178-3c39-4179-94ea-314dd824a818';

-- Verify the fix
SELECT 
  p.username,
  p.follower_count as cached_count,
  (SELECT COUNT(*) FROM follows WHERE followee_id = p.id) as actual_count
FROM profiles p
WHERE p.id = '2b4a1178-3c39-4179-94ea-314dd824a818';

-- ============================================
-- FIX #2: CREATE/UPDATE FOLLOWER_COUNT TRIGGER
-- ============================================
-- Ensure follower_count stays in sync automatically

CREATE OR REPLACE FUNCTION update_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles
    SET follower_count = follower_count + 1
    WHERE id = NEW.followee_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles
    SET follower_count = GREATEST(0, follower_count - 1)
    WHERE id = OLD.followee_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_follower_count ON follows;

CREATE TRIGGER sync_follower_count
AFTER INSERT OR DELETE ON follows
FOR EACH ROW
EXECUTE FUNCTION update_follower_count();

-- ============================================
-- FIX #3: BULK FIX ALL STALE FOLLOWER COUNTS
-- ============================================
-- Fix everyone's follower_count, not just Brad's

UPDATE profiles p
SET follower_count = (
  SELECT COUNT(*)
  FROM follows f
  WHERE f.followee_id = p.id
);

-- Verify bulk fix
SELECT 
  username,
  follower_count as cached,
  (SELECT COUNT(*) FROM follows WHERE followee_id = profiles.id) as actual,
  follower_count - (SELECT COUNT(*) FROM follows WHERE followee_id = profiles.id) as diff
FROM profiles
WHERE follower_count != (SELECT COUNT(*) FROM follows WHERE followee_id = profiles.id)
LIMIT 20;

