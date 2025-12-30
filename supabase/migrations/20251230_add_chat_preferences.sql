-- Add chat customization columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS chat_bubble_color TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS chat_font TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.chat_bubble_color IS 'User-selected chat bubble color (hex code)';
COMMENT ON COLUMN public.profiles.chat_font IS 'User-selected chat font family';

-- Validate columns were added
DO $$
BEGIN
  -- Check chat_bubble_color column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'chat_bubble_color'
  ) THEN
    RAISE EXCEPTION 'Migration failed: chat_bubble_color column not created';
  END IF;

  -- Check chat_font column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'chat_font'
  ) THEN
    RAISE EXCEPTION 'Migration failed: chat_font column not created';
  END IF;

  RAISE NOTICE 'Chat preferences columns added successfully';
END $$;
