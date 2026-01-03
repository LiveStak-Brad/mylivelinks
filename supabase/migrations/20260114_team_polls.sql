-- ============================================================================
-- TEAM POLLS: Create and vote on polls
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. POLL OPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.team_poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.team_feed_posts(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  vote_count int NOT NULL DEFAULT 0,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_poll_options_post
  ON public.team_poll_options(post_id, display_order);

-- ============================================================================
-- 2. POLL VOTES TABLE (track who voted for what)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.team_poll_votes (
  post_id uuid NOT NULL REFERENCES public.team_feed_posts(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.team_poll_options(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, profile_id) -- One vote per user per poll
);

CREATE INDEX IF NOT EXISTS idx_team_poll_votes_option
  ON public.team_poll_votes(option_id);

-- ============================================================================
-- 3. ADD is_poll FLAG TO POSTS
-- ============================================================================

ALTER TABLE public.team_feed_posts
ADD COLUMN IF NOT EXISTS is_poll boolean NOT NULL DEFAULT false;

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

ALTER TABLE public.team_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_poll_votes ENABLE ROW LEVEL SECURITY;

-- Poll options - can view if team member
DROP POLICY IF EXISTS team_poll_options_select ON public.team_poll_options;
CREATE POLICY team_poll_options_select
ON public.team_poll_options FOR SELECT
USING (
  EXISTS(
    SELECT 1 FROM public.team_feed_posts p
    WHERE p.id = post_id
    AND public.is_team_approved_member(p.team_id, auth.uid())
  )
);

-- Poll options - can insert if creating own poll
DROP POLICY IF EXISTS team_poll_options_insert ON public.team_poll_options;
CREATE POLICY team_poll_options_insert
ON public.team_poll_options FOR INSERT
WITH CHECK (
  EXISTS(
    SELECT 1 FROM public.team_feed_posts p
    WHERE p.id = post_id
    AND p.author_id = auth.uid()
  )
);

-- Poll votes - can view if team member
DROP POLICY IF EXISTS team_poll_votes_select ON public.team_poll_votes;
CREATE POLICY team_poll_votes_select
ON public.team_poll_votes FOR SELECT
USING (
  EXISTS(
    SELECT 1 FROM public.team_feed_posts p
    WHERE p.id = post_id
    AND public.is_team_approved_member(p.team_id, auth.uid())
  )
);

-- Poll votes - can insert own vote
DROP POLICY IF EXISTS team_poll_votes_insert ON public.team_poll_votes;
CREATE POLICY team_poll_votes_insert
ON public.team_poll_votes FOR INSERT
WITH CHECK (
  profile_id = auth.uid()
  AND EXISTS(
    SELECT 1 FROM public.team_feed_posts p
    WHERE p.id = post_id
    AND public.is_team_approved_member(p.team_id, auth.uid())
  )
);

-- ============================================================================
-- 5. CREATE POLL RPC
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_create_team_poll(text, text, text[]);
CREATE OR REPLACE FUNCTION public.rpc_create_team_poll(
  p_team_slug text,
  p_question text,
  p_options text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
  v_actor uuid := auth.uid();
  v_post_id uuid;
  v_opt text;
  v_idx int := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF array_length(p_options, 1) < 2 THEN
    RAISE EXCEPTION 'poll_needs_at_least_2_options';
  END IF;

  IF array_length(p_options, 1) > 10 THEN
    RAISE EXCEPTION 'poll_max_10_options';
  END IF;

  -- Get team ID
  SELECT t.id INTO v_team_id
  FROM public.teams t
  WHERE t.slug = p_team_slug;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  -- Check membership
  IF NOT public.is_team_approved_member(v_team_id, v_actor) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Create the post with is_poll = true
  INSERT INTO public.team_feed_posts (team_id, author_id, text_content, is_poll)
  VALUES (v_team_id, v_actor, p_question, true)
  RETURNING id INTO v_post_id;

  -- Create poll options
  FOREACH v_opt IN ARRAY p_options
  LOOP
    INSERT INTO public.team_poll_options (post_id, option_text, display_order)
    VALUES (v_post_id, v_opt, v_idx);
    v_idx := v_idx + 1;
  END LOOP;

  RETURN v_post_id;
END;
$$;

-- ============================================================================
-- 6. VOTE ON POLL RPC
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_vote_team_poll(uuid, uuid);
CREATE OR REPLACE FUNCTION public.rpc_vote_team_poll(
  p_post_id uuid,
  p_option_id uuid
)
RETURNS TABLE(
  option_id uuid,
  option_text text,
  vote_count int,
  is_selected boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
  v_actor uuid := auth.uid();
  v_existing_option_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Verify post exists and is a poll
  SELECT p.team_id INTO v_team_id
  FROM public.team_feed_posts p
  WHERE p.id = p_post_id AND p.is_poll = true;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'poll_not_found';
  END IF;

  -- Check membership
  IF NOT public.is_team_approved_member(v_team_id, v_actor) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Check if user already voted
  SELECT pv.option_id INTO v_existing_option_id
  FROM public.team_poll_votes pv
  WHERE pv.post_id = p_post_id AND pv.profile_id = v_actor;

  IF v_existing_option_id IS NOT NULL THEN
    -- Remove old vote
    UPDATE public.team_poll_options
    SET vote_count = vote_count - 1
    WHERE id = v_existing_option_id;

    DELETE FROM public.team_poll_votes
    WHERE post_id = p_post_id AND profile_id = v_actor;
  END IF;

  -- If clicking same option, just remove vote (toggle off)
  IF v_existing_option_id IS DISTINCT FROM p_option_id THEN
    -- Add new vote
    INSERT INTO public.team_poll_votes (post_id, option_id, profile_id)
    VALUES (p_post_id, p_option_id, v_actor);

    UPDATE public.team_poll_options
    SET vote_count = vote_count + 1
    WHERE id = p_option_id;
  END IF;

  -- Return updated options with selection state
  RETURN QUERY
  SELECT
    po.id AS option_id,
    po.option_text,
    po.vote_count,
    EXISTS(
      SELECT 1 FROM public.team_poll_votes pv
      WHERE pv.option_id = po.id AND pv.profile_id = v_actor
    ) AS is_selected
  FROM public.team_poll_options po
  WHERE po.post_id = p_post_id
  ORDER BY po.display_order;
END;
$$;

-- ============================================================================
-- 7. GET POLL OPTIONS RPC
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_get_poll_options(uuid);
CREATE OR REPLACE FUNCTION public.rpc_get_poll_options(
  p_post_id uuid
)
RETURNS TABLE(
  option_id uuid,
  option_text text,
  vote_count int,
  is_selected boolean
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
  -- Verify post exists
  SELECT p.team_id INTO v_team_id
  FROM public.team_feed_posts p
  WHERE p.id = p_post_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  -- Check membership
  IF NOT public.is_team_approved_member(v_team_id, v_actor) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    po.id AS option_id,
    po.option_text,
    po.vote_count,
    EXISTS(
      SELECT 1 FROM public.team_poll_votes pv
      WHERE pv.option_id = po.id AND pv.profile_id = v_actor
    ) AS is_selected
  FROM public.team_poll_options po
  WHERE po.post_id = p_post_id
  ORDER BY po.display_order;
END;
$$;

-- ============================================================================
-- 8. GRANTS
-- ============================================================================

REVOKE ALL ON FUNCTION public.rpc_create_team_poll(text, text, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_vote_team_poll(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_poll_options(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rpc_create_team_poll(text, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_vote_team_poll(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_poll_options(uuid) TO authenticated;

GRANT SELECT, INSERT ON TABLE public.team_poll_options TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.team_poll_votes TO authenticated;

COMMIT;
