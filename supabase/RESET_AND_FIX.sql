-- =============================================================================
-- RESET AND FIX SCRIPT
-- =============================================================================
-- Run this ONCE to ensure all functions are correct and up-to-date
-- This will replace any old/broken versions you may have applied earlier
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. ENSURE POINTS COLUMN EXISTS
-- =============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'battle_scores' AND column_name = 'points'
  ) THEN
    ALTER TABLE battle_scores ADD COLUMN points JSONB DEFAULT '{}'::jsonb;
    COMMENT ON COLUMN battle_scores.points IS 'Multi-team points: {"A": 100, "B": 50, "C": 75, ...}';
  END IF;
END $$;

-- =============================================================================
-- 1B. ENSURE REALTIME IS ENABLED FOR battle_scores
-- =============================================================================
-- Set replica identity to full so real-time gets all column values
ALTER TABLE battle_scores REPLICA IDENTITY FULL;

-- Enable realtime publication (if not already)
DO $$
BEGIN
  -- Check if publication exists for battle_scores
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'battle_scores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE battle_scores;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- Publication doesn't exist, create it
    CREATE PUBLICATION supabase_realtime FOR TABLE battle_scores;
END $$;

-- =============================================================================
-- 2. UPDATE TEAM CONSTRAINT (A-L for 12 teams)
-- =============================================================================
ALTER TABLE public.live_session_participants DROP CONSTRAINT IF EXISTS live_session_participants_team_check;
ALTER TABLE public.live_session_participants ADD CONSTRAINT live_session_participants_team_check 
  CHECK (team IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'));

-- =============================================================================
-- 2B. UPDATE rpc_send_invite to support adding to existing sessions (3rd+ person)
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
-- 2C. UPDATE rpc_respond_to_invite to handle slot finding and rejoin
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
  
  SELECT * INTO v_invite
  FROM live_session_invites
  WHERE id = p_invite_id AND to_host_id = v_user_id
  FOR UPDATE;
  
  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
  
  DELETE FROM live_session_invites WHERE id = p_invite_id;
  
  IF p_response = 'declined' THEN
    RETURN jsonb_build_object('status', 'declined', 'invite_id', p_invite_id);
  END IF;
  
  -- ACCEPTED
  IF v_invite.session_id IS NOT NULL THEN
    v_session_id := v_invite.session_id;
    
    SELECT COUNT(*) INTO v_participant_count
    FROM live_session_participants
    WHERE session_id = v_session_id AND left_at IS NULL;
    
    IF v_participant_count >= 12 THEN
      RETURN jsonb_build_object('status', 'session_full', 'session_id', v_session_id, 'message', 'Session is full');
    END IF;
    
    SELECT * INTO v_existing_row
    FROM live_session_participants
    WHERE session_id = v_session_id AND profile_id = v_user_id;
    
    IF v_existing_row.id IS NOT NULL THEN
      IF v_existing_row.left_at IS NULL THEN
        RETURN jsonb_build_object('status', 'already_in_session', 'session_id', v_session_id);
      ELSE
        -- Rejoin: find a free slot
        SELECT ARRAY_AGG(slot_index) INTO v_occupied_slots
        FROM live_session_participants WHERE session_id = v_session_id AND left_at IS NULL;
        
        SELECT MIN(s.slot) INTO v_next_slot FROM generate_series(0, 11) AS s(slot)
        WHERE s.slot != ALL(COALESCE(v_occupied_slots, ARRAY[]::INT[]));
        
        IF v_next_slot IS NULL THEN
          RETURN jsonb_build_object('status', 'session_full', 'message', 'No free slots');
        END IF;
        
        UPDATE live_session_participants
        SET left_at = NULL, slot_index = v_next_slot, joined_at = now()
        WHERE id = v_existing_row.id;
      END IF;
    ELSE
      -- New participant: find a free slot
      SELECT ARRAY_AGG(slot_index) INTO v_occupied_slots
      FROM live_session_participants WHERE session_id = v_session_id AND left_at IS NULL;
      
      SELECT MIN(s.slot) INTO v_next_slot FROM generate_series(0, 11) AS s(slot)
      WHERE s.slot != ALL(COALESCE(v_occupied_slots, ARRAY[]::INT[]));
      
      IF v_next_slot IS NULL THEN
        RETURN jsonb_build_object('status', 'session_full', 'message', 'No free slots');
      END IF;
      
      INSERT INTO live_session_participants (session_id, profile_id, team, slot_index)
      VALUES (v_session_id, v_user_id, 'A', v_next_slot);
    END IF;
  ELSE
    -- Creating new session
    INSERT INTO live_sessions (type, mode, host_a, host_b, status, started_at)
    VALUES ('cohost', COALESCE(v_invite.mode, 'standard'), v_invite.from_host_id, v_user_id, 'active', now())
    RETURNING id INTO v_session_id;
    
    INSERT INTO live_session_participants (session_id, profile_id, team, slot_index)
    VALUES 
      (v_session_id, v_invite.from_host_id, 'A', 0),
      (v_session_id, v_user_id, 'A', 1);
  END IF;
  
  SELECT COUNT(*) INTO v_participant_count
  FROM live_session_participants WHERE session_id = v_session_id AND left_at IS NULL;
  
  RETURN jsonb_build_object(
    'status', 'accepted',
    'session_id', v_session_id,
    'participant_count', v_participant_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_respond_to_invite(UUID, TEXT) TO authenticated;

-- =============================================================================
-- 2D. UPDATE rpc_start_battle_ready to handle 3+ participants
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
  
  SELECT * INTO v_session FROM live_sessions
  WHERE id = p_session_id AND status = 'active' AND type = 'cohost'
  FOR UPDATE;
  
  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Session not found or not in active cohost state';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM live_session_participants
    WHERE session_id = p_session_id AND profile_id = v_user_id AND left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'You are not in this session';
  END IF;
  
  -- Build ready states for all participants
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
  
  UPDATE live_sessions SET status = 'battle_ready', type = 'battle' WHERE id = p_session_id;
  
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
  
  INSERT INTO battle_scores (session_id, points_a, points_b, points, supporter_stats, participant_states)
  VALUES (p_session_id, 0, 0, '{}'::jsonb, '{"supporters": []}'::jsonb, jsonb_build_object('ready', v_ready_states))
  ON CONFLICT (session_id) DO UPDATE SET
    points_a = 0,
    points_b = 0,
    points = '{}'::jsonb,
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
-- 3. FIX rpc_battle_score_apply (TEAMS A-L)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.rpc_battle_score_apply(
  p_session_id UUID,
  p_side TEXT,
  p_points_delta BIGINT,
  p_supporter battle_supporter_delta DEFAULT NULL,
  p_participant_states JSONB DEFAULT NULL,
  p_boost JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_side TEXT;
  v_row battle_scores%ROWTYPE;
  v_supporters JSONB;
  v_supporter_array JSONB;
  v_existing JSONB;
  v_updated JSONB;
  v_current_points JSONB;
  v_new_total BIGINT;
BEGIN
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'session_id required';
  END IF;

  v_side := upper(trim(p_side));
  -- Allow teams A through L (12 teams max)
  IF v_side !~ '^[A-L]$' THEN
    RAISE EXCEPTION 'Invalid side %. Must be A-L', p_side;
  END IF;

  -- Upsert base row
  INSERT INTO battle_scores (session_id, points_a, points_b, supporter_stats, participant_states)
  VALUES (
    p_session_id,
    CASE WHEN v_side = 'A' THEN GREATEST(0, p_points_delta) ELSE 0 END,
    CASE WHEN v_side = 'B' THEN GREATEST(0, p_points_delta) ELSE 0 END,
    '{"supporters": []}'::jsonb,
    COALESCE(p_participant_states, '{}'::jsonb)
  )
  ON CONFLICT (session_id) DO NOTHING;

  -- Fetch current row for update
  SELECT * INTO v_row FROM battle_scores WHERE session_id = p_session_id FOR UPDATE;
  
  -- Get current points structure (handles both old points_a/points_b and new multi-team)
  v_current_points := COALESCE(v_row.points, jsonb_build_object('A', v_row.points_a, 'B', v_row.points_b));
  
  -- Apply points delta to the specific team
  v_new_total := COALESCE((v_current_points->>v_side)::bigint, 0) + p_points_delta;
  v_current_points := v_current_points || jsonb_build_object(v_side, GREATEST(0, v_new_total));

  -- Update legacy points_a/points_b for backwards compatibility
  UPDATE battle_scores
  SET 
    points = v_current_points,
    points_a = COALESCE((v_current_points->>'A')::bigint, points_a),
    points_b = COALESCE((v_current_points->>'B')::bigint, points_b),
    boost_active = COALESCE((p_boost->>'active')::boolean, boost_active),
    boost_multiplier = COALESCE((p_boost->>'multiplier')::numeric, boost_multiplier),
    participant_states = COALESCE(p_participant_states, participant_states)
  WHERE session_id = p_session_id;

  -- Handle supporter tracking if provided
  IF p_supporter IS NOT NULL THEN
    SELECT supporter_stats INTO v_supporters FROM battle_scores WHERE session_id = p_session_id;
    v_supporter_array := COALESCE(v_supporters->'supporters', '[]'::jsonb);
    
    -- Find existing supporter entry
    v_existing := NULL;
    FOR v_updated IN SELECT * FROM jsonb_array_elements(v_supporter_array)
    LOOP
      IF (v_updated->>'profile_id') = (p_supporter).profile_id::text THEN
        v_existing := v_updated;
        EXIT;
      END IF;
    END LOOP;
    
    -- Update or insert supporter
    IF v_existing IS NOT NULL THEN
      v_updated := v_existing || jsonb_build_object(
        'points_contributed', COALESCE((v_existing->>'points_contributed')::bigint, 0) + p_points_delta
      );
      v_supporter_array := (
        SELECT jsonb_agg(
          CASE 
            WHEN (elem->>'profile_id') = (p_supporter).profile_id::text THEN v_updated
            ELSE elem
          END
        )
        FROM jsonb_array_elements(v_supporter_array) elem
      );
    ELSE
      v_supporter_array := v_supporter_array || jsonb_build_array(
        jsonb_build_object(
          'profile_id', (p_supporter).profile_id,
          'username', (p_supporter).username,
          'display_name', (p_supporter).display_name,
          'avatar_url', (p_supporter).avatar_url,
          'side', v_side,
          'points_contributed', p_points_delta,
          'chat_messages_sent', 0
        )
      );
    END IF;
    
    UPDATE battle_scores
    SET supporter_stats = jsonb_build_object('supporters', v_supporter_array)
    WHERE session_id = p_session_id;
  END IF;

  -- Return updated scores
  SELECT points INTO v_current_points FROM battle_scores WHERE session_id = p_session_id;
  
  RETURN jsonb_build_object(
    'session_id', p_session_id,
    'points', v_current_points,
    'points_a', COALESCE((v_current_points->>'A')::bigint, 0),
    'points_b', COALESCE((v_current_points->>'B')::bigint, 0)
  );
END;
$$;

-- =============================================================================
-- 4. FIX rpc_battle_score_snapshot (RETURN MULTI-TEAM POINTS)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.rpc_battle_score_snapshot(
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row battle_scores%ROWTYPE;
  v_points JSONB;
BEGIN
  SELECT * INTO v_row
  FROM public.battle_scores
  WHERE session_id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'session_id', p_session_id,
      'points', jsonb_build_object('A', 0, 'B', 0),
      'supporters', jsonb_build_array(),
      'participantStates', jsonb_build_object(),
      'boost', jsonb_build_object(
        'active', FALSE,
        'multiplier', 1,
        'started_at', NULL,
        'ends_at', NULL
      )
    );
  END IF;

  -- Use the new points JSONB column if it exists, otherwise fall back to points_a/points_b
  v_points := COALESCE(
    v_row.points,
    jsonb_build_object('A', v_row.points_a, 'B', v_row.points_b)
  );

  RETURN jsonb_build_object(
    'session_id', v_row.session_id,
    'points', v_points,
    'supporters', COALESCE(v_row.supporter_stats -> 'supporters', jsonb_build_array()),
    'participantStates', v_row.participant_states,
    'boost', jsonb_build_object(
      'active', v_row.boost_active,
      'multiplier', v_row.boost_multiplier,
      'started_at', v_row.boost_started_at,
      'ends_at', v_row.boost_ends_at
    )
  );
END;
$$;

-- =============================================================================
-- 5. CREATE rpc_cooldown_to_cohost (CONVERT BACK TO COHOST)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.rpc_cooldown_to_cohost(
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Fetch the session and verify user is a participant
  SELECT ls.* INTO v_session
  FROM live_sessions ls
  JOIN live_session_participants lsp ON lsp.session_id = ls.id
  WHERE ls.id = p_session_id
    AND lsp.profile_id = v_user_id
    AND lsp.left_at IS NULL
    AND ls.status = 'cooldown'
    AND ls.type = 'battle'
  FOR UPDATE;
  
  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Session not found, not in cooldown, or you are not a participant';
  END IF;
  
  -- Convert battle back to cohost
  UPDATE live_sessions
  SET 
    type = 'cohost',
    status = 'active',
    ends_at = NULL,
    cooldown_ends_at = NULL
  WHERE id = p_session_id;
  
  -- Reset all participants back to team A (cohost doesn't use team divisions)
  UPDATE live_session_participants
  SET team = 'A'
  WHERE session_id = p_session_id AND left_at IS NULL;
  
  RETURN jsonb_build_object(
    'status', 'success',
    'session_id', p_session_id,
    'new_type', 'cohost',
    'new_status', 'active'
  );
END;
$$;

-- =============================================================================
-- 6. FIX rpc_end_session (SUPPORT 3+ PARTICIPANTS)
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
  
  -- Fetch the session and verify user is a participant (supports 3+ participants)
  SELECT ls.* INTO v_session
  FROM live_sessions ls
  JOIN live_session_participants lsp ON lsp.session_id = ls.id
  WHERE ls.id = p_session_id
    AND lsp.profile_id = v_user_id
    AND lsp.left_at IS NULL
  FOR UPDATE;
  
  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Session not found or unauthorized';
  END IF;
  
  IF p_action = 'end' THEN
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
  SET status = 'cooldown', cooldown_ends_at = now() + v_cooldown_duration
  WHERE id = p_session_id;
  
  RETURN TRUE;
END;
$$;

COMMIT;

-- Success message
SELECT 'All battle functions updated successfully!' AS status;
SELECT 'Now test: 1) Send gift during battle, 2) Let battle end naturally, 3) Check cooldown converts to cohost' AS next_steps;
