-- Migration: Add is_live to feed posts author data
-- This allows the feed to show live indicators on avatars

BEGIN;

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_public_feed(integer, timestamptz, uuid, text, uuid, text, boolean);

-- Recreate with is_live field
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
  gift_total_coins bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  WITH base_posts AS (
    SELECT p.id, p.author_id, p.text_content, p.media_url, p.created_at, p.visibility
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
    COALESCE(gt.gift_total_coins, 0) AS gift_total_coins
  FROM base_posts bp
  JOIN public.profiles pr ON pr.id = bp.author_id
  LEFT JOIN comment_counts cc ON cc.post_id = bp.id
  LEFT JOIN gift_totals gt ON gt.post_id = bp.id
  ORDER BY bp.created_at DESC, bp.id DESC;
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.get_public_feed(integer, timestamptz, uuid, text, uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_feed(integer, timestamptz, uuid, text, uuid, text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_feed(integer, timestamptz, uuid, text, uuid, text, boolean) TO authenticated;

COMMIT;
