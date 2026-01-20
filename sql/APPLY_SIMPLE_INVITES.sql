-- =============================================================================
-- APPLY_SIMPLE_INVITES.sql
-- =============================================================================
-- Simplified invite system - just let people connect!
-- - Invites are DELETED after accept/decline (not just marked)
-- - Fewer restrictions on sending invites
-- - Auto-cleanup of stale invites
-- =============================================================================

-- =============================================================================
-- 1. Cleanup all stale invites first (clean slate)
-- =============================================================================

-- Delete all pending invites older than 5 minutes
DELETE FROM live_session_invites 
WHERE status = 'pending' 
  AND created_at < now() - INTERVAL '5 minutes';

-- Delete all processed invites older than 1 hour (they're just clutter)
DELETE FROM live_session_invites 
WHERE status IN ('accepted', 'declined', 'cancelled')
  AND created_at < now() - INTERVAL '1 hour';

-- =============================================================================
-- 2. Simplified rpc_send_invite - just send it!
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF v_user_id = p_to_host_id THEN
    RAISE EXCEPTION 'Cannot invite yourself';
  END IF;
  
  -- Delete any existing pending invites FROM this user TO this target
  -- (allows re-inviting without issues)
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
      AND ls.status IN ('active', 'cooldown')
    LIMIT 1;
    
    p_session_id := v_current_session_id;
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
-- 3. Simplified rpc_respond_to_invite - accept or decline, delete after
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Fetch the invite (don't require pending status - be permissive)
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
    
    -- Check if already in session
    SELECT COUNT(*) INTO v_participant_count
    FROM live_session_participants
    WHERE session_id = v_session_id
      AND profile_id = v_user_id
      AND left_at IS NULL;
    
    IF v_participant_count > 0 THEN
      -- Already in session, just return success
      RETURN jsonb_build_object(
        'status', 'already_in_session',
        'session_id', v_session_id,
        'type', v_invite.type,
        'mode', v_invite.mode
      );
    END IF;
    
    -- Get next slot index
    SELECT COALESCE(MAX(slot_index), -1) + 1 INTO v_next_slot
    FROM live_session_participants
    WHERE session_id = v_session_id AND left_at IS NULL;
    
    -- Add participant
    INSERT INTO live_session_participants (session_id, profile_id, team, slot_index)
    VALUES (
      v_session_id,
      v_user_id,
      CHR(65 + v_next_slot), -- A, B, C, D...
      v_next_slot
    )
    ON CONFLICT (session_id, profile_id) DO UPDATE SET left_at = NULL, slot_index = v_next_slot;
    
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
      'cohost', -- Always start as cohost, they can start battle after
      COALESCE(v_invite.mode, 'standard'),
      v_invite.from_host_id,
      v_user_id,
      'active',
      now(),
      NULL
    )
    RETURNING id INTO v_session_id;
    
    -- Add both participants
    INSERT INTO live_session_participants (session_id, profile_id, team, slot_index)
    VALUES 
      (v_session_id, v_invite.from_host_id, 'A', 0),
      (v_session_id, v_user_id, 'B', 1);
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

-- =============================================================================
-- 4. Simplified battle accept - just accept it!
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
  v_pending_count INT;
  v_participant_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Fetch the invite (be permissive - just check it exists and is for this user)
  SELECT * INTO v_invite
  FROM live_session_invites
  WHERE id = p_invite_id
    AND to_host_id = v_user_id
    AND type = 'battle'
  FOR UPDATE;
  
  IF v_invite IS NULL THEN
    -- Maybe already processed? Just return success
    RETURN jsonb_build_object('status', 'already_processed', 'invite_id', p_invite_id);
  END IF;
  
  v_session_id := v_invite.session_id;
  
  -- Delete this invite (cleanup)
  DELETE FROM live_session_invites WHERE id = p_invite_id;
  
  -- Check if there are still other pending battle invites for this session
  SELECT COUNT(*) INTO v_pending_count
  FROM live_session_invites
  WHERE session_id = v_session_id
    AND type = 'battle'
    AND status = 'pending';
  
  -- If all have accepted (or this was the last one), start the battle
  IF v_pending_count = 0 THEN
    -- Delete any remaining battle invites for this session
    DELETE FROM live_session_invites
    WHERE session_id = v_session_id AND type = 'battle';
    
    -- Determine battle duration
    IF v_invite.mode = 'speed' THEN
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
    WHERE id = v_session_id;
    
    -- Get participant count and assign teams
    SELECT COUNT(*) INTO v_participant_count
    FROM live_session_participants
    WHERE session_id = v_session_id AND left_at IS NULL;
    
    -- Assign teams: 2 people = A vs B, 3+ = each gets own team
    IF v_participant_count <= 2 THEN
      UPDATE live_session_participants
      SET team = CASE WHEN slot_index = 0 THEN 'A' ELSE 'B' END
      WHERE session_id = v_session_id AND left_at IS NULL;
    ELSE
      UPDATE live_session_participants
      SET team = CHR(65 + slot_index)
      WHERE session_id = v_session_id AND left_at IS NULL;
    END IF;
    
    -- Initialize battle scores
    INSERT INTO battle_scores (session_id, points_a, points_b, supporter_stats, participant_states, boost_active, boost_multiplier)
    VALUES (v_session_id, 0, 0, '{"supporters": []}'::jsonb, '{}'::jsonb, false, 1)
    ON CONFLICT (session_id) DO UPDATE SET
      points_a = 0,
      points_b = 0,
      supporter_stats = '{"supporters": []}'::jsonb;
    
    RETURN jsonb_build_object(
      'status', 'battle_started',
      'invite_id', p_invite_id,
      'session_id', v_session_id,
      'type', 'battle',
      'started_at', now(),
      'ends_at', now() + v_battle_duration
    );
  ELSE
    -- Still waiting for others
    RETURN jsonb_build_object(
      'status', 'accepted_waiting',
      'invite_id', p_invite_id,
      'session_id', v_session_id,
      'pending_count', v_pending_count
    );
  END IF;
END;
$$;

-- =============================================================================
-- 5. Cleanup function - call this on session end, stream end, etc.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_cleanup_invites()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  -- Delete old pending invites (older than 5 minutes)
  DELETE FROM live_session_invites 
  WHERE status = 'pending' 
    AND created_at < now() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  -- Delete old processed invites (older than 1 hour)
  DELETE FROM live_session_invites 
  WHERE status IN ('accepted', 'declined', 'cancelled')
    AND created_at < now() - INTERVAL '1 hour';
  
  -- Delete invites for ended sessions
  DELETE FROM live_session_invites
  WHERE session_id IN (
    SELECT id FROM live_sessions WHERE status = 'ended'
  );
  
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_cleanup_invites() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cleanup_invites() TO anon;

-- =============================================================================
-- 6. Updated send battle invite - simpler version
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
  v_other_host RECORD;
  v_invite_id UUID;
  v_first_invite_id UUID := NULL;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Fetch session (be permissive - just check it exists and is active)
  SELECT * INTO v_session
  FROM live_sessions
  WHERE id = p_session_id
    AND status = 'active'
  FOR UPDATE;
  
  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Session not found or not active';
  END IF;
  
  -- Delete any existing pending battle invites for this session
  DELETE FROM live_session_invites
  WHERE session_id = p_session_id
    AND type = 'battle';
  
  -- Send battle invite to ALL other participants
  FOR v_other_host IN
    SELECT profile_id
    FROM live_session_participants
    WHERE session_id = p_session_id
      AND profile_id != v_user_id
      AND left_at IS NULL
  LOOP
    INSERT INTO live_session_invites (from_host_id, to_host_id, type, mode, status, session_id)
    VALUES (v_user_id, v_other_host.profile_id, 'battle', v_session.mode, 'pending', p_session_id)
    RETURNING id INTO v_invite_id;
    
    IF v_first_invite_id IS NULL THEN
      v_first_invite_id := v_invite_id;
    END IF;
  END LOOP;
  
  IF v_first_invite_id IS NULL THEN
    RAISE EXCEPTION 'No other participants to invite';
  END IF;
  
  RETURN v_first_invite_id;
END;
$$;

-- =============================================================================
-- Run cleanup now
-- =============================================================================

SELECT public.rpc_cleanup_invites();

-- =============================================================================
-- Verification
-- =============================================================================

SELECT 'Simple invites applied!' AS status;
SELECT COUNT(*) AS remaining_invites FROM live_session_invites;
