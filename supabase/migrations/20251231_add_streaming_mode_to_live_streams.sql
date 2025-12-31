-- Add streaming_mode field to live_streams table
-- This distinguishes between solo and group streaming modes
-- Solo streams are independent 1:1 streams (Twitch-style)
-- Group streams are multi-user grid rooms (Stickam-style)

BEGIN;

-- Add streaming_mode column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'live_streams' 
    AND column_name = 'streaming_mode'
  ) THEN
    -- Add column with default 'group' for backward compatibility
    ALTER TABLE public.live_streams 
    ADD COLUMN streaming_mode text NOT NULL DEFAULT 'group' 
    CHECK (streaming_mode IN ('solo', 'group'));
    
    -- Add index for efficient filtering
    CREATE INDEX idx_live_streams_mode 
      ON public.live_streams(streaming_mode);
      
    -- Add composite index for mode + started_at queries
    CREATE INDEX idx_live_streams_mode_started 
      ON public.live_streams(streaming_mode, started_at DESC);
      
    RAISE NOTICE 'Added streaming_mode column to live_streams table';
  ELSE
    RAISE NOTICE 'streaming_mode column already exists';
  END IF;
END $$;

-- Update existing live streams to 'group' mode (backward compat)
-- This ensures all historical streams are marked as group mode
UPDATE public.live_streams 
SET streaming_mode = 'group' 
WHERE streaming_mode IS NULL;

COMMIT;
