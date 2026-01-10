-- Fix ambiguous vote_count column reference in rpc_vote_team_poll
-- The UPDATE statements need to explicitly qualify the column reference
-- to avoid ambiguity with other tables that have vote_count columns

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
    -- Remove old vote - explicitly qualify the column reference
    UPDATE public.team_poll_options tpo
    SET vote_count = tpo.vote_count - 1
    WHERE tpo.id = v_existing_option_id;

    DELETE FROM public.team_poll_votes
    WHERE post_id = p_post_id AND profile_id = v_actor;
  END IF;

  -- If clicking same option, just remove vote (toggle off)
  IF v_existing_option_id IS DISTINCT FROM p_option_id THEN
    -- Add new vote
    INSERT INTO public.team_poll_votes (post_id, option_id, profile_id)
    VALUES (p_post_id, p_option_id, v_actor);

    -- Explicitly qualify the column reference
    UPDATE public.team_poll_options tpo
    SET vote_count = tpo.vote_count + 1
    WHERE tpo.id = p_option_id;
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

REVOKE ALL ON FUNCTION public.rpc_vote_team_poll(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_vote_team_poll(uuid, uuid) TO authenticated;
