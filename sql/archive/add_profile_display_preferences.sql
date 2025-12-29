-- ============================================================================
-- Add Profile Display Preferences
-- ============================================================================
-- Allows users to customize what shows on their profile
-- (hide streaming stats, leaderboards, etc. for links-only profiles)
-- ============================================================================

BEGIN;

-- Add display preference columns to profiles table
DO $$ 
BEGIN
    -- Hide streaming stats and leaderboards
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='hide_streaming_stats') THEN
        ALTER TABLE profiles ADD COLUMN hide_streaming_stats BOOLEAN DEFAULT false;
    END IF;
END $$;

COMMENT ON COLUMN profiles.hide_streaming_stats IS 'If true, hides streaming stats, top supporters, top streamers widgets - shows links-only profile';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_hide_stats ON profiles(hide_streaming_stats) WHERE hide_streaming_stats = true;

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE ✅
-- ============================================================================
-- 
-- What was added:
-- ✅ hide_streaming_stats column (boolean, default false)
-- ✅ Column comment for documentation
-- ✅ Index for performance
--
-- When enabled, this will hide:
-- - Top Supporters widget
-- - Top Streamers widget
-- - Streaming Stats card
--
-- Users can now create clean, links-only profiles!
-- ============================================================================

