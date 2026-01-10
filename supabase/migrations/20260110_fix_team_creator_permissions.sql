-- ============================================================================
-- FIX: Team creator should always have moderation permissions
-- Also: Only allow one pinned post per team at a time
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FIX team_can_moderate to include team creator
-- ============================================================================

CREATE OR REPLACE FUNCTION public.team_can_moderate(p_team_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT (
    -- Team creator always has moderation rights
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = p_team_id
        AND t.created_by = p_profile_id
    )
    OR
    -- Team Admin or Moderator role
    EXISTS (
      SELECT 1
      FROM public.team_memberships m
      WHERE m.team_id = p_team_id
        AND m.profile_id = p_profile_id
        AND m.status = 'approved'
        AND m.role IN ('Team_Admin','Team_Moderator')
    )
  );
$$;

-- ============================================================================
-- 2. FIX rpc_pin_team_post to only allow one pinned post at a time
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_pin_team_post(uuid, boolean);
CREATE OR REPLACE FUNCTION public.rpc_pin_team_post(p_post_id uuid, p_pin boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_team_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT team_id INTO v_team_id
  FROM public.team_feed_posts
  WHERE id = p_post_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  -- Only moderators (or team creator) can pin/unpin
  IF NOT public.team_can_moderate(v_team_id, v_actor) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- If pinning, first unpin all other posts in this team
  IF p_pin THEN
    UPDATE public.team_feed_posts
    SET 
      is_pinned = false,
      pinned_at = NULL,
      updated_at = now()
    WHERE team_id = v_team_id
      AND is_pinned = true
      AND id != p_post_id;
  END IF;

  -- Now pin/unpin the target post
  UPDATE public.team_feed_posts
  SET 
    is_pinned = p_pin,
    pinned_at = CASE WHEN p_pin THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_post_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_pin_team_post(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_pin_team_post(uuid, boolean) TO authenticated;

COMMIT;
