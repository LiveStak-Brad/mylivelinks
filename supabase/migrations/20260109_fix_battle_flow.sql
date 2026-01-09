-- =============================================================================
-- Fix Battle Flow Migration
-- =============================================================================
-- Fixes:
-- 1. Battle invites should create COHOST sessions first, not battle sessions
-- 2. Sessions should not auto-start with timers
-- 3. Battle sessions need proper initialization in battle_scores table
-- =============================================================================

BEGIN;

-- =============================================================================
-- Fix rpc_respond_to_invite to create cohost sessions for battle invites
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_respond_to_invite(
  p_invite_id UUID,
  p_response TEXT
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF p_response NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Invalid response: must be accepted or declined';
  END IF;
  
  -- Fetch the invite
  SELECT * INTO v_invite
  FROM live_session_invites
  WHERE id = p_invite_id
    AND to_host_id = v_user_id
    AND status = 'pending'
  FOR UPDATE;
  
  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found or already responded';
  END IF;
  
  IF p_response = 'declined' THEN
    -- Simply mark as declined
    UPDATE live_session_invites
    SET status = 'declined', responded_at = now()
    WHERE id = p_invite_id;
    
    RETURN jsonb_build_object('status', 'declined', 'invite_id', p_invite_id);
  END IF;
  
  -- ACCEPTED: Create a COHOST session (not battle, even if invite was for battle)
  -- Battle will be started later via "Start Battle" button
  INSERT INTO live_sessions (type, mode, host_a, host_b, status, started_at, ends_at)
  VALUES (
    'cohost',  -- Always start as cohost
    v_invite.mode,
    v_invite.from_host_id,
    v_invite.to_host_id,
    'active',
    now(),
    NULL  -- No timer for cohost sessions
  )
  RETURNING id INTO v_session_id;
  
  -- Update the invite
  UPDATE live_session_invites
  SET status = 'accepted', responded_at = now(), session_id = v_session_id
  WHERE id = p_invite_id;
  
  RETURN jsonb_build_object(
    'status', 'accepted',
    'invite_id', p_invite_id,
    'session_id', v_session_id,
    'type', 'cohost',  -- Return cohost type
    'mode', v_invite.mode,
    'original_invite_type', v_invite.type  -- Track what they originally wanted
  );
END;
$$;

-- =============================================================================
-- Create RPC to convert cohost session to battle
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_start_battle_from_cohost(
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_session live_sessions%ROWTYPE;
  v_battle_duration INTERVAL;
  v_other_host_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Fetch the session
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
  
  -- Determine battle duration based on mode
  IF v_session.mode = 'speed' THEN
    v_battle_duration := INTERVAL '60 seconds';
  ELSE
    v_battle_duration := INTERVAL '180 seconds';
  END IF;
  
  -- Convert session to battle
  UPDATE live_sessions
  SET 
    type = 'battle',
    started_at = now(),
    ends_at = now() + v_battle_duration
  WHERE id = p_session_id;
  
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
    p_session_id,
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
  
  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'type', 'battle',
    'started_at', now(),
    'ends_at', now() + v_battle_duration
  );
END;
$$;

-- =============================================================================
-- Fix rpc_end_session to handle cooldown properly
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_end_session(
  p_session_id UUID,
  p_action TEXT DEFAULT 'cooldown'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_session live_sessions%ROWTYPE;
  v_cooldown_duration INTERVAL;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF p_action NOT IN ('end', 'cooldown') THEN
    RAISE EXCEPTION 'Invalid action: must be end or cooldown';
  END IF;
  
  -- Fetch the session
  SELECT * INTO v_session
  FROM live_sessions
  WHERE id = p_session_id
    AND (host_a = v_user_id OR host_b = v_user_id)
  FOR UPDATE;
  
  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Session not found or unauthorized';
  END IF;
  
  IF p_action = 'end' THEN
    -- Completely end the session
    UPDATE live_sessions
    SET status = 'ended', ends_at = now()
    WHERE id = p_session_id;
    
    RETURN TRUE;
  END IF;
  
  -- Transition to cooldown
  IF v_session.mode = 'speed' THEN
    v_cooldown_duration := INTERVAL '15 seconds';
  ELSE
    v_cooldown_duration := INTERVAL '30 seconds';
  END IF;
  
  UPDATE live_sessions
  SET 
    status = 'cooldown',
    cooldown_ends_at = now() + v_cooldown_duration
  WHERE id = p_session_id;
  
  RETURN TRUE;
END;
$$;

-- =============================================================================
-- Create RPC to convert battle back to cohost (Stay Paired)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_battle_to_cohost(
  p_session_id UUID
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
  
  -- Convert battle session back to cohost
  UPDATE live_sessions
  SET 
    type = 'cohost',
    status = 'active',
    ends_at = NULL,
    cooldown_ends_at = NULL
  WHERE id = p_session_id
    AND (host_a = v_user_id OR host_b = v_user_id)
    AND type = 'battle'
    AND status = 'cooldown';
  
  RETURN FOUND;
END;
$$;

COMMIT;
