-- ============================================================================
-- TEAM POSTS V2: Comments, Reactions, Gifting
-- ============================================================================
-- This migration adds:
-- 1. rpc_get_post_comments - fetch comments for a post with author info
-- 2. Updates rpc_get_team_feed to include is_reacted for current user
-- 3. Gift attribution columns for team posts/comments
-- 4. rpc_gift_team_post / rpc_gift_team_comment - gift to post/comment authors
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FETCH COMMENTS RPC
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_get_post_comments(uuid, int, int);
CREATE OR REPLACE FUNCTION public.rpc_get_post_comments(
  p_post_id uuid,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  comment_id uuid,
  post_id uuid,
  author_id uuid,
  author_username text,
  author_display_name text,
  author_avatar_url text,
  text_content text,
  parent_comment_id uuid,
  created_at timestamptz,
  gift_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
BEGIN
  -- Get the team_id from the post
  SELECT p.team_id INTO v_team_id
  FROM public.team_feed_posts p
  WHERE p.id = p_post_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  -- Check membership
  IF NOT public.is_team_approved_member(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    c.id AS comment_id,
    c.post_id,
    c.author_id,
    pr.username::text AS author_username,
    pr.display_name::text AS author_display_name,
    pr.avatar_url::text AS author_avatar_url,
    c.text_content,
    c.parent_comment_id,
    c.created_at,
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM public.gifts g
      WHERE g.team_comment_id = c.id
    ), 0) AS gift_count
  FROM public.team_feed_comments c
  JOIN public.profiles pr ON pr.id = c.author_id
  WHERE c.post_id = p_post_id
  ORDER BY c.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================================================
-- 2. UPDATE FEED RPC TO INCLUDE is_reacted
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
  is_pinned boolean,
  pinned_at timestamptz,
  comment_count int,
  reaction_count int,
  created_at timestamptz,
  updated_at timestamptz,
  is_reacted boolean,
  gift_count bigint,
  is_poll boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
  v_actor uuid := auth.uid();
BEGIN
  SELECT t.id INTO v_team_id
  FROM public.teams t
  WHERE t.slug = p_team_slug;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  IF NOT public.is_team_approved_member(v_team_id, v_actor) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS post_id,
    p.team_id,
    p.author_id,
    pr.username::text AS author_username,
    pr.avatar_url::text AS author_avatar_url,
    p.text_content,
    p.media_url,
    p.is_pinned,
    p.pinned_at,
    p.comment_count,
    p.reaction_count,
    p.created_at,
    p.updated_at,
    EXISTS(
      SELECT 1 FROM public.team_feed_reactions r
      WHERE r.post_id = p.id AND r.profile_id = v_actor
    ) AS is_reacted,
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM public.gifts g
      WHERE g.team_post_id = p.id
    ), 0) AS gift_count,
    COALESCE(p.is_poll, false) AS is_poll
  FROM public.team_feed_posts p
  JOIN public.profiles pr ON pr.id = p.author_id
  WHERE p.team_id = v_team_id
    AND (
      p_before_created_at IS NULL
      OR p.created_at < p_before_created_at
      OR (p.created_at = p_before_created_at AND p.id < p_before_id)
    )
  ORDER BY p.is_pinned DESC, p.pinned_at DESC NULLS LAST, p.created_at DESC, p.id DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- 3. ADD GIFT ATTRIBUTION COLUMNS
-- ============================================================================

ALTER TABLE public.gifts
ADD COLUMN IF NOT EXISTS team_post_id uuid REFERENCES public.team_feed_posts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS team_comment_id uuid REFERENCES public.team_feed_comments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gifts_team_post_id
  ON public.gifts(team_post_id)
  WHERE team_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gifts_team_comment_id
  ON public.gifts(team_comment_id)
  WHERE team_comment_id IS NOT NULL;

