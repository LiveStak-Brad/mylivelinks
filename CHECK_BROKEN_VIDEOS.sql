-- Check for posts with broken/deleted media URLs
-- Run this to find posts where media_url exists but files might be deleted

-- Check specific user's posts
SELECT 
  p.id,
  p.author_id,
  pr.username,
  p.media_url,
  p.media_type,
  p.created_at,
  p.visibility,
  LENGTH(p.media_url) as url_length,
  CASE 
    WHEN p.media_url IS NULL THEN 'No URL'
    WHEN p.media_url = '' THEN 'Empty URL'
    WHEN p.media_url LIKE '%supabase.co%' THEN 'Supabase Storage'
    ELSE 'Other Storage'
  END as storage_type
FROM public.posts p
JOIN public.profiles pr ON pr.id = p.author_id
WHERE pr.username = 'USERNAME_HERE' -- Replace with the username
  AND p.media_url IS NOT NULL
ORDER BY p.created_at DESC;

-- Check if media URLs are accessible (you'll need to manually test these URLs)
-- Copy the media_url values and try opening them in a browser

-- To delete posts with broken media:
-- DELETE FROM public.posts WHERE id IN ('post-id-1', 'post-id-2', ...);
