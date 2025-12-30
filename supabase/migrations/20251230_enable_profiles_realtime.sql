-- Enable realtime for profiles table to allow chat customization updates
-- Check if already enabled, if not, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    RAISE NOTICE 'Realtime enabled for profiles table';
  ELSE
    RAISE NOTICE 'Realtime already enabled for profiles table';
  END IF;
END $$;

