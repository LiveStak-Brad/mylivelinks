-- ============================================================================
-- TEAM INVITES SYSTEM
-- ============================================================================
-- Allows team members to invite other users to join their team.
-- Creates notifications that recipients can click to join.
-- ============================================================================

BEGIN;

-- 1) Create team_invites table
CREATE TABLE IF NOT EXISTS public.team_invites (
  id bigserial PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  
  -- Prevent duplicate pending invites
  CONSTRAINT unique_pending_invite UNIQUE (team_id, invitee_id, status)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_invites_invitee 
  ON public.team_invites(invitee_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_invites_team 
  ON public.team_invites(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_invites_inviter 
  ON public.team_invites(inviter_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view invites they sent or received" ON public.team_invites;
CREATE POLICY "Users can view invites they sent or received"
  ON public.team_invites
  FOR SELECT
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

DROP POLICY IF EXISTS "Team members can send invites" ON public.team_invites;
CREATE POLICY "Team members can send invites"
  ON public.team_invites
  FOR INSERT
  WITH CHECK (
    auth.uid() = inviter_id
    AND EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.team_id = team_invites.team_id
        AND tm.profile_id = auth.uid()
        AND tm.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Invitees can update their invites" ON public.team_invites;
CREATE POLICY "Invitees can update their invites"
  ON public.team_invites
  FOR UPDATE
  USING (auth.uid() = invitee_id)
  WITH CHECK (auth.uid() = invitee_id);

-- Grants
GRANT SELECT, INSERT, UPDATE ON TABLE public.team_invites TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.team_invites_id_seq TO authenticated;


-- 2) RPC function to send a team invite
DROP FUNCTION IF EXISTS public.rpc_send_team_invite(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.rpc_send_team_invite(
  p_team_id uuid,
  p_invitee_id uuid,
  p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter_id uuid := auth.uid();
  v_invite_id bigint;
  v_team_name text;
  v_inviter_name text;
  v_team_slug text;
BEGIN
  -- Check caller is authenticated
  IF v_inviter_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check inviter is a member of the team
  IF NOT EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE team_id = p_team_id
      AND profile_id = v_inviter_id
      AND status = 'approved'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not a member of this team');
  END IF;

  -- Check invitee exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_invitee_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Check invitee is not already a member
  IF EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE team_id = p_team_id
      AND profile_id = p_invitee_id
      AND status IN ('approved', 'pending')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is already a member or has a pending request');
  END IF;

  -- Check no pending invite already exists
  IF EXISTS (
    SELECT 1 FROM public.team_invites
    WHERE team_id = p_team_id
      AND invitee_id = p_invitee_id
      AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite already sent');
  END IF;

  -- Get team info
  SELECT name, slug INTO v_team_name, v_team_slug
  FROM public.teams WHERE id = p_team_id;

  -- Get inviter name
  SELECT COALESCE(display_name, username, 'Someone') INTO v_inviter_name
  FROM public.profiles WHERE id = v_inviter_id;

  -- Create the invite
  INSERT INTO public.team_invites (team_id, inviter_id, invitee_id, message)
  VALUES (p_team_id, v_inviter_id, p_invitee_id, p_message)
  RETURNING id INTO v_invite_id;

  -- Create notification for invitee
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    entity_type,
    entity_id,
    message,
    read,
    created_at
  ) VALUES (
    p_invitee_id,
    v_inviter_id,
    'team_invite',
    'team',
    p_team_id::text,
    v_inviter_name || ' invited you to join ' || v_team_name,
    false,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'invite_id', v_invite_id,
    'team_slug', v_team_slug
  );
END;
$$;


-- 3) RPC function to accept a team invite
DROP FUNCTION IF EXISTS public.rpc_accept_team_invite(bigint);
CREATE OR REPLACE FUNCTION public.rpc_accept_team_invite(p_invite_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_invite record;
  v_team_slug text;
BEGIN
  -- Check caller is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get the invite
  SELECT * INTO v_invite
  FROM public.team_invites
  WHERE id = p_invite_id;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found');
  END IF;

  -- Check user is the invitee
  IF v_invite.invitee_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invite is not for you');
  END IF;

  -- Check invite is still pending
  IF v_invite.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite is no longer valid');
  END IF;

  -- Get team slug
  SELECT slug INTO v_team_slug FROM public.teams WHERE id = v_invite.team_id;

  -- Update invite status
  UPDATE public.team_invites
  SET status = 'accepted', responded_at = now()
  WHERE id = p_invite_id;

  -- Create membership (or update if exists)
  INSERT INTO public.team_memberships (team_id, profile_id, role, status, joined_at)
  VALUES (v_invite.team_id, v_user_id, 'Member', 'approved', now())
  ON CONFLICT (team_id, profile_id) DO UPDATE
  SET status = 'approved', joined_at = now();

  -- Create notification for inviter that invite was accepted
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


-- 4) RPC function to decline a team invite
DROP FUNCTION IF EXISTS public.rpc_decline_team_invite(bigint);
CREATE OR REPLACE FUNCTION public.rpc_decline_team_invite(p_invite_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_invite record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_invite FROM public.team_invites WHERE id = p_invite_id;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite not found');
  END IF;

  IF v_invite.invitee_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invite is not for you');
  END IF;

  IF v_invite.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite is no longer valid');
  END IF;

  UPDATE public.team_invites
  SET status = 'declined', responded_at = now()
  WHERE id = p_invite_id;

  RETURN jsonb_build_object('success', true);
END;
$$;


-- 5) RPC function to get pending invites for a user
DROP FUNCTION IF EXISTS public.rpc_get_my_team_invites();
CREATE OR REPLACE FUNCTION public.rpc_get_my_team_invites()
RETURNS TABLE (
  invite_id bigint,
  team_id uuid,
  team_name text,
  team_slug text,
  team_icon_url text,
  inviter_id uuid,
  inviter_username text,
  inviter_display_name text,
  inviter_avatar_url text,
  message text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ti.id as invite_id,
    ti.team_id,
    t.name as team_name,
    t.slug as team_slug,
    t.icon_url as team_icon_url,
    ti.inviter_id,
    p.username as inviter_username,
    p.display_name as inviter_display_name,
    p.avatar_url as inviter_avatar_url,
    ti.message,
    ti.created_at
  FROM public.team_invites ti
  JOIN public.teams t ON t.id = ti.team_id
  JOIN public.profiles p ON p.id = ti.inviter_id
  WHERE ti.invitee_id = auth.uid()
    AND ti.status = 'pending'
  ORDER BY ti.created_at DESC;
$$;


-- 6) Grant execute permissions
GRANT EXECUTE ON FUNCTION public.rpc_send_team_invite(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_accept_team_invite(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_decline_team_invite(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_my_team_invites() TO authenticated;

COMMIT;

-- Done!
SELECT 'Team invites system created successfully' AS result;
