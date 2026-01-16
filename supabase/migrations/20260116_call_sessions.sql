-- ============================================================================
-- CALL SESSIONS SCHEMA
-- In-app voice/video calling between users (Phase 1: foreground only)
-- ============================================================================

BEGIN;

-- Call session states:
-- 'pending'    - caller initiated, waiting for callee response
-- 'accepted'   - callee accepted, both parties connecting
-- 'active'     - call in progress
-- 'ended'      - call ended normally
-- 'declined'   - callee declined
-- 'missed'     - callee didn't respond (timeout)
-- 'cancelled'  - caller cancelled before answer

CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'active', 'ended', 'declined', 'missed', 'cancelled')),
  room_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  end_reason TEXT,
  
  CONSTRAINT no_self_calls CHECK (caller_id != callee_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller ON call_sessions(caller_id, status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_callee ON call_sessions(callee_id, status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_active ON call_sessions(status) WHERE status IN ('pending', 'accepted', 'active');

-- RLS
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

-- Users can see calls they're part of
CREATE POLICY "Users can view own calls"
  ON call_sessions FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Users can initiate calls
CREATE POLICY "Users can initiate calls"
  ON call_sessions FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

-- Participants can update call status
CREATE POLICY "Participants can update calls"
  ON call_sessions FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE call_sessions;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get active call for a user (pending, accepted, or active)
CREATE OR REPLACE FUNCTION get_active_call(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  caller_id UUID,
  callee_id UUID,
  call_type TEXT,
  status TEXT,
  room_name TEXT,
  created_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  is_caller BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.caller_id,
    cs.callee_id,
    cs.call_type,
    cs.status,
    cs.room_name,
    cs.created_at,
    cs.answered_at,
    cs.caller_id = p_user_id as is_caller
  FROM call_sessions cs
  WHERE (cs.caller_id = p_user_id OR cs.callee_id = p_user_id)
    AND cs.status IN ('pending', 'accepted', 'active')
  ORDER BY cs.created_at DESC
  LIMIT 1;
END;
$$;

-- Accept a call
CREATE OR REPLACE FUNCTION accept_call(p_call_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
BEGIN
  UPDATE call_sessions
  SET status = 'accepted', answered_at = NOW()
  WHERE id = p_call_id
    AND callee_id = p_user_id
    AND status = 'pending';
  
  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
  RETURN v_updated;
END;
$$;

-- Decline a call
CREATE OR REPLACE FUNCTION decline_call(p_call_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
BEGIN
  UPDATE call_sessions
  SET status = 'declined', ended_at = NOW(), end_reason = 'declined'
  WHERE id = p_call_id
    AND callee_id = p_user_id
    AND status = 'pending';
  
  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
  RETURN v_updated;
END;
$$;

-- End a call (either party)
CREATE OR REPLACE FUNCTION end_call(p_call_id UUID, p_user_id UUID, p_reason TEXT DEFAULT 'ended')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
BEGIN
  UPDATE call_sessions
  SET status = 'ended', ended_at = NOW(), end_reason = p_reason
  WHERE id = p_call_id
    AND (caller_id = p_user_id OR callee_id = p_user_id)
    AND status IN ('pending', 'accepted', 'active');
  
  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
  RETURN v_updated;
END;
$$;

-- Mark call as active (both connected)
CREATE OR REPLACE FUNCTION activate_call(p_call_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
BEGIN
  UPDATE call_sessions
  SET status = 'active'
  WHERE id = p_call_id
    AND (caller_id = p_user_id OR callee_id = p_user_id)
    AND status = 'accepted';
  
  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
  RETURN v_updated;
END;
$$;

COMMIT;
