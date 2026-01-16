-- Run this AFTER applying the migrations to fix existing uploaded videos
-- This will set status='ready' and visibility='public' for all items that:
-- 1. Have a media_url (meaning upload completed)
-- 2. Have rights_attested = true
-- 3. Are not already removed

UPDATE public.creator_studio_items
SET 
  status = 'ready',
  visibility = 'public',
  published_at = COALESCE(published_at, now()),
  updated_at = now()
WHERE media_url IS NOT NULL
  AND rights_attested = true
  AND status != 'removed';

-- Check the results
SELECT id, title, status, visibility, media_url 
FROM public.creator_studio_items 
ORDER BY created_at DESC;
