-- ============================================================================
-- Quick Test: Check if Top Friends columns exist in profiles table
-- ============================================================================
-- Run this first to see if the columns were created

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('show_top_friends', 'top_friends_title', 'top_friends_avatar_style', 'top_friends_max_count')
ORDER BY column_name;

-- If this returns 0 rows, the columns don't exist yet - run the migrations!
-- If this returns 4 rows, the columns exist and we need to check the save/load logic

