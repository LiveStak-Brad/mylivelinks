-- Enable realtime for gifts table (required for event-driven top gifters updates)
-- This allows web clients to subscribe to gift INSERT events and update top supporters in real-time

DO $$
BEGIN
  -- Check if gifts table is already in realtime publication
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public'
      AND tablename = 'gifts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gifts;
    RAISE NOTICE 'Realtime enabled for gifts table';
  ELSE
    RAISE NOTICE 'Realtime already enabled for gifts table';
  END IF;
END $$;
