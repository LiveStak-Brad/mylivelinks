-- ============================================================================
-- Top Friends Customization Fields Migration
-- ============================================================================
-- Adds customization options for the Top Friends section to profiles table
-- Allows users to:
--   - Show/hide the section
--   - Change the section title
--   - Choose between circle/square avatars
--   - Set max number of friends to display (1-8)

-- Add top friends customization fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_top_friends BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS top_friends_title TEXT DEFAULT 'Top Friends',
  ADD COLUMN IF NOT EXISTS top_friends_avatar_style TEXT DEFAULT 'square' CHECK (top_friends_avatar_style IN ('circle', 'square')),
  ADD COLUMN IF NOT EXISTS top_friends_max_count INTEGER DEFAULT 8 CHECK (top_friends_max_count >= 1 AND top_friends_max_count <= 8);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_show_top_friends ON profiles(show_top_friends) WHERE show_top_friends = true;

-- Add comments for documentation
COMMENT ON COLUMN profiles.show_top_friends IS 'Whether to display the Top Friends section on profile';
COMMENT ON COLUMN profiles.top_friends_title IS 'Custom title for the Top Friends section (e.g., "Top G''s", "My Crew", etc.)';
COMMENT ON COLUMN profiles.top_friends_avatar_style IS 'Avatar display style: circle or square';
COMMENT ON COLUMN profiles.top_friends_max_count IS 'Maximum number of friends to display (1-8)';

-- Migration complete
DO $$
BEGIN
  RAISE NOTICE '✅ Top Friends customization fields added successfully';
  RAISE NOTICE '   - show_top_friends: BOOLEAN (default: true)';
  RAISE NOTICE '   - top_friends_title: TEXT (default: "Top Friends")';
  RAISE NOTICE '   - top_friends_avatar_style: TEXT (default: "square")';
  RAISE NOTICE '   - top_friends_max_count: INTEGER (default: 8, range: 1-8)';
END $$;

