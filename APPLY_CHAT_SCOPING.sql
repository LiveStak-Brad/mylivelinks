-- ============================================================================
-- CHAT SCOPING MIGRATION
-- ============================================================================
-- Purpose: Add room_id and live_stream_id to scope chat messages
-- 
-- Context:
-- - Solo streams: Scoped by live_stream_id (from live_streams table)
-- - Group rooms (Live Central): Scoped by room_id (hardcoded identifier like 'live_central')
-- - Future battles/cohosting: Optional merge via querying multiple live_stream_ids
--
-- Requirements addressed:
-- 1) Scope completeness: Both room_id and live_stream_id for complete coverage
-- 2) Legacy compatibility: Existing messages have NULL values (handled in queries)
-- 3) Performance: Indexes on both columns with created_at
-- 4) Security: RLS policies for proper access control
-- ============================================================================

-- Step 1: Add room_id column (for group rooms like 'live_central')
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS room_id TEXT;

-- Step 2: Add live_stream_id column (for solo streams)
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS live_stream_id INTEGER REFERENCES live_streams(id) ON DELETE CASCADE;

-- Step 3: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id_created 
ON chat_messages(room_id, created_at DESC)
WHERE room_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_stream_id_created 
ON chat_messages(live_stream_id, created_at DESC)
WHERE live_stream_id IS NOT NULL;

-- Step 4: Backfill existing messages to 'live_central' room (OPTIONAL - only if you want to preserve history)
-- Uncomment if you want existing "global" messages to appear in Live Central:
-- UPDATE chat_messages 
-- SET room_id = 'live_central' 
-- WHERE room_id IS NULL AND live_stream_id IS NULL AND created_at < NOW();

-- Step 5: Add RLS Policies for Security
-- Note: Adjust these based on your authentication requirements

-- Policy: Users can read messages from rooms they're viewing
DROP POLICY IF EXISTS chat_messages_read_room ON chat_messages;
CREATE POLICY chat_messages_read_room ON chat_messages
FOR SELECT
USING (
  -- Allow reading messages from:
  -- 1. Rooms (no auth required for viewing)
  room_id IS NOT NULL
  OR
  -- 2. Solo streams (no auth required for viewing)
  live_stream_id IS NOT NULL
  OR
  -- 3. Legacy NULL messages (for backwards compatibility)
  (room_id IS NULL AND live_stream_id IS NULL)
);

-- Policy: Users can insert messages if authenticated
DROP POLICY IF EXISTS chat_messages_insert ON chat_messages;
CREATE POLICY chat_messages_insert ON chat_messages
FOR INSERT
WITH CHECK (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Must set profile_id to their own ID
  profile_id = auth.uid()
  AND
  -- Must specify either room_id OR live_stream_id (not both, not neither)
  (
    (room_id IS NOT NULL AND live_stream_id IS NULL)
    OR
    (room_id IS NULL AND live_stream_id IS NOT NULL)
  )
);

-- Policy: Users can delete their own messages (moderation)
DROP POLICY IF EXISTS chat_messages_delete_own ON chat_messages;
CREATE POLICY chat_messages_delete_own ON chat_messages
FOR DELETE
USING (
  profile_id = auth.uid()
);

-- Policy: Admin/owner can delete any message (moderation)
DROP POLICY IF EXISTS chat_messages_delete_admin ON chat_messages;
CREATE POLICY chat_messages_delete_admin ON chat_messages
FOR DELETE
USING (
  -- Check if user is admin/owner
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (
      -- Add your admin check here (e.g., role column, specific UUID, etc.)
      id = '2b4a1178-3c39-4179-94ea-314dd824a818'::uuid  -- Replace with actual owner UUID
      -- OR role = 'admin'
    )
  )
);

-- Step 6: Add helpful comments
COMMENT ON COLUMN chat_messages.room_id IS 
'Scopes chat to a group room (e.g., live_central). NULL for solo streams.';

COMMENT ON COLUMN chat_messages.live_stream_id IS 
'Scopes chat to a specific solo stream. NULL for group rooms. For battles/cohosting, query multiple IDs to merge chats.';

-- Step 7: Validate the migration
DO $$
BEGIN
  -- Check that columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'chat_messages' AND column_name = 'room_id') THEN
    RAISE EXCEPTION 'Migration failed: room_id column not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'chat_messages' AND column_name = 'live_stream_id') THEN
    RAISE EXCEPTION 'Migration failed: live_stream_id column not created';
  END IF;
  
  RAISE NOTICE 'Chat scoping migration completed successfully!';
END $$;

