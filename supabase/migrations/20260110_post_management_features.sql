BEGIN;

-- ============================================================================
-- POST MANAGEMENT FEATURES MIGRATION
-- ============================================================================
-- Adds pin/unpin, delete, and visibility editing for personal and team posts
-- ============================================================================

-- ============================================================================
-- 1. ADD PINNING SUPPORT TO PERSONAL FEED POSTS
-- ============================================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_posts_author_pinned
  ON public.posts(author_id, is_pinned DESC, pinned_at DESC NULLS LAST, created_at DESC);

-- ============================================================================
-- 2. RPC: PIN/UNPIN PERSONAL POST
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_pin_post(uuid, boolean);
CREATE OR REPLACE FUNCTION public.rpc_pin_post(
  p_post_id uuid,
  p_pin boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_author_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT author_id INTO v_author_id
  FROM public.posts
  WHERE id = p_post_id;

  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  -- Only author can pin/unpin their own posts
  IF v_author_id != v_actor THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.posts
  SET 
    is_pinned = p_pin,
    pinned_at = CASE WHEN p_pin THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_post_id;

  RETURN true;
END;
$$;

-- ============================================================================
-- 3. RPC: DELETE PERSONAL POST
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_delete_post(uuid);
CREATE OR REPLACE FUNCTION public.rpc_delete_post(p_post_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_author_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT author_id INTO v_author_id
  FROM public.posts
  WHERE id = p_post_id;

  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  -- Only author can delete their own posts
  IF v_author_id != v_actor THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.posts WHERE id = p_post_id;

  RETURN true;
END;
$$;

-- ============================================================================
-- 4. RPC: UPDATE POST VISIBILITY
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_update_post_visibility(uuid, text);
CREATE OR REPLACE FUNCTION public.rpc_update_post_visibility(
  p_post_id uuid,
  p_visibility text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_author_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Validate visibility value
  IF p_visibility NOT IN ('public', 'friends', 'private') THEN
    RAISE EXCEPTION 'invalid_visibility';
  END IF;

  SELECT author_id INTO v_author_id
  FROM public.posts
  WHERE id = p_post_id;

  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  -- Only author can change visibility of their own posts
  IF v_author_id != v_actor THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.posts
  SET 
    visibility = p_visibility,
    updated_at = now()
  WHERE id = p_post_id;

  RETURN true;
END;
$$;

-- ============================================================================
-- 5. RPC: UPDATE TEAM POST VISIBILITY
-- ============================================================================

-- Add visibility column to team_feed_posts if not exists
ALTER TABLE public.team_feed_posts
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

-- Add constraint for team post visibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'team_feed_posts'
      AND c.conname = 'team_feed_posts_visibility_check'
  ) THEN
    ALTER TABLE public.team_feed_posts
      ADD CONSTRAINT team_feed_posts_visibility_check 
      CHECK (visibility IN ('public', 'members'));
  END IF;
END;
$$;

-- Create index for team post visibility
CREATE INDEX IF NOT EXISTS idx_team_feed_posts_visibility
  ON public.team_feed_posts(team_id, visibility, created_at DESC);

DROP FUNCTION IF EXISTS public.rpc_update_team_post_visibility(uuid, text);
CREATE OR REPLACE FUNCTION public.rpc_update_team_post_visibility(
  p_post_id uuid,
  p_visibility text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_team_id uuid;
  v_author_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Validate visibility value (team posts can be 'public' or 'members')
  IF p_visibility NOT IN ('public', 'members') THEN
    RAISE EXCEPTION 'invalid_visibility';
  END IF;

  SELECT team_id, author_id INTO v_team_id, v_author_id
  FROM public.team_feed_posts
  WHERE id = p_post_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  -- Only author can change visibility of their own posts
  IF v_author_id != v_actor THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Must be a team member
  IF NOT public.is_team_approved_member(v_team_id, v_actor) THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;

  UPDATE public.team_feed_posts
  SET 
    visibility = p_visibility,
    updated_at = now()
  WHERE id = p_post_id;

  RETURN true;
END;
$$;

-- ============================================================================
-- 6. UPDATE GET_PUBLIC_FEED TO SUPPORT PINNED POSTS
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
  is_pinned boolean,
  pinned_at timestamptz,
  author_id uuid,
  author_username text,
  author_avatar_url text,
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
    SELECT p.id, p.author_id, p.text_content, p.media_url, p.created_at, p.visibility, p.is_pinned, p.pinned_at
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
    ORDER BY 
      CASE WHEN p_username IS NOT NULL THEN p.is_pinned ELSE false END DESC,
      CASE WHEN p_username IS NOT NULL THEN p.pinned_at END DESC NULLS LAST,
      p.created_at DESC, 
      p.id DESC
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
    bp.is_pinned,
    bp.pinned_at,
    pr.id AS author_id,
    pr.username AS author_username,
    pr.avatar_url AS author_avatar_url,
    COALESCE(cc.comment_count, 0) AS comment_count,
    COALESCE(gt.gift_total_coins, 0) AS gift_total_coins
  FROM base_posts bp
  JOIN public.profiles pr ON pr.id = bp.author_id
  LEFT JOIN comment_counts cc ON cc.post_id = bp.id
  LEFT JOIN gift_totals gt ON gt.post_id = bp.id
  ORDER BY 
    CASE WHEN p_username IS NOT NULL THEN bp.is_pinned ELSE false END DESC,
    CASE WHEN p_username IS NOT NULL THEN bp.pinned_at END DESC NULLS LAST,
    bp.created_at DESC, 
    bp.id DESC;
$$;

-- ============================================================================
-- 7. UPDATE TEAM FEED RPC TO RETURN VISIBILITY
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_get_team_feed(text, int, timestamptz, uuid);
CREATE OR REPLACE FUNCTION public.rpc_get_team_feed(
  p_team_slug text,
  p_limit int DEFAULT 20,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL
)
RETURNS TABLE(
  post_id uuid,
  team_id uuid,
  author_id uuid,
  author_username text,
  author_avatar_url text,
  text_content text,
  media_url text,
  visibility text,
  is_pinned boolean,
  pinned_at timestamptz,
  comment_count int,
  reaction_count int,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
  v_l int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT t.id INTO v_team_id
  FROM public.teams t
  WHERE t.slug = p_team_slug;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  IF NOT public.is_team_approved_member(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_l := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);

  RETURN QUERY
  SELECT
    p.id,
    p.team_id,
    p.author_id,
    pr.username::text,
    pr.avatar_url::text,
    p.text_content,
    p.media_url,
    p.visibility,
    p.is_pinned,
    p.pinned_at,
    p.comment_count,
    p.reaction_count,
    p.created_at
  FROM public.team_feed_posts p
  JOIN public.profiles pr ON pr.id = p.author_id
  WHERE p.team_id = v_team_id
    AND (
      p_before_created_at IS NULL
      OR (p.created_at, p.id) < (p_before_created_at, p_before_id)
    )
  ORDER BY p.is_pinned DESC, p.pinned_at DESC NULLS LAST, p.created_at DESC, p.id DESC
  LIMIT v_l;
END;
$$;

-- ============================================================================
-- 8. GRANTS
-- ============================================================================

REVOKE ALL ON FUNCTION public.rpc_pin_post(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_pin_post(uuid, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_delete_post(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_delete_post(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_update_post_visibility(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_update_post_visibility(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_update_team_post_visibility(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_update_team_post_visibility(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.get_public_feed(integer, timestamptz, uuid, text, uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_feed(integer, timestamptz, uuid, text, uuid, text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_feed(integer, timestamptz, uuid, text, uuid, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_get_team_feed(text, int, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_team_feed(text, int, timestamptz, uuid) TO authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run after applying)
-- ============================================================================
-- Test personal post pin:
-- SELECT public.rpc_pin_post('post-uuid-here', true);
-- 
-- Test personal post delete:
-- SELECT public.rpc_delete_post('post-uuid-here');
-- 
-- Test personal post visibility update:
-- SELECT public.rpc_update_post_visibility('post-uuid-here', 'friends');
-- 
-- Test team post visibility update:
-- SELECT public.rpc_update_team_post_visibility('team-post-uuid-here', 'members');
-- 
-- Test feed with pinned posts:
-- SELECT * FROM public.get_public_feed(20, NULL, NULL, 'username', NULL, 'global', false);
