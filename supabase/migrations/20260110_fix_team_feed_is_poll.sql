-- ============================================================================
-- FIX: Add is_poll back to rpc_get_team_feed
-- The 20260110_post_management_features.sql migration accidentally removed is_poll
-- ============================================================================

BEGIN;

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
  created_at timestamptz,
  is_poll boolean,
  is_reacted boolean,
  reaction_type text,
  gift_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
  v_actor uuid := auth.uid();
  v_l int;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT t.id INTO v_team_id
  FROM public.teams t
  WHERE t.slug = p_team_slug;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  IF NOT public.is_team_approved_member(v_team_id, v_actor) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_l := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);

  RETURN QUERY
  SELECT
    p.id AS post_id,
    p.team_id,
    p.author_id,
    pr.username::text AS author_username,
    pr.avatar_url::text AS author_avatar_url,
    p.text_content,
    p.media_url,
    COALESCE(p.visibility, 'public')::text AS visibility,
    p.is_pinned,
    p.pinned_at,
    p.comment_count,
    p.reaction_count,
    p.created_at,
    COALESCE(p.is_poll, false) AS is_poll,
    EXISTS(
      SELECT 1 FROM public.team_feed_reactions r
      WHERE r.post_id = p.id AND r.profile_id = v_actor
    ) AS is_reacted,
    (
      SELECT r.reaction_type FROM public.team_feed_reactions r
      WHERE r.post_id = p.id AND r.profile_id = v_actor
      LIMIT 1
    )::text AS reaction_type,
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM public.gifts g
      WHERE g.team_post_id = p.id
    ), 0) AS gift_count
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

REVOKE ALL ON FUNCTION public.rpc_get_team_feed(text, int, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_team_feed(text, int, timestamptz, uuid) TO authenticated;

COMMIT;
