-- ============================================================================
-- Modern Feed Likes System - Complete Deployment
-- ============================================================================
-- Run this to deploy the entire likes system with modern UI
-- ============================================================================

BEGIN;

-- Step 1: Add likes_count column to posts table (if not exists)
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

-- Step 2: Add likes_count column to post_comments table (if not exists)
ALTER TABLE public.post_comments 
ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

-- Step 3: Create post_likes table (dedupe: one like per user per post)
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id 
ON public.post_likes(post_id);

CREATE INDEX IF NOT EXISTS idx_post_likes_profile_id 
ON public.post_likes(profile_id);

-- Step 4: Create post_comment_likes table (dedupe: one like per user per comment)
CREATE TABLE IF NOT EXISTS public.post_comment_likes (
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_post_comment_likes_comment_id 
ON public.post_comment_likes(comment_id);

CREATE INDEX IF NOT EXISTS idx_post_comment_likes_profile_id 
ON public.post_comment_likes(profile_id);

-- Step 5: Enable RLS
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comment_likes ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS Policies - Anyone can view likes
DROP POLICY IF EXISTS "Anyone can view post likes" ON public.post_likes;
CREATE POLICY "Anyone can view post likes"
ON public.post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.post_comment_likes;
CREATE POLICY "Anyone can view comment likes"
ON public.post_comment_likes FOR SELECT USING (true);

-- Step 7: RLS Policies - Authenticated users can insert own likes
DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
CREATE POLICY "Users can like posts"
ON public.post_likes FOR INSERT
WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can like comments" ON public.post_comment_likes;
CREATE POLICY "Users can like comments"
ON public.post_comment_likes FOR INSERT
WITH CHECK (auth.uid() = profile_id);

GRANT SELECT ON TABLE public.post_likes TO anon, authenticated;
GRANT INSERT ON TABLE public.post_likes TO authenticated;

GRANT SELECT ON TABLE public.post_comment_likes TO anon, authenticated;
GRANT INSERT ON TABLE public.post_comment_likes TO authenticated;

-- ============================================================================
-- Step 8: RPC - Like a post (insert-only, no unlike)
-- ============================================================================
DROP FUNCTION IF EXISTS rpc_like_post(UUID, UUID);

CREATE OR REPLACE FUNCTION rpc_like_post(
  p_post_id UUID,
  p_profile_id UUID
)
RETURNS TABLE(is_liked BOOLEAN, likes_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_liked BOOLEAN;
  v_new_count INTEGER;
BEGIN
  -- Check if already liked
  SELECT EXISTS(
    SELECT 1 FROM post_likes 
    WHERE post_id = p_post_id AND profile_id = p_profile_id
  ) INTO v_already_liked;

  IF NOT v_already_liked THEN
    -- Insert like
    INSERT INTO post_likes (post_id, profile_id)
    VALUES (p_post_id, p_profile_id)
    ON CONFLICT (post_id, profile_id) DO NOTHING;

    -- Increment counter
    UPDATE posts 
    SET likes_count = likes_count + 1
    WHERE id = p_post_id;
  END IF;

  -- Return current state
  SELECT posts.likes_count INTO v_new_count
  FROM posts
  WHERE id = p_post_id;

  RETURN QUERY SELECT true::BOOLEAN, COALESCE(v_new_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_like_post(UUID, UUID) TO authenticated;

-- ============================================================================
-- Step 9: RPC - Like a comment (insert-only, no unlike)
-- ============================================================================
DROP FUNCTION IF EXISTS rpc_like_comment(UUID, UUID);

CREATE OR REPLACE FUNCTION rpc_like_comment(
  p_comment_id UUID,
  p_profile_id UUID
)
RETURNS TABLE(is_liked BOOLEAN, likes_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_liked BOOLEAN;
  v_new_count INTEGER;
BEGIN
  -- Check if already liked
  SELECT EXISTS(
    SELECT 1 FROM post_comment_likes 
    WHERE comment_id = p_comment_id AND profile_id = p_profile_id
  ) INTO v_already_liked;

  IF NOT v_already_liked THEN
    -- Insert like
    INSERT INTO post_comment_likes (comment_id, profile_id)
    VALUES (p_comment_id, p_profile_id)
    ON CONFLICT (comment_id, profile_id) DO NOTHING;

    -- Increment counter
    UPDATE post_comments 
    SET likes_count = likes_count + 1
    WHERE id = p_comment_id;
  END IF;

  -- Return current state
  SELECT post_comments.likes_count INTO v_new_count
  FROM post_comments
  WHERE id = p_comment_id;

  RETURN QUERY SELECT true::BOOLEAN, COALESCE(v_new_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_like_comment(UUID, UUID) TO authenticated;

-- ============================================================================
-- Step 10: RPC - Get user's liked posts (batch check)
-- ============================================================================
DROP FUNCTION IF EXISTS rpc_get_user_post_likes(UUID, UUID[]);

CREATE OR REPLACE FUNCTION rpc_get_user_post_likes(
  p_profile_id UUID,
  p_post_ids UUID[]
)
RETURNS TABLE(post_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pl.post_id
  FROM post_likes pl
  WHERE pl.profile_id = p_profile_id
    AND pl.post_id = ANY(p_post_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_get_user_post_likes(UUID, UUID[]) TO authenticated;

-- ============================================================================
-- Step 11: RPC - Get user's liked comments (batch check)
-- ============================================================================
DROP FUNCTION IF EXISTS rpc_get_user_comment_likes(UUID, UUID[]);

CREATE OR REPLACE FUNCTION rpc_get_user_comment_likes(
  p_profile_id UUID,
  p_comment_ids UUID[]
)
RETURNS TABLE(comment_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT cl.comment_id
  FROM post_comment_likes cl
  WHERE cl.profile_id = p_profile_id
    AND cl.comment_id = ANY(p_comment_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_get_user_comment_likes(UUID, UUID[]) TO authenticated;

-- ============================================================================
-- Step 12: Update get_public_feed RPC to include likes_count
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_public_feed(integer, timestamptz, uuid, text, uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.get_public_feed(
  p_limit integer DEFAULT 20,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL,
  p_username text DEFAULT NULL,
  p_viewer_id uuid DEFAULT NULL,
  p_filter text DEFAULT 'global',
  p_media_only boolean DEFAULT false
)
RETURNS TABLE (
  post_id uuid,
  text_content text,
  media_url text,
  created_at timestamptz,
  visibility text,
  author_id uuid,
  author_username text,
  author_avatar_url text,
  author_is_live boolean,
  comment_count bigint,
  gift_total_coins bigint,
  likes_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  WITH base_posts AS (
    SELECT p.id, p.author_id, p.text_content, p.media_url, p.created_at, p.visibility, p.likes_count
    FROM public.posts p
    JOIN public.profiles pr ON pr.id = p.author_id
    WHERE (
      p_username IS NULL
      OR pr.username = p_username
    )
    AND (
      NOT p_media_only
      OR p.media_url IS NOT NULL
    )
    AND (
      p_before_created_at IS NULL
      OR p_before_id IS NULL
      OR (p.created_at, p.id) < (p_before_created_at, p_before_id)
    )
    AND (
      CASE
        WHEN COALESCE(p_filter, 'global') = 'friends' THEN
          p_viewer_id IS NOT NULL
          AND (
            p.author_id = p_viewer_id
            OR EXISTS (
              SELECT 1
              FROM public.friends fr
              WHERE fr.user_id_1 = LEAST(p_viewer_id, p.author_id)
                AND fr.user_id_2 = GREATEST(p_viewer_id, p.author_id)
            )
          )
          AND p.visibility IN ('public', 'friends')
        WHEN COALESCE(p_filter, 'global') = 'private' THEN
          p_viewer_id IS NOT NULL
          AND p.author_id = p_viewer_id
          AND p.visibility = 'private'
        ELSE
          p.visibility = 'public'
      END
    )
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  ),
  comment_counts AS (
    SELECT c.post_id, COUNT(*)::bigint AS comment_count
    FROM public.post_comments c
    WHERE c.post_id IN (SELECT id FROM base_posts)
    GROUP BY c.post_id
  ),
  gift_totals AS (
    SELECT pg.post_id, COALESCE(SUM(COALESCE(gg.coin_amount, pg.coins)), 0)::bigint AS gift_total_coins
    FROM public.post_gifts pg
    LEFT JOIN public.gifts gg ON gg.id = pg.gift_id
    WHERE pg.post_id IN (SELECT id FROM base_posts)
    GROUP BY pg.post_id
  )
  SELECT
    bp.id AS post_id,
    bp.text_content,
    bp.media_url,
    bp.created_at,
    bp.visibility,
    pr.id AS author_id,
    pr.username AS author_username,
    pr.avatar_url AS author_avatar_url,
    COALESCE(pr.is_live, false) AS author_is_live,
    COALESCE(cc.comment_count, 0) AS comment_count,
    COALESCE(gt.gift_total_coins, 0) AS gift_total_coins,
    COALESCE(bp.likes_count, 0) AS likes_count
  FROM base_posts bp
  JOIN public.profiles pr ON pr.id = bp.author_id
  LEFT JOIN comment_counts cc ON cc.post_id = bp.id
  LEFT JOIN gift_totals gt ON gt.post_id = bp.id
  ORDER BY bp.created_at DESC, bp.id DESC;
$$;

REVOKE ALL ON FUNCTION public.get_public_feed(integer, timestamptz, uuid, text, uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_feed(integer, timestamptz, uuid, text, uuid, text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_feed(integer, timestamptz, uuid, text, uuid, text, boolean) TO authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run these after migration)
-- ============================================================================
-- Check tables exist:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%like%';

-- Check likes_count column exists:
-- SELECT column_name, data_type, column_default FROM information_schema.columns 
-- WHERE table_name = 'posts' AND column_name = 'likes_count';

-- Test like a post (replace with actual IDs):
-- SELECT * FROM rpc_like_post('your-post-id'::uuid, 'your-profile-id'::uuid);

-- Test get user likes (replace with actual IDs):
-- SELECT * FROM rpc_get_user_post_likes('your-profile-id'::uuid, ARRAY['post-id-1'::uuid, 'post-id-2'::uuid]);

-- Test feed includes likes_count:
-- SELECT * FROM get_public_feed(10);
