-- ============================================================================
-- Enable REPLICA IDENTITY FULL for room_presence table
-- Required for realtime DELETE events to include the old row data (profile_id, room_id)
-- Without this, DELETE events have empty payload.old and ViewerList can't remove viewers
-- ============================================================================

BEGIN;

-- Set REPLICA IDENTITY FULL so DELETE events include all column values
ALTER TABLE public.room_presence REPLICA IDENTITY FULL;

COMMIT;
