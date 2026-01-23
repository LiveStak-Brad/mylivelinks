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
-- 2. UPDATE TEAM CONSTRAINT (A-L for 12 teams)
-- =============================================================================
ALTER TABLE public.live_session_participants DROP CONSTRAINT IF EXISTS live_session_participants_team_check;
ALTER TABLE public.live_session_participants ADD CONSTRAINT live_session_participants_team_check 
  CHECK (team IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'));

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
