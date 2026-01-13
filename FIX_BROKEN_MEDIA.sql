-- These posts have media_url but the URLs end with '/text' which is wrong
-- They should end with a file extension like .mp4, .jpg, etc.

-- Check the actual URLs
SELECT 
  id,
  username,
  media_url,
  media_type,
  RIGHT(media_url, 20) as url_ending
FROM (
  SELECT 
    p.id,
    pr.username,
    p.media_url,
    p.media_type
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.author_id
  WHERE pr.username = 'Mistress_of_Chaos'
    AND p.media_url IS NOT NULL
) sub;

-- The URLs ending in '/text' are broken
-- These posts should be deleted or have their media_url set to NULL

-- To fix: Set media_url to NULL for broken posts
UPDATE public.posts 
SET media_url = NULL, media_type = NULL
WHERE id IN (
  'c7b9347e-01da-e1ad-a9df-9bb5dbc70d1b',
  'dec4d73e-cbdf-c1cd-a9b1-91a1cb1b17a8',
  'ca2ea43c-9b5a-4dd8-9f1e-ac93971542c3'
);

-- Or delete them entirely:
-- DELETE FROM public.posts WHERE id IN (...);