-- ============================================================================
-- 4. GIFT TEAM POST RPC
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_gift_team_post(uuid, int, int);
CREATE OR REPLACE FUNCTION public.rpc_gift_team_post(
  p_post_id uuid,
  p_gift_type_id int,
  p_coins_amount int
)
RETURNS TABLE(
  gift_id bigint,
  coins_spent int,
  diamonds_awarded int,
  recipient_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_team_id uuid;
  v_author_id uuid;
  v_gift_result record;
  v_gift_id bigint;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Get post info
  SELECT p.team_id, p.author_id INTO v_team_id, v_author_id
  FROM public.team_feed_posts p
  WHERE p.id = p_post_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  -- Check membership
  IF NOT public.is_team_approved_member(v_team_id, v_actor) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Cannot gift yourself
  IF v_author_id = v_actor THEN
    RAISE EXCEPTION 'cannot_gift_self';
  END IF;

  -- Call existing send_gift_v2 (handles balance checks, ledger, etc.)
  SELECT * INTO v_gift_result
  FROM public.send_gift_v2(
    p_sender_id := v_actor,
    p_recipient_id := v_author_id,
    p_coins_amount := p_coins_amount,
    p_gift_type_id := p_gift_type_id,
    p_stream_id := NULL,
    p_request_id := gen_random_uuid()::text,
    p_room_id := NULL
  );

  v_gift_id := v_gift_result.gift_id;

  -- Update the gift with team_post_id attribution
  UPDATE public.gifts
  SET team_post_id = p_post_id
  WHERE id = v_gift_id;

  RETURN QUERY
  SELECT
    v_gift_id AS gift_id,
    p_coins_amount AS coins_spent,
    p_coins_amount AS diamonds_awarded,
    v_author_id AS recipient_id;
END;
$$;

-- ============================================================================
-- 5. GIFT TEAM COMMENT RPC
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_gift_team_comment(uuid, int, int);
CREATE OR REPLACE FUNCTION public.rpc_gift_team_comment(
  p_comment_id uuid,
  p_gift_type_id int,
  p_coins_amount int
)
RETURNS TABLE(
  gift_id bigint,
  coins_spent int,
  diamonds_awarded int,
  recipient_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_team_id uuid;
  v_author_id uuid;
  v_gift_result record;
  v_gift_id bigint;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Get comment info
  SELECT c.team_id, c.author_id INTO v_team_id, v_author_id
  FROM public.team_feed_comments c
  WHERE c.id = p_comment_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'comment_not_found';
  END IF;

  -- Check membership
  IF NOT public.is_team_approved_member(v_team_id, v_actor) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Cannot gift yourself
  IF v_author_id = v_actor THEN
    RAISE EXCEPTION 'cannot_gift_self';
  END IF;

  -- Call existing send_gift_v2
  SELECT * INTO v_gift_result
  FROM public.send_gift_v2(
    p_sender_id := v_actor,
    p_recipient_id := v_author_id,
    p_coins_amount := p_coins_amount,
    p_gift_type_id := p_gift_type_id,
    p_stream_id := NULL,
    p_request_id := gen_random_uuid()::text,
    p_room_id := NULL
  );

  v_gift_id := v_gift_result.gift_id;

  -- Update the gift with team_comment_id attribution
  UPDATE public.gifts
  SET team_comment_id = p_comment_id
  WHERE id = v_gift_id;

  RETURN QUERY
  SELECT
    v_gift_id AS gift_id,
    p_coins_amount AS coins_spent,
    p_coins_amount AS diamonds_awarded,
    v_author_id AS recipient_id;
END;
$$;

-- ============================================================================
-- 6. REACT TO COMMENT RPC (for completeness)
-- ============================================================================

-- Create comment reactions table if not exists
CREATE TABLE IF NOT EXISTS public.team_comment_reactions (
  comment_id uuid NOT NULL REFERENCES public.team_feed_comments(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, profile_id, reaction_type)
);

ALTER TABLE public.team_comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_comment_reactions_select ON public.team_comment_reactions;
CREATE POLICY team_comment_reactions_select
ON public.team_comment_reactions FOR SELECT
USING (
  EXISTS(
    SELECT 1 FROM public.team_feed_comments c
    WHERE c.id = comment_id
    AND public.is_team_approved_member(c.team_id, auth.uid())
  )
);

DROP POLICY IF EXISTS team_comment_reactions_insert ON public.team_comment_reactions;
CREATE POLICY team_comment_reactions_insert
ON public.team_comment_reactions FOR INSERT
WITH CHECK (
  profile_id = auth.uid()
  AND EXISTS(
    SELECT 1 FROM public.team_feed_comments c
    WHERE c.id = comment_id
    AND public.is_team_approved_member(c.team_id, auth.uid())
  )
);

DROP POLICY IF EXISTS team_comment_reactions_delete ON public.team_comment_reactions;
CREATE POLICY team_comment_reactions_delete
ON public.team_comment_reactions FOR DELETE
USING (profile_id = auth.uid());

DROP FUNCTION IF EXISTS public.rpc_react_team_comment(uuid, text);
CREATE OR REPLACE FUNCTION public.rpc_react_team_comment(
  p_comment_id uuid,
  p_reaction_type text DEFAULT 'like'
)
RETURNS TABLE(reaction_count int, is_reacted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
  v_rowcount int := 0;
  v_inserted boolean := false;
  v_cnt int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_reaction_type IS NULL OR p_reaction_type <> 'like' THEN
    RAISE EXCEPTION 'invalid_reaction_type';
  END IF;

  SELECT c.team_id INTO v_team_id
  FROM public.team_feed_comments c
  WHERE c.id = p_comment_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'comment_not_found';
  END IF;

  IF NOT public.is_team_approved_member(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Toggle: delete if exists, insert if not
  DELETE FROM public.team_comment_reactions
  WHERE comment_id = p_comment_id
    AND profile_id = auth.uid()
    AND reaction_type = p_reaction_type;

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;

  IF v_rowcount = 0 THEN
    INSERT INTO public.team_comment_reactions (comment_id, profile_id, reaction_type)
    VALUES (p_comment_id, auth.uid(), p_reaction_type);
    v_inserted := true;
  END IF;

  SELECT COUNT(*)::int INTO v_cnt
  FROM public.team_comment_reactions
  WHERE comment_id = p_comment_id AND reaction_type = p_reaction_type;

  RETURN QUERY SELECT v_cnt AS reaction_count, v_inserted AS is_reacted;
END;
$$;

-- ============================================================================
-- 7. GRANTS
-- ============================================================================

REVOKE ALL ON FUNCTION public.rpc_get_post_comments(uuid, int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_gift_team_post(uuid, int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_gift_team_comment(uuid, int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_react_team_comment(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rpc_get_post_comments(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_gift_team_post(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_gift_team_comment(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_react_team_comment(uuid, text) TO authenticated;

GRANT SELECT, INSERT, DELETE ON TABLE public.team_comment_reactions TO authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- SELECT * FROM public.rpc_get_post_comments('post-uuid-here', 50, 0);
-- SELECT * FROM public.rpc_get_team_feed('your-team-slug', 10, NULL, NULL);
