-- Call Signaling Schema for 1:1 Voice/Video Calls
-- Phase 1: In-app signaling only (no push notifications)

-- Call status enum
DO $$ BEGIN
  CREATE TYPE call_status AS ENUM (
    'ringing',     -- Caller initiated, waiting for callee response
    'accepted',    -- Callee accepted, both should join RTC
    'declined',    -- Callee declined
    'missed',      -- Callee didn't respond within timeout
    'busy',        -- Callee is already in another call
    'ended',       -- Call ended normally
    'failed'       -- Technical failure
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Call type enum
DO $$ BEGIN
  CREATE TYPE call_type AS ENUM ('voice', 'video');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Main calls table
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Participants
  caller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Call metadata
  call_type call_type NOT NULL DEFAULT 'video',
  status call_status NOT NULL DEFAULT 'ringing',
  
  -- LiveKit room name (format: call_<uuid>)
  room_name TEXT NOT NULL UNIQUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,        -- When callee accepted
  ended_at TIMESTAMPTZ,           -- When call ended
  
  -- Who ended the call (for analytics)
  ended_by UUID REFERENCES profiles(id),
  end_reason TEXT,                -- 'hangup', 'timeout', 'error', etc.
  
  -- Prevent self-calls
  CONSTRAINT no_self_calls CHECK (caller_id != callee_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_calls_caller_id ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_callee_id ON calls(callee_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status) WHERE status IN ('ringing', 'accepted');
CREATE INDEX IF NOT EXISTS idx_calls_room_name ON calls(room_name);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);

-- Composite index for finding active calls for a user
CREATE INDEX IF NOT EXISTS idx_calls_active_user ON calls(caller_id, callee_id, status) 
  WHERE status IN ('ringing', 'accepted');

-- Enable RLS
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can see calls they're part of
DROP POLICY IF EXISTS calls_select_own ON calls;
CREATE POLICY calls_select_own ON calls
  FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Users can create calls where they are the caller
DROP POLICY IF EXISTS calls_insert_caller ON calls;
CREATE POLICY calls_insert_caller ON calls
  FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

-- Participants can update call status
DROP POLICY IF EXISTS calls_update_participant ON calls;
CREATE POLICY calls_update_participant ON calls
  FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Enable realtime for calls table
ALTER PUBLICATION supabase_realtime ADD TABLE calls;

-- ============================================
-- RPC Functions for Call Lifecycle
-- ============================================

-- Initiate a call (returns call record or error)
CREATE OR REPLACE FUNCTION initiate_call(
  p_callee_id UUID,
  p_call_type call_type DEFAULT 'video'
)
RETURNS TABLE (
  call_id UUID,
  room_name TEXT,
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_call_id UUID;
  v_room_name TEXT;
  v_existing_call UUID;
BEGIN
  -- Validate caller is authenticated
  IF v_caller_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'Not authenticated'::TEXT;
    RETURN;
  END IF;
  
  -- Prevent self-calls
  IF v_caller_id = p_callee_id THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'Cannot call yourself'::TEXT;
    RETURN;
  END IF;
  
  -- Check if caller is already in an active call
  SELECT id INTO v_existing_call
  FROM calls
  WHERE (caller_id = v_caller_id OR callee_id = v_caller_id)
    AND status IN ('ringing', 'accepted')
  LIMIT 1;
  
  IF v_existing_call IS NOT NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'You are already in a call'::TEXT;
    RETURN;
  END IF;
  
  -- Check if callee is already in an active call
  SELECT id INTO v_existing_call
  FROM calls
  WHERE (caller_id = p_callee_id OR callee_id = p_callee_id)
    AND status IN ('ringing', 'accepted')
  LIMIT 1;
  
  IF v_existing_call IS NOT NULL THEN
    -- Return busy status
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'User is busy'::TEXT;
    RETURN;
  END IF;
  
  -- Generate unique room name
  v_call_id := gen_random_uuid();
  v_room_name := 'call_' || v_call_id::TEXT;
  
  -- Create the call record
  INSERT INTO calls (id, caller_id, callee_id, call_type, room_name, status)
  VALUES (v_call_id, v_caller_id, p_callee_id, p_call_type, v_room_name, 'ringing');
  
  RETURN QUERY SELECT v_call_id, v_room_name, NULL::TEXT;
END;
$$;

-- Accept a call
CREATE OR REPLACE FUNCTION accept_call(p_call_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  room_name TEXT,
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_call RECORD;
BEGIN
  -- Get the call
  SELECT * INTO v_call
  FROM calls
  WHERE id = p_call_id;
  
  IF v_call IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Call not found'::TEXT;
    RETURN;
  END IF;
  
  -- Only callee can accept
  IF v_call.callee_id != v_user_id THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Only the callee can accept'::TEXT;
    RETURN;
  END IF;
  
  -- Can only accept ringing calls
  IF v_call.status != 'ringing' THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Call is not ringing (status: ' || v_call.status::TEXT || ')'::TEXT;
    RETURN;
  END IF;
  
  -- Update call status
  UPDATE calls
  SET status = 'accepted', answered_at = now()
  WHERE id = p_call_id;
  
  RETURN QUERY SELECT TRUE, v_call.room_name, NULL::TEXT;
END;
$$;

-- Decline a call
CREATE OR REPLACE FUNCTION decline_call(p_call_id UUID)
RETURNS TABLE (success BOOLEAN, error TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_call RECORD;
BEGIN
  SELECT * INTO v_call
  FROM calls
  WHERE id = p_call_id;
  
  IF v_call IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Call not found'::TEXT;
    RETURN;
  END IF;
  
  -- Only callee can decline
  IF v_call.callee_id != v_user_id THEN
    RETURN QUERY SELECT FALSE, 'Only the callee can decline'::TEXT;
    RETURN;
  END IF;
  
  -- Can only decline ringing calls
  IF v_call.status != 'ringing' THEN
    RETURN QUERY SELECT FALSE, 'Call is not ringing'::TEXT;
    RETURN;
  END IF;
  
  UPDATE calls
  SET status = 'declined', ended_at = now(), ended_by = v_user_id, end_reason = 'declined'
  WHERE id = p_call_id;
  
  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- End a call (either participant can end)
CREATE OR REPLACE FUNCTION end_call(p_call_id UUID, p_reason TEXT DEFAULT 'hangup')
RETURNS TABLE (success BOOLEAN, error TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_call RECORD;
BEGIN
  SELECT * INTO v_call
  FROM calls
  WHERE id = p_call_id;
  
  IF v_call IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Call not found'::TEXT;
    RETURN;
  END IF;
  
  -- Only participants can end
  IF v_call.caller_id != v_user_id AND v_call.callee_id != v_user_id THEN
    RETURN QUERY SELECT FALSE, 'Not a participant'::TEXT;
    RETURN;
  END IF;
  
  -- Can only end active calls
  IF v_call.status NOT IN ('ringing', 'accepted') THEN
    RETURN QUERY SELECT FALSE, 'Call is not active'::TEXT;
    RETURN;
  END IF;
  
  -- Determine final status
  UPDATE calls
  SET 
    status = CASE 
      WHEN v_call.status = 'ringing' AND v_user_id = v_call.caller_id THEN 'ended'::call_status
      WHEN v_call.status = 'ringing' AND v_user_id = v_call.callee_id THEN 'declined'::call_status
      ELSE 'ended'::call_status
    END,
    ended_at = now(),
    ended_by = v_user_id,
    end_reason = p_reason
  WHERE id = p_call_id;
  
  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- Mark call as missed (for timeout handling)
CREATE OR REPLACE FUNCTION mark_call_missed(p_call_id UUID)
RETURNS TABLE (success BOOLEAN, error TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_call RECORD;
BEGIN
  SELECT * INTO v_call
  FROM calls
  WHERE id = p_call_id;
  
  IF v_call IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Call not found'::TEXT;
    RETURN;
  END IF;
  
  -- Only caller can mark as missed
  IF v_call.caller_id != v_user_id THEN
    RETURN QUERY SELECT FALSE, 'Only caller can mark as missed'::TEXT;
    RETURN;
  END IF;
  
  -- Can only mark ringing calls as missed
  IF v_call.status != 'ringing' THEN
    RETURN QUERY SELECT FALSE, 'Call is not ringing'::TEXT;
    RETURN;
  END IF;
  
  UPDATE calls
  SET status = 'missed', ended_at = now(), end_reason = 'timeout'
  WHERE id = p_call_id;
  
  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- Get active incoming call for current user
CREATE OR REPLACE FUNCTION get_incoming_call()
RETURNS TABLE (
  call_id UUID,
  caller_id UUID,
  caller_username TEXT,
  caller_avatar TEXT,
  call_type call_type,
  room_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.caller_id,
    p.username,
    p.avatar_url,
    c.call_type,
    c.room_name,
    c.created_at
  FROM calls c
  JOIN profiles p ON p.id = c.caller_id
  WHERE c.callee_id = v_user_id
    AND c.status = 'ringing'
    AND c.created_at > now() - INTERVAL '60 seconds'  -- Only recent calls
  ORDER BY c.created_at DESC
  LIMIT 1;
END;
$$;

-- Get current active call for user (either as caller or callee)
CREATE OR REPLACE FUNCTION get_active_call()
RETURNS TABLE (
  call_id UUID,
  caller_id UUID,
  callee_id UUID,
  other_user_id UUID,
  other_username TEXT,
  other_avatar TEXT,
  call_type call_type,
  status call_status,
  room_name TEXT,
  is_caller BOOLEAN,
  created_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.caller_id,
    c.callee_id,
    CASE WHEN c.caller_id = v_user_id THEN c.callee_id ELSE c.caller_id END,
    p.username,
    p.avatar_url,
    c.call_type,
    c.status,
    c.room_name,
    (c.caller_id = v_user_id),
    c.created_at,
    c.answered_at
  FROM calls c
  JOIN profiles p ON p.id = CASE WHEN c.caller_id = v_user_id THEN c.callee_id ELSE c.caller_id END
  WHERE (c.caller_id = v_user_id OR c.callee_id = v_user_id)
    AND c.status IN ('ringing', 'accepted')
  ORDER BY c.created_at DESC
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION initiate_call(UUID, call_type) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_call(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_call(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION end_call(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_call_missed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_incoming_call() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_call() TO authenticated;
