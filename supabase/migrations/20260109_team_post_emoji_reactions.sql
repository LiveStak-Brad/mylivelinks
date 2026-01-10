-- Add full emoji reaction support to team posts
-- Allows: love, haha, wow, sad, fire (same as global posts)

-- 1. Drop the existing check constraint that only allows 'like'
ALTER TABLE public.team_feed_reactions 
DROP CONSTRAINT IF EXISTS team_feed_reactions_reaction_type_check;

-- 2. Add new check constraint that allows all reaction types
ALTER TABLE public.team_feed_reactions 
ADD CONSTRAINT team_feed_reactions_reaction_type_check 
CHECK (reaction_type IN ('like', 'love', 'haha', 'wow', 'sad', 'fire'));

-- 3. Update unique constraint to allow one reaction per user per post (any type)
-- First drop the old constraint if it exists
ALTER TABLE public.team_feed_reactions
DROP CONSTRAINT IF EXISTS team_feed_reactions_post_id_profile_id_reaction_type_key;

-- Add new unique constraint (one reaction per user per post, regardless of type)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'team_feed_reactions_post_id_profile_id_key'
  ) THEN
    ALTER TABLE public.team_feed_reactions
    ADD CONSTRAINT team_feed_reactions_post_id_profile_id_key 
    UNIQUE (post_id, profile_id);
  END IF;
END $$;

-- 1. Add reaction_type enum values check (allow multiple reaction types)
-- The team_feed_reactions table already has reaction_type column

-- 2. Update RPC to support all reaction types and allow changing reactions
DROP FUNCTION IF EXISTS public.rpc_react_team_post(uuid, text);
CREATE OR REPLACE FUNCTION public.rpc_react_team_post(
  p_post_id uuid,
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
  v_old_reaction_type text;
  v_cnt int;
  v_is_reacted boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Allow all reaction types: like, love, haha, wow, sad, fire
  IF p_reaction_type IS NULL OR p_reaction_type NOT IN ('like', 'love', 'haha', 'wow', 'sad', 'fire') THEN
    RAISE EXCEPTION 'invalid_reaction_type';
  END IF;

  SELECT p.team_id INTO v_team_id
  FROM public.team_feed_posts p
  WHERE p.id = p_post_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  IF public.is_team_banned(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'banned';
  END IF;

  IF NOT public.is_team_approved_member(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Check if user already has a reaction on this post
  SELECT reaction_type INTO v_old_reaction_type
  FROM public.team_feed_reactions 
  WHERE post_id = p_post_id AND profile_id = auth.uid()
  LIMIT 1;

  IF v_old_reaction_type IS NOT NULL THEN
    -- User already reacted - update the reaction type
    UPDATE public.team_feed_reactions
    SET reaction_type = p_reaction_type,
        created_at = now()
    WHERE post_id = p_post_id AND profile_id = auth.uid();
    
    v_is_reacted := true;
  ELSE
    -- New reaction - insert and increment count
    INSERT INTO public.team_feed_reactions (post_id, profile_id, reaction_type)
    VALUES (p_post_id, auth.uid(), p_reaction_type);

    UPDATE public.team_feed_posts tfp
    SET reaction_count = tfp.reaction_count + 1,
        updated_at = now()
    WHERE tfp.id = p_post_id;
    
    v_is_reacted := true;
  END IF;

  SELECT tfp.reaction_count INTO v_cnt
  FROM public.team_feed_posts tfp
  WHERE tfp.id = p_post_id;

  RETURN QUERY SELECT COALESCE(v_cnt, 0)::int, v_is_reacted;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_react_team_post(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_react_team_post(uuid, text) TO authenticated;

-- ============================================================================
-- UPDATE FEED RPC TO INCLUDE reaction_type
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
  reaction_type text,
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
    (
      SELECT r.reaction_type FROM public.team_feed_reactions r
      WHERE r.post_id = p.id AND r.profile_id = v_actor
      LIMIT 1
    )::text AS reaction_type,
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

REVOKE ALL ON FUNCTION public.rpc_get_team_feed(text, int, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_team_feed(text, int, timestamptz, uuid) TO authenticated;
