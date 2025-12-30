-- Check if CannaStreams has a live_streams record
SELECT 
  id,
  profile_id,
  live_available,
  stream_title,
  created_at,
  updated_at
FROM live_streams
WHERE profile_id = (
  SELECT id FROM profiles WHERE username = 'CannaStreams'
)
LIMIT 1;

-- If no record exists, we need to create one
-- INSERT INTO live_streams (profile_id, live_available, stream_title)
-- SELECT id, false, 'My Stream'
-- FROM profiles
-- WHERE username = 'CannaStreams'
-- ON CONFLICT (profile_id) DO NOTHING;
