-- ============================================================================
-- Chat Scoping Migration - CORRECTED
-- ============================================================================
-- Purpose: Add room_id and live_stream_id to scope chat messages
-- 
-- Behavior:
-- - Group rooms (e.g., 'live_central'): Scoped by room_id
-- - Solo streams: Scoped by live_stream_id
-- - RLS enforces: auth required + XOR scope (one or the other, never both)
-- - Query filters enforce: exact scope matching
-- - Legacy NULL messages: backfilled to room_id='live_central'
-- ============================================================================

-- Step 1: Add columns to public.chat_messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS room_id TEXT;

ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS live_stream_id INTEGER 
  REFERENCES public.live_streams(id) ON DELETE SET NULL;

-- Step 2: Create performance indexes (partial, only for non-NULL values)
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id_created 
ON public.chat_messages(room_id, created_at DESC)
WHERE room_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_stream_id_created 
ON public.chat_messages(live_stream_id, created_at DESC)
WHERE live_stream_id IS NOT NULL;

-- Step 3: Enable RLS (explicit, don't assume it exists)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop old policies if they exist
DROP POLICY IF EXISTS chat_messages_read_room ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_insert ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_delete_own ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_delete_admin ON public.chat_messages;

-- Step 5: Create strict RLS policies

-- SELECT Policy: Auth required + XOR scope (exactly one scope set, not both)
CREATE POLICY chat_messages_select_scoped ON public.chat_messages
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    -- Room scoped (live_stream_id must be NULL)
    (room_id IS NOT NULL AND room_id <> '' AND live_stream_id IS NULL)
    OR
    -- Stream scoped (room_id must be NULL)
    (live_stream_id IS NOT NULL AND live_stream_id > 0 AND room_id IS NULL)
  )
);

-- INSERT Policy: Auth required + profile_id matches + XOR scope
CREATE POLICY chat_messages_insert_scoped ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND profile_id = auth.uid()
  AND (
    -- Room scoped (live_stream_id must be NULL)
    (room_id IS NOT NULL AND room_id <> '' AND live_stream_id IS NULL)
    OR
    -- Stream scoped (room_id must be NULL)
    (live_stream_id IS NOT NULL AND live_stream_id > 0 AND room_id IS NULL)
  )
);

-- DELETE Policy: Users can delete their own messages
CREATE POLICY chat_messages_delete_own ON public.chat_messages
FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND profile_id = auth.uid()
);

-- DELETE Policy: Owner can delete any message (moderation)
CREATE POLICY chat_messages_delete_admin ON public.chat_messages
FOR DELETE
USING (
  auth.uid() = '2b4a1178-3c39-4179-94ea-314dd824a818'::uuid
);

-- Step 6: Backfill legacy NULL messages to 'live_central' room
-- This preserves chat history in the group room context
UPDATE public.chat_messages
SET room_id = 'live_central'
WHERE room_id IS NULL 
  AND live_stream_id IS NULL;

-- Step 7: Add column comments for documentation
COMMENT ON COLUMN public.chat_messages.room_id IS 
'Scopes chat to a group room (e.g., live_central). NULL for solo streams.';

COMMENT ON COLUMN public.chat_messages.live_stream_id IS 
'Scopes chat to a specific solo stream. NULL for group rooms. Battle/cohost merge via IN query.';

-- Step 8: Validation (ensure migration succeeded)
DO $$
DECLARE
  room_col_exists BOOLEAN;
  stream_col_exists BOOLEAN;
  rls_enabled BOOLEAN;
  backfilled_count INTEGER;
BEGIN
  -- Check columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'chat_messages' 
      AND column_name = 'room_id'
  ) INTO room_col_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'chat_messages' 
      AND column_name = 'live_stream_id'
  ) INTO stream_col_exists;
  
  -- Check RLS enabled
  SELECT relrowsecurity
  FROM pg_class
  WHERE oid = 'public.chat_messages'::regclass
  INTO rls_enabled;
  
  -- Check backfill succeeded
  SELECT COUNT(*)
  FROM public.chat_messages
  WHERE room_id = 'live_central' AND live_stream_id IS NULL
  INTO backfilled_count;
  
  -- Validation checks
  IF NOT room_col_exists THEN
    RAISE EXCEPTION 'Migration failed: room_id column not created';
  END IF;
  
  IF NOT stream_col_exists THEN
    RAISE EXCEPTION 'Migration failed: live_stream_id column not created';
  END IF;
  
  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'Migration failed: RLS not enabled on chat_messages';
  END IF;
  
  RAISE NOTICE 'Chat scoping migration completed successfully!';
  RAISE NOTICE 'Backfilled % messages to live_central', backfilled_count;
END $$;

-- ============================================================================
-- ROLLBACK (for reference - not auto-executed)
-- ============================================================================
-- To rollback this migration, run:
--
-- -- Drop policies
-- DROP POLICY IF EXISTS chat_messages_select_scoped ON public.chat_messages;
-- DROP POLICY IF EXISTS chat_messages_insert_scoped ON public.chat_messages;
-- DROP POLICY IF EXISTS chat_messages_delete_own ON public.chat_messages;
-- DROP POLICY IF EXISTS chat_messages_delete_admin ON public.chat_messages;
--
-- -- Drop indexes
-- DROP INDEX IF EXISTS idx_chat_messages_room_id_created;
-- DROP INDEX IF EXISTS idx_chat_messages_stream_id_created;
--
-- -- Remove columns (THIS WILL DELETE DATA - use with caution)
-- ALTER TABLE public.chat_messages DROP COLUMN IF EXISTS room_id;
-- ALTER TABLE public.chat_messages DROP COLUMN IF EXISTS live_stream_id;
--
-- -- Disable RLS (optional - only if you want to revert to previous state)
-- -- ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
-- ============================================================================

