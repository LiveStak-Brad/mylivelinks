-- ============================================================================
-- APPLY COLOR CUSTOMIZATION MIGRATION
-- ============================================================================
-- This adds the missing color customization columns to the profiles table
-- Run this in Supabase SQL Editor to fix the "button_color column not found" error
-- ============================================================================

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS button_color TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS content_text_color TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ui_text_color TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS link_color TEXT DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN profiles.button_color IS 'Custom color for buttons and CTAs (hex color code, e.g., #3B82F6)';
COMMENT ON COLUMN profiles.content_text_color IS 'Custom color for user content text like bio, posts, captions (hex color code)';
COMMENT ON COLUMN profiles.ui_text_color IS 'Custom color for UI elements like labels, headings, stats (hex color code)';
COMMENT ON COLUMN profiles.link_color IS 'Custom color for clickable links (hex color code)';

-- Verify columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('button_color', 'content_text_color', 'ui_text_color', 'link_color')
ORDER BY column_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
-- If you see 4 rows returned above with the color columns, you're all set!
-- You can now save profile customizations without errors.
-- ============================================================================

