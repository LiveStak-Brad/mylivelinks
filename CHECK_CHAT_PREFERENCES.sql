-- Check if chat preference columns exist in profiles table
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('chat_bubble_color', 'chat_font')
ORDER BY column_name;

-- Check if any profiles have custom chat settings
SELECT 
  id,
  username,
  chat_bubble_color,
  chat_font
FROM public.profiles
WHERE chat_bubble_color IS NOT NULL 
   OR chat_font IS NOT NULL
LIMIT 10;

-- Check if realtime is enabled for profiles table
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables
WHERE schemaname = 'public'
  AND tablename = 'profiles';
