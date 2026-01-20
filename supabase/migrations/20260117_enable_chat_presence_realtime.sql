-- ============================================================================
-- Enable Realtime for chat_messages and room_presence tables
-- Required for live updates in group room chat and viewer list
-- ============================================================================

BEGIN;

-- Enable realtime for chat_messages (group room chat)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    RAISE NOTICE 'Realtime enabled for chat_messages table';
  ELSE
    RAISE NOTICE 'Realtime already enabled for chat_messages table';
  END IF;
END $$;

-- Enable realtime for room_presence (viewer list)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'room_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_presence;
    RAISE NOTICE 'Realtime enabled for room_presence table';
  ELSE
    RAISE NOTICE 'Realtime already enabled for room_presence table';
  END IF;
END $$;

COMMIT;
