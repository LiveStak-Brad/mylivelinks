-- Create live_streams record for CannaStreams
INSERT INTO live_streams (profile_id, live_available)
SELECT id, false
FROM profiles
WHERE username = 'CannaStreams'
ON CONFLICT (profile_id) DO NOTHING
RETURNING id, profile_id, live_available;
