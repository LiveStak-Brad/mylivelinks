-- DEBUG: Find why rpc_get_watch_feed returns 0 rows

-- 1. Check posts table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'posts'
ORDER BY ordinal_position;

-- 2. Count posts
SELECT 'total_posts' as check_name, count(*) as cnt FROM public.posts;

-- 3. Count public posts
SELECT 'public_posts' as check_name, count(*) as cnt FROM public.posts WHERE visibility = 'public';

-- 4. Count posts with media_url
SELECT 'posts_with_media' as check_name, count(*) as cnt FROM public.posts WHERE media_url IS NOT NULL;

-- 5. Count public posts with media_url
SELECT 'public_posts_with_media' as check_name, count(*) as cnt 
FROM public.posts WHERE visibility = 'public' AND media_url IS NOT NULL;

-- 6. Check if profiles join works
SELECT 'posts_with_valid_author' as check_name, count(*) as cnt
FROM public.posts p
JOIN public.profiles prof ON prof.id = p.author_id
WHERE p.visibility = 'public' AND p.media_url IS NOT NULL;

-- 7. Sample posts data
SELECT p.id, p.author_id, p.visibility, p.media_url IS NOT NULL as has_media, p.created_at
FROM public.posts p
LIMIT 5;

-- 8. Check if the function exists
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname = 'rpc_get_watch_feed';

-- 9. Try calling the RPC directly
SELECT count(*) as rpc_result_count
FROM public.rpc_get_watch_feed('all', 'for_you', 20, NULL, NULL, NULL, NULL, NULL, 'test');
