BEGIN;

-- Fix rpc_accept_team_invite to match canonical teams schema
-- Previous version referenced non-existent team_memberships.joined_at and used invalid role value 'Member'.

DROP FUNCTION IF EXISTS public.rpc_accept_team_invite(bigint);
CREATE OR REPLACE FUNCTION public.rpc_accept_team_invite(p_invite_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_invite record;
  v_team_slug text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_invite
  FROM public.team_invites
  WHERE id = p_invite_id;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found');
  END IF;

  IF v_invite.invitee_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invite is not for you');
  END IF;

  IF v_invite.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite is no longer valid');
  END IF;

  SELECT slug INTO v_team_slug
  FROM public.teams
  WHERE id = v_invite.team_id;

  UPDATE public.team_invites
  SET status = 'accepted', responded_at = now()
  WHERE id = p_invite_id;

  INSERT INTO public.team_memberships (
    team_id,
    profile_id,
    status,
    role,
    approved_at,
    last_status_changed_at
  ) VALUES (
    v_invite.team_id,
    v_user_id,
    'approved',
    'Team_Member',
    now(),
    now()
  )
  ON CONFLICT (team_id, profile_id) DO UPDATE
  SET status = 'approved',
      approved_at = now(),
      rejected_at = NULL,
      left_at = NULL,
      banned_at = NULL,
      last_status_changed_at = now();

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
  SELECT
    v_invite.inviter_id,
    v_user_id,
    'team_invite_accepted',
    'team',
    v_invite.team_id::text,
    COALESCE(p.display_name, p.username, 'Someone') || ' accepted your team invite',
    false,
    now()
  FROM public.profiles p WHERE p.id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'team_id', v_invite.team_id,
    'team_slug', v_team_slug
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_accept_team_invite(bigint) TO authenticated;

COMMIT;
