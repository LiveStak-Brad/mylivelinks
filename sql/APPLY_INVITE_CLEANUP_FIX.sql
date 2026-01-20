-- =============================================================================
-- APPLY_INVITE_CLEANUP_FIX.sql
-- =============================================================================
-- Fixes session invite cleanup issues:
-- 1. Auto-cancel pending outgoing invites when sending a new invite
-- 2. Cancel all pending invites for both hosts when ending a session
-- 3. Rematch now resets SAME session (preserves LiveKit connection)
-- =============================================================================

-- =============================================================================
-- CLEANUP: Clear stale data before applying fixes
-- =============================================================================

-- Cancel all existing pending invites (clean slate)
UPDATE live_session_invites
SET status = 'cancelled', responded_at = now()
WHERE status = 'pending';

-- End any orphaned active/cooldown sessions that are stuck
-- (sessions where cooldown_ends_at or ends_at has passed)
UPDATE live_sessions
SET status = 'ended'
WHERE status IN ('active', 'cooldown')
  AND (
    (status = 'cooldown' AND cooldown_ends_at < now() - INTERVAL '5 minutes')
    OR (status = 'active' AND ends_at < now() - INTERVAL '5 minutes')
  );

-- =============================================================================
-- RPC: rpc_send_invite (UPDATED)
-- =============================================================================
-- Creates a pending invite for battle or cohost
-- NOW: Auto-cancels any existing pending outgoing invites first
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_send_invite(
  p_to_host_id UUID,
  p_type TEXT,
  p_mode TEXT DEFAULT 'standard'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_invite_id UUID;
  v_existing_active INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF v_user_id = p_to_host_id THEN
    RAISE EXCEPTION 'Cannot invite yourself';
  END IF;
  
  IF p_type NOT IN ('battle', 'cohost') THEN
    RAISE EXCEPTION 'Invalid type: must be battle or cohost';
  END IF;
  
  IF p_mode NOT IN ('speed', 'standard') THEN
    RAISE EXCEPTION 'Invalid mode: must be speed or standard';
  END IF;
  
  -- NEW: Cancel any existing pending outgoing invites from this user
  -- This allows re-inviting different users without being blocked
  UPDATE live_session_invites
  SET status = 'cancelled', responded_at = now()
  WHERE from_host_id = v_user_id
    AND status = 'pending';
  
  -- Check if either user is already in an active session
  SELECT COUNT(*) INTO v_existing_active
  FROM live_sessions
  WHERE status IN ('active', 'cooldown')
    AND (host_a = v_user_id OR host_b = v_user_id OR host_a = p_to_host_id OR host_b = p_to_host_id);
    
  IF v_existing_active > 0 THEN
    RAISE EXCEPTION 'One or both users already in active session';
  END IF;
  
  -- Create the invite
  INSERT INTO live_session_invites (from_host_id, to_host_id, type, mode, status)
  VALUES (v_user_id, p_to_host_id, p_type, p_mode, 'pending')
  RETURNING id INTO v_invite_id;
  
  RETURN v_invite_id;
END;
$$;

-- =============================================================================
-- RPC: rpc_end_session (UPDATED)
-- =============================================================================
-- Ends a session or transitions to cooldown
-- NOW: Cancels all pending invites involving both participants
-- p_action: 'end' | 'cooldown'
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_end_session(
  p_session_id UUID,
  p_action TEXT DEFAULT 'end'
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
  
  -- Fetch the session
  SELECT * INTO v_session
  FROM live_sessions
  WHERE id = p_session_id
    AND (host_a = v_user_id OR host_b = v_user_id)
    AND status IN ('active', 'cooldown')
  FOR UPDATE;
  
  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Session not found or not authorized';
  END IF;
  
  IF p_action = 'cooldown' AND v_session.status = 'active' THEN
    -- Transition to cooldown
    IF v_session.mode = 'speed' THEN
      v_cooldown_duration := INTERVAL '15 seconds';
    ELSE
      v_cooldown_duration := INTERVAL '30 seconds';
    END IF;
    
    UPDATE live_sessions
    SET status = 'cooldown', cooldown_ends_at = now() + v_cooldown_duration
    WHERE id = p_session_id;
    
  ELSE
    -- End the session
    UPDATE live_sessions
    SET status = 'ended'
    WHERE id = p_session_id;
    
    -- NEW: Cancel all pending invites involving both hosts
    -- This ensures users become available for new invites after leaving
    UPDATE live_session_invites
    SET status = 'cancelled', responded_at = now()
    WHERE status = 'pending'
      AND (from_host_id = v_session.host_a OR from_host_id = v_session.host_b
           OR to_host_id = v_session.host_a OR to_host_id = v_session.host_b);
  END IF;
  
  RETURN TRUE;
END;
$$;

-- =============================================================================
-- RPC: rpc_start_rematch (UPDATED)
-- =============================================================================
-- Resets the SAME session instead of creating a new one
-- This keeps the same room name so LiveKit connection persists
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_start_rematch(
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
  v_battle_duration INTERVAL;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Fetch the session (must be in cooldown to rematch)
  SELECT * INTO v_session
  FROM live_sessions
  WHERE id = p_session_id
    AND (host_a = v_user_id OR host_b = v_user_id)
    AND status = 'cooldown'
  FOR UPDATE;
    
  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Session not found or not in cooldown';
  END IF;
  
  -- Determine battle duration based on mode
  IF v_session.mode = 'speed' THEN
    v_battle_duration := INTERVAL '60 seconds';
  ELSE
    v_battle_duration := INTERVAL '180 seconds';
  END IF;
  
  -- UPDATED: Reset the SAME session instead of creating a new one
  -- This preserves the session ID so room name stays the same
  -- and LiveKit connections don't need to reconnect
  UPDATE live_sessions
  SET 
    status = 'active',
    started_at = now(),
    ends_at = now() + v_battle_duration,
    cooldown_ends_at = NULL
  WHERE id = p_session_id;
  
  -- Return the SAME session ID (room stays the same)
  RETURN p_session_id;
END;
$$;

-- =============================================================================
-- FIX: Grant execute permissions on battle score functions
-- =============================================================================
-- These functions were missing GRANT statements, so authenticated users
-- couldn't call them, causing gift → battle score updates to fail silently
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.rpc_battle_score_apply(UUID, TEXT, BIGINT, battle_supporter_delta, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_battle_score_snapshot(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_battle_score_snapshot(UUID) TO anon;

-- =============================================================================
-- Verification queries (run after applying to confirm)
-- =============================================================================

-- Check that functions exist
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN ('rpc_send_invite', 'rpc_end_session', 'rpc_start_rematch', 'rpc_battle_score_apply', 'rpc_battle_score_snapshot')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
