-- ============================================
-- DROP UNIQUE CONSTRAINT ON live_streams.profile_id
-- Allow multiple stream sessions per user (each with fresh chat)
-- ============================================

-- Step 1: Drop the unique constraint
ALTER TABLE public.live_streams 
DROP CONSTRAINT IF EXISTS live_streams_profile_id_key;

-- Step 2: Verify constraint is removed
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public.live_streams'::regclass
  AND conname = 'live_streams_profile_id_key';

-- Step 3: Show current live_streams structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'live_streams'
ORDER BY ordinal_position;

-- Step 4: Show sample of live_streams (should allow multiple rows per profile_id now)
SELECT 
  id,
  profile_id,
  live_available,
  started_at,
  ended_at,
  created_at
FROM public.live_streams
ORDER BY created_at DESC
LIMIT 10;

SELECT '✅ Constraint removed! Users can now have multiple stream sessions.' as status;
