-- ============================================================================
-- Add author_is_mll_pro to get_public_feed RPC
-- ============================================================================

BEGIN;

-- Drop existing function to recreate with new column
DROP FUNCTION IF EXISTS public.get_public_feed(int, timestamptz, uuid, text);

CREATE OR REPLACE FUNCTION public.get_public_feed(
  p_limit int DEFAULT 20,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL,
  p_username text DEFAULT NULL
)
RETURNS TABLE (
  post_id uuid,
  text_content text,
  media_url text,
  feeling_id int,
  feeling_emoji text,
  feeling_label text,
  created_at timestamptz,
  author_id uuid,
  author_username text,
  author_avatar_url text,
  author_is_mll_pro boolean,
  comment_count bigint,
  likes_count bigint,
  views_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS post_id,
    p.text_content,
    p.media_url,
    p.feeling_id,
    pf.emoji AS feeling_emoji,
    pf.label AS feeling_label,
    p.created_at,
    p.author_id,
    pr.username AS author_username,
    pr.avatar_url AS author_avatar_url,
    COALESCE(pr.is_mll_pro, false) AS author_is_mll_pro,
    COALESCE((SELECT COUNT(*) FROM public.post_comments pc WHERE pc.post_id = p.id), 0) AS comment_count,
    COALESCE((SELECT COUNT(*) FROM public.post_likes pl WHERE pl.post_id = p.id), 0) AS likes_count,
    COALESCE((SELECT COUNT(*) FROM public.content_views cv WHERE cv.content_type = 'feed_post' AND cv.content_id = p.id), 0) AS views_count
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.author_id
  LEFT JOIN public.post_feelings pf ON pf.id = p.feeling_id
  WHERE p.visibility = 'public'
    AND (p_username IS NULL OR pr.username = p_username)
    AND (
      p_before_created_at IS NULL
      OR p.created_at < p_before_created_at
      OR (p.created_at = p_before_created_at AND p.id < p_before_id)
    )
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT LEAST(p_limit, 50);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_feed(int, timestamptz, uuid, text) TO anon, authenticated;

COMMIT;
