-- Fix ambiguous column reference in rpc_react_team_post
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
  IF EXISTS (
    SELECT 1 FROM public.team_feed_reactions 
    WHERE post_id = p_post_id AND profile_id = auth.uid()
  ) THEN
    -- Already reacted, just return current state
    v_inserted := false;
  ELSE
    -- Insert new reaction
    INSERT INTO public.team_feed_reactions (post_id, profile_id, reaction_type)
    VALUES (p_post_id, auth.uid(), p_reaction_type);

    v_inserted := true;

    UPDATE public.team_feed_posts tfp
    SET reaction_count = tfp.reaction_count + 1,
        updated_at = now()
    WHERE tfp.id = p_post_id;
  END IF;

  SELECT tfp.reaction_count INTO v_cnt
  FROM public.team_feed_posts tfp
  WHERE tfp.id = p_post_id;

  RETURN QUERY SELECT COALESCE(v_cnt, 0)::int, v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_react_team_post(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_react_team_post(uuid, text) TO authenticated;
