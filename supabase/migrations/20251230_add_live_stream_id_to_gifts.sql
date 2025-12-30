-- Add live_stream_id to gifts table to track which stream a gift was sent on
ALTER TABLE public.gifts
ADD COLUMN IF NOT EXISTS live_stream_id INTEGER REFERENCES public.live_streams(id) ON DELETE SET NULL;

-- Add index for performance when querying gifts by stream
CREATE INDEX IF NOT EXISTS idx_gifts_live_stream_id 
ON public.gifts(live_stream_id) 
WHERE live_stream_id IS NOT NULL;

-- Add index for performance when querying gifts by stream and sender (for top gifters)
CREATE INDEX IF NOT EXISTS idx_gifts_stream_sender 
ON public.gifts(live_stream_id, sender_id) 
WHERE live_stream_id IS NOT NULL;

-- Verification
DO $$
BEGIN
  -- Check if column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'gifts' 
    AND column_name = 'live_stream_id'
  ) THEN
    RAISE NOTICE '✓ Column live_stream_id added to gifts table';
  ELSE
    RAISE EXCEPTION '✗ Failed to add live_stream_id column';
  END IF;

  -- Check if index exists
  IF EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'gifts' 
    AND indexname = 'idx_gifts_live_stream_id'
  ) THEN
    RAISE NOTICE '✓ Index idx_gifts_live_stream_id created';
  ELSE
    RAISE EXCEPTION '✗ Failed to create index';
  END IF;
END $$;
