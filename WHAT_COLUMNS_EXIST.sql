-- Check what columns currently exist in profiles table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN (
  'enabled_modules',
  'enabled_tabs', 
  'profile_type',
  'button_color',
  'content_text_color',
  'ui_text_color',
  'link_color'
)
ORDER BY column_name;

