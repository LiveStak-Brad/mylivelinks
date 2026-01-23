-- =============================================================================
-- 20260123_multi_host_grid_support.sql
-- =============================================================================
-- Enables 3-12 participant support for cohost/battle sessions
-- =============================================================================

-- =============================================================================
-- 1. Update team constraint to allow 12 teams (A-L)
-- =============================================================================

ALTER TABLE public.live_session_participants DROP CONSTRAINT IF EXISTS live_session_participants_team_check;
ALTER TABLE public.live_session_participants ADD CONSTRAINT live_session_participants_team_check 
  CHECK (team IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'));

-- =============================================================================
-- 2. Add index for faster participant queries
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_live_session_participants_session_active 
  ON live_session_participants(session_id, left_at) 
  WHERE left_at IS NULL;

-- =============================================================================
-- 3. Update rpc_send_invite to support adding to existing sessions (3rd+ person)
-- =============================================================================

DROP FUNCTION IF EXISTS public.rpc_send_invite(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.rpc_send_invite(UUID, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.rpc_send_invite(
  p_to_host_id UUID,
  p_type TEXT,
  p_mode TEXT DEFAULT 'standard',
  p_session_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_invite_id UUID;
  v_current_session_id UUID;
  v_active_count INT;
  v_pending_count INT;
  v_available INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF v_user_id = p_to_host_id THEN
    RAISE EXCEPTION 'Cannot invite yourself';
  END IF;
  
  -- Delete any existing pending invites FROM this user TO this target
  DELETE FROM live_session_invites
  WHERE from_host_id = v_user_id
    AND to_host_id = p_to_host_id
    AND status = 'pending';
  
  -- If sender is already in a session, use that session_id
  IF p_session_id IS NULL THEN
    SELECT ls.id INTO v_current_session_id
    FROM live_sessions ls
    JOIN live_session_participants lsp ON lsp.session_id = ls.id
    WHERE lsp.profile_id = v_user_id
      AND lsp.left_at IS NULL
      AND ls.status IN ('active', 'cooldown', 'battle_ready', 'battle_active')
    LIMIT 1;
    
    p_session_id := v_current_session_id;
  END IF;
  
  -- If we have a session, check capacity
  IF p_session_id IS NOT NULL THEN
    -- Count active participants
    SELECT COUNT(*) INTO v_active_count
    FROM live_session_participants
    WHERE session_id = p_session_id AND left_at IS NULL;
    
    -- Count pending invites for this session
    SELECT COUNT(*) INTO v_pending_count
    FROM live_session_invites
    WHERE session_id = p_session_id AND status = 'pending';
    
    v_available := 12 - v_active_count - v_pending_count;
    
    IF v_available <= 0 THEN
      RAISE EXCEPTION 'Session is at capacity (active: %, pending: %)', v_active_count, v_pending_count;
    END IF;
    
    -- Check if target is already in session
    IF EXISTS (
      SELECT 1 FROM live_session_participants
      WHERE session_id = p_session_id AND profile_id = p_to_host_id AND left_at IS NULL
    ) THEN
      RAISE EXCEPTION 'User is already in this session';
    END IF;
  END IF;
  
  -- Create the invite
  INSERT INTO live_session_invites (from_host_id, to_host_id, type, mode, status, session_id)
  VALUES (v_user_id, p_to_host_id, p_type, COALESCE(p_mode, 'standard'), 'pending', p_session_id)
  RETURNING id INTO v_invite_id;
  
  RETURN v_invite_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_send_invite(UUID, TEXT, TEXT, UUID) TO authenticated;

-- =============================================================================
-- 4. Update rpc_respond_to_invite to handle slot finding and rejoin
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
  v_battle_duration INTERVAL;
  v_next_slot INT;
  v_participant_count INT;
  v_existing_row live_session_participants%ROWTYPE;
  v_occupied_slots INT[];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Fetch the invite (be permissive - allow already responded invites)
  SELECT * INTO v_invite
  FROM live_session_invites
  WHERE id = p_invite_id
    AND to_host_id = v_user_id
  FOR UPDATE;
  
  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
  
  -- Delete the invite immediately (cleanup)
  DELETE FROM live_session_invites WHERE id = p_invite_id;
  
  IF p_response = 'declined' THEN
    RETURN jsonb_build_object('status', 'declined', 'invite_id', p_invite_id);
  END IF;
  
  -- ACCEPTED
  IF v_invite.session_id IS NOT NULL THEN
    -- Adding to existing session
    v_session_id := v_invite.session_id;
    
    -- Check capacity (max 12)
    SELECT COUNT(*) INTO v_participant_count
    FROM live_session_participants
    WHERE session_id = v_session_id AND left_at IS NULL;
    
    IF v_participant_count >= 12 THEN
      RETURN jsonb_build_object(
        'status', 'session_full',
        'session_id', v_session_id,
        'message', 'Session is full (max 12 participants)'
      );
    END IF;
    
    -- Check if user has existing row in this session
    SELECT * INTO v_existing_row
    FROM live_session_participants
    WHERE session_id = v_session_id AND profile_id = v_user_id;
    
    IF v_existing_row.id IS NOT NULL THEN
      IF v_existing_row.left_at IS NULL THEN
        -- Already active in session
        RETURN jsonb_build_object(
          'status', 'already_in_session',
          'session_id', v_session_id,
          'type', v_invite.type,
          'mode', v_invite.mode
        );
      ELSE
        -- Rejoin: find a free slot that's not occupied by active participants
        SELECT ARRAY_AGG(slot_index) INTO v_occupied_slots
        FROM live_session_participants
        WHERE session_id = v_session_id AND left_at IS NULL;
        
        -- Find first free slot from 0-11
        SELECT MIN(s.slot) INTO v_next_slot
        FROM generate_series(0, 11) AS s(slot)
        WHERE s.slot != ALL(COALESCE(v_occupied_slots, ARRAY[]::INT[]));
        
        IF v_next_slot IS NULL THEN
          RETURN jsonb_build_object('status', 'session_full', 'message', 'No free slots');
        END IF;
        
        -- Update existing row with new slot, clear left_at
        UPDATE live_session_participants
        SET left_at = NULL, slot_index = v_next_slot, joined_at = now()
        WHERE id = v_existing_row.id;
      END IF;
    ELSE
      -- New participant: find a free slot
      SELECT ARRAY_AGG(slot_index) INTO v_occupied_slots
      FROM live_session_participants
      WHERE session_id = v_session_id AND left_at IS NULL;
      
      SELECT MIN(s.slot) INTO v_next_slot
      FROM generate_series(0, 11) AS s(slot)
      WHERE s.slot != ALL(COALESCE(v_occupied_slots, ARRAY[]::INT[]));
      
      IF v_next_slot IS NULL THEN
        RETURN jsonb_build_object('status', 'session_full', 'message', 'No free slots');
      END IF;
      
      -- Insert new participant (team defaults to 'A', will be assigned on battle start)
      INSERT INTO live_session_participants (session_id, profile_id, team, slot_index)
      VALUES (v_session_id, v_user_id, 'A', v_next_slot);
    END IF;
    
  ELSE
    -- Creating new session
    IF v_invite.mode = 'speed' THEN
      v_battle_duration := INTERVAL '60 seconds';
    ELSE
      v_battle_duration := INTERVAL '180 seconds';
    END IF;
    
    -- Create session
    INSERT INTO live_sessions (type, mode, host_a, host_b, status, started_at, ends_at)
    VALUES (
      'cohost',
      COALESCE(v_invite.mode, 'standard'),
      v_invite.from_host_id,
      v_user_id,
      'active',
      now(),
      NULL
    )
    RETURNING id INTO v_session_id;
    
    -- Add both participants with slots 0 and 1
    INSERT INTO live_session_participants (session_id, profile_id, team, slot_index)
    VALUES 
      (v_session_id, v_invite.from_host_id, 'A', 0),
      (v_session_id, v_user_id, 'A', 1);
  END IF;
  
  -- Get final participant count
  SELECT COUNT(*) INTO v_participant_count
  FROM live_session_participants
  WHERE session_id = v_session_id AND left_at IS NULL;
  
  RETURN jsonb_build_object(
    'status', 'accepted',
    'invite_id', p_invite_id,
    'session_id', v_session_id,
    'type', v_invite.type,
    'mode', v_invite.mode,
    'participant_count', v_participant_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_respond_to_invite(UUID, TEXT) TO authenticated;

-- =============================================================================
-- 5. Update rpc_start_battle_ready to handle 3+ participants
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_start_battle_ready(
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
  v_ready_states JSONB := '{}'::jsonb;
  v_participant RECORD;
  v_participant_count INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Verify session exists and is active cohost
  SELECT * INTO v_session
  FROM live_sessions
  WHERE id = p_session_id
    AND status = 'active'
    AND type = 'cohost'
  FOR UPDATE;
  
  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Session not found or not in active cohost state';
  END IF;
  
  -- Verify user is a participant
  IF NOT EXISTS (
    SELECT 1 FROM live_session_participants
    WHERE session_id = p_session_id AND profile_id = v_user_id AND left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'You are not in this session';
  END IF;
  
  -- Build ready states for all participants (all start as false/red)
  FOR v_participant IN
    SELECT profile_id, slot_index FROM live_session_participants
    WHERE session_id = p_session_id AND left_at IS NULL
    ORDER BY slot_index
  LOOP
    v_ready_states := v_ready_states || jsonb_build_object(v_participant.profile_id::text, false);
    v_participant_count := v_participant_count + 1;
  END LOOP;
  
  IF v_participant_count < 2 THEN
    RAISE EXCEPTION 'Need at least 2 participants to start battle';
  END IF;
  
  -- Update session to battle_ready
  UPDATE live_sessions
  SET status = 'battle_ready', type = 'battle'
  WHERE id = p_session_id;
  
  -- Assign teams based on participant count
  IF v_participant_count = 2 THEN
    -- 1v1: slot 0 = A, slot 1 = B
    UPDATE live_session_participants SET team = 'A' WHERE session_id = p_session_id AND slot_index = 0;
    UPDATE live_session_participants SET team = 'B' WHERE session_id = p_session_id AND slot_index = 1;
  ELSE
    -- 3+: free for all, each gets own team based on slot
    UPDATE live_session_participants
    SET team = CHR(65 + slot_index)
    WHERE session_id = p_session_id AND left_at IS NULL;
  END IF;
  
  -- Store ready states in battle_scores
  INSERT INTO battle_scores (session_id, points_a, points_b, supporter_stats, participant_states)
  VALUES (p_session_id, 0, 0, '{"supporters": []}'::jsonb, jsonb_build_object('ready', v_ready_states))
  ON CONFLICT (session_id) DO UPDATE SET
    points_a = 0,
    points_b = 0,
    supporter_stats = '{"supporters": []}'::jsonb,
    participant_states = jsonb_build_object('ready', v_ready_states);
  
  RETURN jsonb_build_object(
    'status', 'battle_ready',
    'session_id', p_session_id,
    'participant_count', v_participant_count,
    'ready_states', v_ready_states
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_start_battle_ready(UUID) TO authenticated;

-- =============================================================================
-- 6. Update rpc_get_active_session_for_host to always return participants array
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_active_session_for_host(
  p_host_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session live_sessions%ROWTYPE;
  v_participants JSONB;
  v_host_a_profile profiles%ROWTYPE;
  v_host_b_profile profiles%ROWTYPE;
  v_ready_states JSONB;
BEGIN
  -- Find active session for this host via participants table
  SELECT ls.* INTO v_session
  FROM live_sessions ls
  JOIN live_session_participants lsp ON lsp.session_id = ls.id
  WHERE lsp.profile_id = p_host_id
    AND lsp.left_at IS NULL
    AND ls.status IN ('active', 'battle_ready', 'battle_active', 'cooldown')
  ORDER BY ls.created_at DESC
  LIMIT 1;
  
  IF v_session IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get all participants
  SELECT jsonb_agg(
    jsonb_build_object(
      'profile_id', lsp.profile_id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'team', lsp.team,
      'slot_index', lsp.slot_index,
      'joined_at', lsp.joined_at
    ) ORDER BY lsp.slot_index
  ) INTO v_participants
  FROM live_session_participants lsp
  JOIN profiles p ON p.id = lsp.profile_id
  WHERE lsp.session_id = v_session.id
    AND lsp.left_at IS NULL;
  
  -- Get ready states if in battle_ready
  IF v_session.status = 'battle_ready' THEN
    SELECT participant_states->'ready' INTO v_ready_states
    FROM battle_scores WHERE session_id = v_session.id;
  END IF;
  
  -- Get host profiles for backwards compatibility
  SELECT * INTO v_host_a_profile FROM profiles WHERE id = v_session.host_a;
  SELECT * INTO v_host_b_profile FROM profiles WHERE id = v_session.host_b;
  
  RETURN jsonb_build_object(
    'session_id', v_session.id,
    'type', v_session.type,
    'mode', v_session.mode,
    'status', v_session.status,
    'started_at', v_session.started_at,
    'ends_at', v_session.ends_at,
    'cooldown_ends_at', v_session.cooldown_ends_at,
    'participants', COALESCE(v_participants, '[]'::jsonb),
    'ready_states', v_ready_states,
    'host_a', CASE WHEN v_host_a_profile.id IS NOT NULL THEN
      jsonb_build_object(
        'id', v_host_a_profile.id,
        'username', v_host_a_profile.username,
        'display_name', v_host_a_profile.display_name,
        'avatar_url', v_host_a_profile.avatar_url
      )
    ELSE NULL END,
    'host_b', CASE WHEN v_host_b_profile.id IS NOT NULL THEN
      jsonb_build_object(
        'id', v_host_b_profile.id,
        'username', v_host_b_profile.username,
        'display_name', v_host_b_profile.display_name,
        'avatar_url', v_host_b_profile.avatar_url
      )
    ELSE NULL END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_active_session_for_host(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_active_session_for_host(UUID) TO anon;

-- =============================================================================
-- Verification
-- =============================================================================

SELECT 'Multi-host grid support enabled!' AS status;
