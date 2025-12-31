-- ============================================
-- CREATE CHAT_SETTINGS TABLE
-- Dedicated table for chat customization
-- ============================================

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS public.chat_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chat_bubble_color TEXT,
  chat_font TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- Step 2: Enable RLS
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies
-- Anyone can view chat settings (needed for displaying messages)
CREATE POLICY "Anyone can view chat settings" ON public.chat_settings
  FOR SELECT
  USING (true);

-- Users can insert/update their own settings
CREATE POLICY "Users can manage their own chat settings" ON public.chat_settings
  FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Step 4: Add to realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_settings;
    RAISE NOTICE '✅ Added chat_settings to realtime publication';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE '✅ chat_settings already in realtime publication';
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Error adding to publication: %', SQLERRM;
  END;
END $$;

-- Step 5: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_chat_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_settings_updated_at
  BEFORE UPDATE ON public.chat_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_settings_updated_at();

-- Step 6: Migrate existing data from profiles
INSERT INTO public.chat_settings (profile_id, chat_bubble_color, chat_font)
SELECT 
  id,
  chat_bubble_color,
  chat_font
FROM public.profiles
WHERE chat_bubble_color IS NOT NULL OR chat_font IS NOT NULL
ON CONFLICT (profile_id) DO UPDATE
  SET 
    chat_bubble_color = EXCLUDED.chat_bubble_color,
    chat_font = EXCLUDED.chat_font;

-- Step 7: Verify
SELECT 
  'Table created' as status,
  COUNT(*) as migrated_rows
FROM public.chat_settings;

SELECT 
  'Realtime enabled' as status,
  COUNT(*) as count
FROM pg_publication_tables 
WHERE tablename = 'chat_settings' AND pubname = 'supabase_realtime';

SELECT '✅ Chat settings table ready!' as status;
