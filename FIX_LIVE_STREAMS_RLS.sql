-- Check and fix RLS policies for live_streams table
-- This allows the viewer to read live stream data

-- 1. Check current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'live_streams';

-- 2. Enable RLS if not enabled
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;

-- 3. Create policy to allow anyone to READ live_streams (viewers need this!)
DROP POLICY IF EXISTS "Allow public read access to live_streams" ON live_streams;

CREATE POLICY "Allow public read access to live_streams"
ON live_streams
FOR SELECT
USING (true);  -- Allow everyone to read

-- 4. Verify the policy was created
SELECT 
  'VERIFICATION' as check_type,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'live_streams' AND cmd = 'SELECT';
