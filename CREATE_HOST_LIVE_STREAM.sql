-- Create live_streams record for CannaStreams and mark as LIVE (for testing)
-- Fixed: removed stream_title column that doesn't exist
INSERT INTO live_streams (profile_id, live_available)
SELECT id, true
FROM profiles
WHERE username = 'CannaStreams'
ON CONFLICT (profile_id) 
DO UPDATE SET 
  live_available = true,
  updated_at = now()
RETURNING id, profile_id, live_available;
