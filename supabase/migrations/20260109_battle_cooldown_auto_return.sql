-- =============================================================================
-- Battle Cooldown Auto-Return to Cohost
-- =============================================================================
-- Automatically converts battle sessions back to cohost when cooldown expires
-- =============================================================================

BEGIN;

-- =============================================================================
-- Add function to auto-convert battle cooldown to cohost
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_battle_cooldown_to_cohost(
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session live_sessions%ROWTYPE;
BEGIN
  -- Fetch the battle session in cooldown
  SELECT * INTO v_session
  FROM live_sessions
  WHERE id = p_session_id
    AND type = 'battle'
    AND status = 'cooldown'
  FOR UPDATE;
  
  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Battle session not found or not in cooldown';
  END IF;
  
  -- Convert back to cohost session
  UPDATE live_sessions
  SET 
    type = 'cohost',
    status = 'active',
    started_at = NULL,
    ends_at = NULL
  WHERE id = p_session_id;
  
  RETURN jsonb_build_object(
    'session_id', p_session_id,
    'type', 'cohost',
    'status', 'active'
  );
END;
$$;

COMMIT;
