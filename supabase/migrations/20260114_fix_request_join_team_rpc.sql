-- Fix rpc_request_join_team: column reference 'team_id' is ambiguous
-- Also adds notification to team admins when someone requests to join

BEGIN;

-- Must drop existing function first because return type is changing
DROP FUNCTION IF EXISTS public.rpc_request_join_team(text);

-- Recreate the function with fixed column aliases
CREATE OR REPLACE FUNCTION public.rpc_request_join_team(p_team_slug text)
RETURNS TABLE(out_team_id uuid, out_status public.team_membership_status, out_role public.team_member_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
  v_team_name text;
  v_requester_id uuid;
  v_requester_username text;
  v_admin_ids uuid[];
BEGIN
  v_requester_id := auth.uid();
  
  IF v_requester_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Get the team
  SELECT t.id, t.name INTO v_team_id, v_team_name
  FROM public.teams t
  WHERE t.slug = p_team_slug;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  -- Check if banned
  IF public.is_team_banned(v_team_id, v_requester_id) THEN
    RAISE EXCEPTION 'banned';
  END IF;

  -- Get requester's username for the notification
  SELECT username INTO v_requester_username
  FROM public.profiles
  WHERE id = v_requester_id;

  -- Insert or update the membership request
  INSERT INTO public.team_memberships (
    team_id,
    profile_id,
    status,
    role,
    requested_at,
    approved_at,
    rejected_at,
    left_at,
    banned_at,
    last_status_changed_at
  )
  VALUES (
    v_team_id,
    v_requester_id,
    'requested',
    'Team_Member',
    now(),
    NULL,
    NULL,
    NULL,
    NULL,
    now()
  )
  ON CONFLICT (team_id, profile_id) DO UPDATE
    SET status = 'requested',
        role = 'Team_Member',
        requested_at = now(),
        approved_at = NULL,
        rejected_at = NULL,
        left_at = NULL,
        banned_at = NULL,
        last_status_changed_at = now();

  -- Get all team admins to notify them
  SELECT array_agg(m.profile_id) INTO v_admin_ids
  FROM public.team_memberships m
  WHERE m.team_id = v_team_id
    AND m.status = 'approved'
    AND m.role = 'Team_Admin';

  -- Also include the team creator
  SELECT array_agg(DISTINCT admin_id) INTO v_admin_ids
  FROM (
    SELECT unnest(v_admin_ids) AS admin_id
    UNION
    SELECT created_by AS admin_id FROM public.teams WHERE id = v_team_id
  ) combined
  WHERE admin_id IS NOT NULL;

  -- Send notification to each admin
  IF v_admin_ids IS NOT NULL AND array_length(v_admin_ids, 1) > 0 THEN
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
      admin_id,
      v_requester_id,
      'team_join_request',
      'team',
      v_team_id,
      COALESCE(v_requester_username, 'Someone') || ' requested to join ' || v_team_name,
      false,
      now()
    FROM unnest(v_admin_ids) AS admin_id
    WHERE admin_id != v_requester_id;  -- Don't notify yourself
  END IF;

  -- Return the membership record
  RETURN QUERY
  SELECT m.team_id AS out_team_id, m.status AS out_status, m.role AS out_role
  FROM public.team_memberships m
  WHERE m.team_id = v_team_id
    AND m.profile_id = v_requester_id;
END;
$$;

-- Update the notifications type constraint to include team_join_request
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'like_post',
      'like_comment',
      'comment',
      'follow',
      'follow_link',
      'gift',
      'system',
      'team_invite',
      'team_invite_accepted',
      'team_join_request'
    )
  );

-- Grant execute permission
REVOKE ALL ON FUNCTION public.rpc_request_join_team(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_request_join_team(text) TO authenticated;

COMMIT;
