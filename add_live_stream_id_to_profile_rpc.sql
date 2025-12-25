-- Add live_stream_id to profile RPC output
-- This allows the profile page to display viewer count and pass stream ID to gift modal

-- Note: Run this after updating the RPC function
-- The RPC function get_public_profile_with_adult_filtering needs to include:
-- 1. Check if user is live (live_available = true)
-- 2. Return live_stream_id if live

-- Quick fix: Add this to the JSON result in the RPC function:
-- 'live_stream_id', (SELECT id FROM live_streams WHERE profile_id = v_profile.id AND live_available = TRUE LIMIT 1),

-- Full update will require modifying the RPC function to include:
-- v_live_stream_id BIGINT;
-- 
-- SELECT id INTO v_live_stream_id
-- FROM live_streams
-- WHERE profile_id = v_profile.id
--   AND live_available = TRUE
-- LIMIT 1;
--
-- Then in the JSON result:
-- 'live_stream_id', v_live_stream_id,

-- For now, the client will need to fetch this separately or we can add it inline

