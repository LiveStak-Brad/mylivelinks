-- =============================================================================
-- APPLY_MULTI_HOST_SCHEMA.sql
-- =============================================================================
-- Adds support for 3-9 participants in cohost/battle sessions
-- Changes from fixed host_a/host_b to flexible participants table
-- =============================================================================

-- =============================================================================
-- 1. Create live_session_participants table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.live_session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team TEXT DEFAULT 'A' CHECK (team IN ('A', 'B')),
  slot_index INT NOT NULL DEFAULT 0, -- 0 = host/owner, 1+ = guests in order joined
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ, -- NULL = still in session
  
  -- Each user can only be in one active slot per session
  CONSTRAINT unique_active_participant UNIQUE (session_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_session_participants_session 
  ON public.live_session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_profile 
  ON public.live_session_participants(profile_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_active 
  ON public.live_session_participants(session_id) WHERE left_at IS NULL;

-- RLS for participants table
ALTER TABLE public.live_session_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-run safety)
DROP POLICY IF EXISTS "session_participants_select" ON public.live_session_participants;
DROP POLICY IF EXISTS "session_participants_insert" ON public.live_session_participants;
DROP POLICY IF EXISTS "session_participants_update" ON public.live_session_participants;

CREATE POLICY "session_participants_select" ON public.live_session_participants
  FOR SELECT USING (true);

CREATE POLICY "session_participants_insert" ON public.live_session_participants
  FOR INSERT WITH CHECK (false); -- Only via RPC

CREATE POLICY "session_participants_update" ON public.live_session_participants
  FOR UPDATE USING (false); -- Only via RPC

-- =============================================================================
-- 2. Migrate existing sessions to participants table
-- =============================================================================

-- Insert host_a as participant with slot 0 for all existing sessions
INSERT INTO public.live_session_participants (session_id, profile_id, team, slot_index, joined_at)
SELECT id, host_a, 'A', 0, COALESCE(started_at, created_at)
FROM public.live_sessions
WHERE NOT EXISTS (
  SELECT 1 FROM public.live_session_participants p 
  WHERE p.session_id = live_sessions.id AND p.profile_id = live_sessions.host_a
)
ON CONFLICT DO NOTHING;

-- Insert host_b as participant with slot 1 for all existing sessions
INSERT INTO public.live_session_participants (session_id, profile_id, team, slot_index, joined_at)
SELECT id, host_b, 'B', 1, COALESCE(started_at, created_at)
FROM public.live_sessions
WHERE host_b IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.live_session_participants p 
  WHERE p.session_id = live_sessions.id AND p.profile_id = live_sessions.host_b
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 3. Update rpc_send_invite to allow adding to existing session
-- =============================================================================

-- Drop the old 3-parameter version to avoid ambiguity
DROP FUNCTION IF EXISTS public.rpc_send_invite(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.rpc_send_invite(
  p_to_host_id UUID,
  p_type TEXT,
  p_mode TEXT DEFAULT 'standard',
  p_session_id UUID DEFAULT NULL -- NEW: optionally add to existing session
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
  v_current_session_id UUID;
  v_participant_count INTEGER;
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
  
  -- Cancel any existing pending outgoing invites from this user
  UPDATE live_session_invites
  SET status = 'cancelled', responded_at = now()
  WHERE from_host_id = v_user_id
    AND status = 'pending';
  
  -- Check if sender is in an active session
  SELECT ls.id INTO v_current_session_id
  FROM live_sessions ls
  JOIN live_session_participants lsp ON lsp.session_id = ls.id
  WHERE lsp.profile_id = v_user_id
    AND lsp.left_at IS NULL
    AND ls.status IN ('active', 'cooldown')
  LIMIT 1;
  
  -- If adding to existing session, verify sender is in that session
  IF p_session_id IS NOT NULL THEN
    IF v_current_session_id IS NULL OR v_current_session_id != p_session_id THEN
      RAISE EXCEPTION 'You must be in the session to invite others to it';
    END IF;
    
    -- Check participant limit (max 9 for FFA)
    SELECT COUNT(*) INTO v_participant_count
    FROM live_session_participants
    WHERE session_id = p_session_id AND left_at IS NULL;
    
    IF v_participant_count >= 9 THEN
      RAISE EXCEPTION 'Session is full (max 9 participants)';
    END IF;
  ELSE
    -- Creating new session - sender must NOT be in active session
    IF v_current_session_id IS NOT NULL THEN
      -- Use the current session for this invite
      p_session_id := v_current_session_id;
      
      -- Check participant limit
      SELECT COUNT(*) INTO v_participant_count
      FROM live_session_participants
      WHERE session_id = p_session_id AND left_at IS NULL;
      
      IF v_participant_count >= 9 THEN
        RAISE EXCEPTION 'Session is full (max 9 participants)';
      END IF;
    END IF;
  END IF;
  
  -- Check if target is already in sender's session
  IF p_session_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existing_active
    FROM live_session_participants
    WHERE session_id = p_session_id
      AND profile_id = p_to_host_id
      AND left_at IS NULL;
      
    IF v_existing_active > 0 THEN
      RAISE EXCEPTION 'User is already in this session';
    END IF;
  END IF;
  
  -- Check if target is in a DIFFERENT active session
  SELECT COUNT(*) INTO v_existing_active
  FROM live_sessions ls
  JOIN live_session_participants lsp ON lsp.session_id = ls.id
  WHERE lsp.profile_id = p_to_host_id
    AND lsp.left_at IS NULL
    AND ls.status IN ('active', 'cooldown')
    AND (p_session_id IS NULL OR ls.id != p_session_id);
    
  IF v_existing_active > 0 THEN
    RAISE EXCEPTION 'User is already in another active session';
  END IF;
  
  -- Create the invite (with optional session_id for adding to existing)
  INSERT INTO live_session_invites (from_host_id, to_host_id, type, mode, status, session_id)
  VALUES (v_user_id, p_to_host_id, p_type, p_mode, 'pending', p_session_id)
  RETURNING id INTO v_invite_id;
  
  RETURN v_invite_id;
END;
$$;

-- =============================================================================
-- 4. Update rpc_respond_to_invite to add participant to session
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
    UPDATE live_session_invites
    SET status = 'declined', responded_at = now()
    WHERE id = p_invite_id;
    
    RETURN jsonb_build_object('status', 'declined', 'invite_id', p_invite_id);
  END IF;
  
  -- ACCEPTED
  IF v_invite.session_id IS NOT NULL THEN
    -- Adding to existing session
    v_session_id := v_invite.session_id;
    
    -- Get next slot index
    SELECT COALESCE(MAX(slot_index), 0) + 1 INTO v_next_slot
    FROM live_session_participants
    WHERE session_id = v_session_id AND left_at IS NULL;
    
    -- Determine team (alternate for battles, always A for cohost)
    -- For battles: even slots = A, odd slots = B
    INSERT INTO live_session_participants (session_id, profile_id, team, slot_index)
    VALUES (
      v_session_id,
      v_user_id,
      CASE WHEN v_invite.type = 'battle' THEN 
        CASE WHEN v_next_slot % 2 = 0 THEN 'A' ELSE 'B' END
      ELSE 'A' END,
      v_next_slot
    );
    
  ELSE
    -- Creating new session
    IF v_invite.mode = 'speed' THEN
      v_battle_duration := INTERVAL '60 seconds';
    ELSE
      v_battle_duration := INTERVAL '180 seconds';
    END IF;
    
    -- Create session (still use host_a/host_b for backwards compatibility)
    INSERT INTO live_sessions (type, mode, host_a, host_b, status, started_at, ends_at)
    VALUES (
      v_invite.type,
      v_invite.mode,
      v_invite.from_host_id,
      v_user_id,
      'active',
      now(),
      CASE WHEN v_invite.type = 'battle' THEN now() + v_battle_duration ELSE NULL END
    )
    RETURNING id INTO v_session_id;
    
    -- Add both participants to participants table
    INSERT INTO live_session_participants (session_id, profile_id, team, slot_index)
    VALUES 
      (v_session_id, v_invite.from_host_id, 'A', 0),
      (v_session_id, v_user_id, 'B', 1);
  END IF;
  
  -- Update the invite
  UPDATE live_session_invites
  SET status = 'accepted', responded_at = now(), session_id = v_session_id
  WHERE id = p_invite_id;
  
  -- Get participant count
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
-- 5. RPC to get session participants
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_session_participants(
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
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
  ) INTO v_result
  FROM live_session_participants lsp
  JOIN profiles p ON p.id = lsp.profile_id
  WHERE lsp.session_id = p_session_id
    AND lsp.left_at IS NULL;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_session_participants(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_session_participants(UUID) TO anon;

-- =============================================================================
-- 6. RPC for participant to leave session
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_leave_session(
  p_session_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_remaining_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Mark participant as left
  UPDATE live_session_participants
  SET left_at = now()
  WHERE session_id = p_session_id
    AND profile_id = v_user_id
    AND left_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not in this session';
  END IF;
  
  -- Check remaining participants
  SELECT COUNT(*) INTO v_remaining_count
  FROM live_session_participants
  WHERE session_id = p_session_id AND left_at IS NULL;
  
  -- If less than 2 participants remain, end the session
  IF v_remaining_count < 2 THEN
    UPDATE live_sessions
    SET status = 'ended'
    WHERE id = p_session_id AND status IN ('active', 'cooldown');
  END IF;
  
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_leave_session(UUID) TO authenticated;

-- =============================================================================
-- 7. Update rpc_get_active_session_for_host to include participants
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
BEGIN
  -- Find active session for this host via participants table
  SELECT ls.* INTO v_session
  FROM live_sessions ls
  JOIN live_session_participants lsp ON lsp.session_id = ls.id
  WHERE lsp.profile_id = p_host_id
    AND lsp.left_at IS NULL
    AND ls.status IN ('active', 'cooldown')
  ORDER BY ls.created_at DESC
  LIMIT 1;
  
  IF v_session IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get all participants
  v_participants := public.rpc_get_session_participants(v_session.id);
  
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
    'participants', v_participants,
    -- Backwards compatibility: still include host_a/host_b
    'host_a', jsonb_build_object(
      'id', v_host_a_profile.id,
      'username', v_host_a_profile.username,
      'display_name', v_host_a_profile.display_name,
      'avatar_url', v_host_a_profile.avatar_url
    ),
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

-- =============================================================================
-- 8. Enable realtime for live_session_participants
-- =============================================================================

-- Add table to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'live_session_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_participants;
    RAISE NOTICE 'Added live_session_participants to realtime publication';
  ELSE
    RAISE NOTICE 'live_session_participants already in realtime publication';
  END IF;
END $$;

-- =============================================================================
-- Verification
-- =============================================================================

SELECT 'live_session_participants table created' AS status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'live_session_participants');

SELECT COUNT(*) AS migrated_participants FROM live_session_participants;
