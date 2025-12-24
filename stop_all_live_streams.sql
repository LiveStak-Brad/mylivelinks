-- Stop All Active Live Streams
-- This script sets all live streams to inactive (live_available = false)
-- and marks them as ended

-- First, check current active streams
SELECT 
    id,
    profile_id,
    live_available,
    is_published,
    started_at,
    updated_at
FROM live_streams
WHERE live_available = TRUE;

-- Stop all active live streams
UPDATE live_streams
SET 
    live_available = FALSE,
    is_published = FALSE,
    ended_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE live_available = TRUE;

-- Verify all streams are stopped
SELECT 
    id,
    profile_id,
    live_available,
    is_published,
    ended_at
FROM live_streams
WHERE live_available = TRUE;
-- Should return 0 rows

-- Also clean up any active_viewers records (they'll be cleaned up automatically by heartbeat timeout, but this is immediate)
DELETE FROM active_viewers;

-- Show summary
SELECT 
    COUNT(*) FILTER (WHERE live_available = TRUE) as active_streams,
    COUNT(*) FILTER (WHERE live_available = FALSE) as inactive_streams,
    COUNT(*) as total_streams
FROM live_streams;

