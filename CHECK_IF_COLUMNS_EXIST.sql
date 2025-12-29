-- Check if the customization columns exist in profiles table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN (
    'enabled_modules',
    'enabled_tabs',
    'profile_type',
    'button_color',
    'content_text_color',
    'ui_text_color',
    'link_color',
    'show_top_friends',
    'top_friends_title',
    'top_friends_avatar_style',
    'top_friends_max_count'
  )
ORDER BY column_name;

