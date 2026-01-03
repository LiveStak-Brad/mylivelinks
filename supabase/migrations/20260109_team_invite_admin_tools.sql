-- =============================================================================
-- Team invite admin utilities (cancel + resend)
-- =============================================================================
BEGIN;

DROP POLICY IF EXISTS "Users can view invites they sent or received" ON public.team_invites;
CREATE POLICY "Users can view invites they sent or received"
  ON public.team_invites
  FOR SELECT
  USING (
    auth.uid() = inviter_id
    OR auth.uid() = invitee_id
    OR EXISTS (
      SELECT 1
      FROM public.team_memberships tm
      WHERE tm.team_id = team_invites.team_id
        AND tm.profile_id = auth.uid()
        AND tm.status = 'approved'
        AND tm.role IN ('Team_Admin', 'Team_Moderator')
    )
  );

DROP FUNCTION IF EXISTS public.rpc_cancel_team_invite(bigint);
CREATE OR REPLACE FUNCTION public.rpc_cancel_team_invite(p_invite_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_invite team_invites%ROWTYPE;
  v_viewer_role text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_invite
  FROM public.team_invites
  WHERE id = p_invite_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found');
  END IF;

  IF v_invite.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite is not pending');
  END IF;

  SELECT role INTO v_viewer_role
  FROM public.team_memberships
  WHERE team_id = v_invite.team_id
    AND profile_id = v_user_id
    AND status = 'approved'
  LIMIT 1;

  IF v_invite.inviter_id <> v_user_id
     AND (v_viewer_role IS NULL OR v_viewer_role NOT IN ('Team_Admin', 'Team_Moderator')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to cancel this invite');
  END IF;

  UPDATE public.team_invites
  SET status = 'expired', responded_at = now()
  WHERE id = p_invite_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_resend_team_invite(bigint);
CREATE OR REPLACE FUNCTION public.rpc_resend_team_invite(p_invite_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_invite team_invites%ROWTYPE;
  v_viewer_role text;
  v_team_name text;
  v_team_slug text;
  v_actor_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_invite
  FROM public.team_invites
  WHERE id = p_invite_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found');
  END IF;

  IF v_invite.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite is not pending');
  END IF;

  SELECT role INTO v_viewer_role
  FROM public.team_memberships
  WHERE team_id = v_invite.team_id
    AND profile_id = v_user_id
    AND status = 'approved'
  LIMIT 1;

  IF v_invite.inviter_id <> v_user_id
     AND (v_viewer_role IS NULL OR v_viewer_role NOT IN ('Team_Admin', 'Team_Moderator')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to resend this invite');
  END IF;

  SELECT name, slug INTO v_team_name, v_team_slug
  FROM public.teams
  WHERE id = v_invite.team_id;

  SELECT COALESCE(display_name, username, 'Someone') INTO v_actor_name
  FROM public.profiles
  WHERE id = v_user_id;

  UPDATE public.team_invites
  SET created_at = now()
  WHERE id = p_invite_id;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    entity_type,
    entity_id,
    message,
    read,
    created_at
  )
  VALUES (
    v_invite.invitee_id,
    v_user_id,
    'team_invite',
    'team',
    v_invite.team_id::text,
    v_actor_name || ' invited you to join ' || COALESCE(v_team_name, 'a team'),
    false,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'team_id', v_invite.team_id,
    'team_slug', v_team_slug
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_cancel_team_invite(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_resend_team_invite(bigint) TO authenticated;

COMMIT;
