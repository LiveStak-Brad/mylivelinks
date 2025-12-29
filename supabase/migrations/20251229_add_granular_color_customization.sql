-- Migration: Add granular color customization for profiles
-- This allows users to separately customize:
-- 1. Button colors (primary buttons, CTAs)
-- 2. Content text color (bio, posts, captions)
-- 3. UI text color (labels, headings, stats)
-- 4. Link colors (for clickable links)

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

-- Note: accent_color is kept for backward compatibility and will default button_color if not set
-- Existing columns:
-- - accent_color: Legacy field (now primarily for highlights)
-- - card_color: Background color for cards
-- - font_preset: Font family/weight preset

-- No need to update RLS policies as these are part of the profiles table

