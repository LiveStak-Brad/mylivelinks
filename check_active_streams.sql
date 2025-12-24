-- Check for Currently Active Live Streams
-- Run this to see if any streams are currently live

-- Active streams (live_available = true)
SELECT 
    ls.id,
    ls.profile_id,
    p.username,
    ls.live_available,
    ls.is_published,
    ls.started_at,
    ls.updated_at,
    COUNT(av.id) as active_viewer_count
FROM live_streams ls
LEFT JOIN profiles p ON ls.profile_id = p.id
LEFT JOIN active_viewers av ON av.live_stream_id = ls.id
WHERE ls.live_available = TRUE
GROUP BY ls.id, ls.profile_id, p.username, ls.live_available, ls.is_published, ls.started_at, ls.updated_at
ORDER BY ls.started_at DESC;

-- Summary count
SELECT 
    COUNT(*) as active_streams_count,
    COUNT(*) FILTER (WHERE is_published = TRUE) as published_streams_count
FROM live_streams
WHERE live_available = TRUE;

-- Active viewers count
SELECT COUNT(*) as total_active_viewers
FROM active_viewers;

