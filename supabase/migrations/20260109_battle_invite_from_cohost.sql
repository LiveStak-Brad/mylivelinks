-- =============================================================================
-- Battle Invite From Cohost Migration
-- =============================================================================
-- Adds ability to send battle invites from within a cohost session
-- Other host must accept to start the battle
-- =============================================================================

BEGIN;

-- =============================================================================
-- Create RPC to send battle invite from cohost session
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_send_battle_invite_from_cohost(
  p_session_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_session live_sessions%ROWTYPE;
  v_other_host_id UUID;
  v_invite_id UUID;
  v_existing_pending INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Fetch the cohost session
  SELECT * INTO v_session
  FROM live_sessions
  WHERE id = p_session_id
    AND (host_a = v_user_id OR host_b = v_user_id)
    AND type = 'cohost'
    AND status = 'active'
  FOR UPDATE;
  
  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Cohost session not found or not active';
  END IF;
  
  -- Determine the other host
  IF v_session.host_a = v_user_id THEN
    v_other_host_id := v_session.host_b;
  ELSE
    v_other_host_id := v_session.host_a;
  END IF;
  
  -- Cancel any existing pending battle invites for this session
  UPDATE live_session_invites
  SET status = 'declined', responded_at = now()
  WHERE session_id = p_session_id
    AND type = 'battle'
    AND status = 'pending';
  
  -- Create the battle invite (linked to existing session)
  INSERT INTO live_session_invites (
    from_host_id,
    to_host_id,
    type,
    mode,
    status,
    session_id
  )
  VALUES (
    v_user_id,
    v_other_host_id,
    'battle',
    v_session.mode,
    'pending',
    p_session_id
  )
  RETURNING id INTO v_invite_id;
  
  RETURN v_invite_id;
END;
$$;

-- =============================================================================
-- Create RPC to accept battle invite from cohost session
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_accept_battle_invite_from_cohost(
  p_invite_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_invite live_session_invites%ROWTYPE;
  v_session_id UUID;
  v_battle_duration INTERVAL;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Fetch the invite
  SELECT * INTO v_invite
  FROM live_session_invites
  WHERE id = p_invite_id
    AND to_host_id = v_user_id
    AND type = 'battle'
    AND status = 'pending'
  FOR UPDATE;
  
  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Battle invite not found or already responded';
  END IF;
  
  -- Must have a session_id (invite from cohost)
  IF v_invite.session_id IS NULL THEN
    RAISE EXCEPTION 'Invalid battle invite - no session linked';
  END IF;
  
  v_session_id := v_invite.session_id;
  
  -- Determine battle duration based on mode
  IF v_invite.mode = 'speed' THEN
    v_battle_duration := INTERVAL '60 seconds';
  ELSE
    v_battle_duration := INTERVAL '180 seconds';
  END IF;
  
  -- Convert the cohost session to battle
  UPDATE live_sessions
  SET 
    type = 'battle',
    started_at = now(),
    ends_at = now() + v_battle_duration
  WHERE id = v_session_id;
  
  -- Initialize battle_scores table
  INSERT INTO battle_scores (
    session_id,
    points_a,
    points_b,
    supporters,
    participant_states,
    boost_active,
    boost_multiplier,
    boost_started_at,
    boost_ends_at
  ) VALUES (
    v_session_id,
    0,
    0,
    '[]'::jsonb,
    '{}'::jsonb,
    false,
    1,
    NULL,
    NULL
  )
  ON CONFLICT (session_id) DO NOTHING;
  
  -- Update the invite
  UPDATE live_session_invites
  SET status = 'accepted', responded_at = now()
  WHERE id = p_invite_id;
  
  RETURN jsonb_build_object(
    'status', 'accepted',
    'invite_id', p_invite_id,
    'session_id', v_session_id,
    'type', 'battle',
    'started_at', now(),
    'ends_at', now() + v_battle_duration
  );
END;
$$;

-- =============================================================================
-- Create RPC to decline battle invite from cohost session
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_decline_battle_invite_from_cohost(
  p_invite_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Mark invite as declined
  UPDATE live_session_invites
  SET status = 'declined', responded_at = now()
  WHERE id = p_invite_id
    AND to_host_id = v_user_id
    AND type = 'battle'
    AND status = 'pending';
  
  RETURN FOUND;
END;
$$;

COMMIT;
