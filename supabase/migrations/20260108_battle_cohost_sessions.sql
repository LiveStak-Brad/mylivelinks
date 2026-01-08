-- =============================================================================
-- Battle + Cohost Sessions Migration
-- =============================================================================
-- Creates tables, indexes, RLS policies, and RPC functions for:
-- - Battle sessions (1v1 gift battles with timers)
-- - Cohost sessions (collaborative streaming)
-- - Speed battle pool (auto-matching)
-- =============================================================================

BEGIN;

-- =============================================================================
-- TABLE: live_sessions
-- =============================================================================
-- Stores active battle and cohost sessions between two hosts
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('battle', 'cohost')),
  mode TEXT NOT NULL CHECK (mode IN ('speed', 'standard')),
  host_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  host_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cooldown', 'ended')),
  started_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  cooldown_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure host_a != host_b
  CONSTRAINT live_sessions_different_hosts CHECK (host_a != host_b)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_live_sessions_host_a_status 
  ON public.live_sessions(host_a, status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_host_b_status 
  ON public.live_sessions(host_b, status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status 
  ON public.live_sessions(status) WHERE status IN ('active', 'cooldown');
CREATE INDEX IF NOT EXISTS idx_live_sessions_created_at 
  ON public.live_sessions(created_at DESC);

-- =============================================================================
-- TABLE: live_session_invites
-- =============================================================================
-- Stores pending/responded invites for battles and cohost sessions
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.live_session_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.live_sessions(id) ON DELETE SET NULL,
  from_host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('battle', 'cohost')),
  mode TEXT NOT NULL DEFAULT 'standard' CHECK (mode IN ('speed', 'standard')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  
  -- Ensure from != to
  CONSTRAINT live_session_invites_different_hosts CHECK (from_host_id != to_host_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_live_session_invites_to_host_status 
  ON public.live_session_invites(to_host_id, status);
CREATE INDEX IF NOT EXISTS idx_live_session_invites_from_host_status 
  ON public.live_session_invites(from_host_id, status);
CREATE INDEX IF NOT EXISTS idx_live_session_invites_created_at 
  ON public.live_session_invites(created_at DESC);

-- =============================================================================
-- TABLE: battle_pool
-- =============================================================================
-- Speed battle pool for auto-matching live hosts
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.battle_pool (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_match_at TIMESTAMPTZ
);

-- Index for matching query (oldest waiting first)
CREATE INDEX IF NOT EXISTS idx_battle_pool_status_joined 
  ON public.battle_pool(status, joined_at ASC) WHERE status = 'waiting';

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_pool ENABLE ROW LEVEL SECURITY;

-- live_sessions: Participants can read/update their own sessions
-- Anyone can read active sessions (needed for viewers to detect battles)
CREATE POLICY "live_sessions_select_public" ON public.live_sessions
  FOR SELECT USING (true);

CREATE POLICY "live_sessions_insert_participants" ON public.live_sessions
  FOR INSERT WITH CHECK (
    auth.uid() = host_a OR auth.uid() = host_b
  );

CREATE POLICY "live_sessions_update_participants" ON public.live_sessions
  FOR UPDATE USING (
    auth.uid() = host_a OR auth.uid() = host_b
  );

-- live_session_invites: Only from_host or to_host can see invites
CREATE POLICY "live_session_invites_select" ON public.live_session_invites
  FOR SELECT USING (
    auth.uid() = from_host_id OR auth.uid() = to_host_id
  );

CREATE POLICY "live_session_invites_insert" ON public.live_session_invites
  FOR INSERT WITH CHECK (
    auth.uid() = from_host_id
  );

CREATE POLICY "live_session_invites_update" ON public.live_session_invites
  FOR UPDATE USING (
    auth.uid() = from_host_id OR auth.uid() = to_host_id
  );

-- battle_pool: Users can manage their own pool entry, read all for matching
CREATE POLICY "battle_pool_select" ON public.battle_pool
  FOR SELECT USING (true);

CREATE POLICY "battle_pool_insert" ON public.battle_pool
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "battle_pool_update" ON public.battle_pool
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "battle_pool_delete" ON public.battle_pool
  FOR DELETE USING (auth.uid() = profile_id);

-- =============================================================================
-- REALTIME PUBLICATION
-- =============================================================================

-- Enable realtime for invites (hosts need to see incoming invites)
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_invites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_pool;

-- =============================================================================
-- RPC: rpc_get_live_users_for_invite
-- =============================================================================
-- Returns live solo streamers for invite modals with relationship flags
-- Tabs: 'friends' (mutual follows), 'following', 'followers', 'everyone'
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_live_users_for_invite(
  p_tab TEXT DEFAULT 'everyone'
)
RETURNS TABLE (
  profile_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  viewer_count INTEGER,
  is_friend BOOLEAN,
  is_following BOOLEAN,
  is_follower BOOLEAN
)
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

  RETURN QUERY
  WITH 
  -- Get users I follow
  my_following AS (
    SELECT followee_id FROM follows WHERE follower_id = v_user_id
  ),
  -- Get users who follow me
  my_followers AS (
    SELECT follower_id FROM follows WHERE followee_id = v_user_id
  ),
  -- Get users in active sessions (exclude from results)
  active_session_users AS (
    SELECT host_a AS user_id FROM live_sessions WHERE status IN ('active', 'cooldown')
    UNION
    SELECT host_b AS user_id FROM live_sessions WHERE status IN ('active', 'cooldown')
  ),
  -- Get live solo streamers
  live_streamers AS (
    SELECT 
      ls.profile_id,
      p.username::text AS username,
      p.display_name::text AS display_name,
      p.avatar_url::text AS avatar_url,
      0::INTEGER as viewer_count,
      EXISTS (SELECT 1 FROM my_following mf WHERE mf.followee_id = ls.profile_id) 
        AND EXISTS (SELECT 1 FROM my_followers mfr WHERE mfr.follower_id = ls.profile_id) AS is_friend,
      EXISTS (SELECT 1 FROM my_following mf WHERE mf.followee_id = ls.profile_id) AS is_following,
      EXISTS (SELECT 1 FROM my_followers mfr WHERE mfr.follower_id = ls.profile_id) AS is_follower,
      ls.updated_at
    FROM live_streams ls
    INNER JOIN profiles p ON p.id = ls.profile_id
    WHERE ls.live_available = true
      AND ls.streaming_mode = 'solo'
      AND ls.profile_id != v_user_id
      AND ls.profile_id NOT IN (SELECT user_id FROM active_session_users)
  )
  SELECT 
    ls.profile_id,
    ls.username,
    ls.display_name,
    ls.avatar_url,
    ls.viewer_count,
    ls.is_friend,
    ls.is_following,
    ls.is_follower
  FROM live_streamers ls
  WHERE 
    CASE p_tab
      WHEN 'friends' THEN ls.is_friend = true
      WHEN 'following' THEN ls.is_following = true
      WHEN 'followers' THEN ls.is_follower = true
      WHEN 'everyone' THEN true
      ELSE true
    END
  ORDER BY 
    ls.updated_at DESC
  LIMIT 50;
END;
$$;

-- =============================================================================
-- RPC: rpc_send_invite
-- =============================================================================
-- Creates a pending invite for battle or cohost
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
  v_existing_pending INTEGER;
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
  
  -- Check for existing pending invite to same user
  SELECT COUNT(*) INTO v_existing_pending
  FROM live_session_invites
  WHERE from_host_id = v_user_id
    AND to_host_id = p_to_host_id
    AND status = 'pending';
    
  IF v_existing_pending > 0 THEN
    RAISE EXCEPTION 'Pending invite already exists';
  END IF;
  
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
-- RPC: rpc_respond_to_invite
-- =============================================================================
-- Accept or decline an invite. On accept, creates active session.
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
  
  -- ACCEPTED: Create the session
  -- Determine battle duration based on mode
  IF v_invite.mode = 'speed' THEN
    v_battle_duration := INTERVAL '60 seconds';
  ELSE
    v_battle_duration := INTERVAL '180 seconds';
  END IF;
  
  INSERT INTO live_sessions (type, mode, host_a, host_b, status, started_at, ends_at)
  VALUES (
    v_invite.type,
    v_invite.mode,
    v_invite.from_host_id,
    v_invite.to_host_id,
    'active',
    now(),
    now() + v_battle_duration
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
    'type', v_invite.type,
    'mode', v_invite.mode
  );
END;
$$;

-- =============================================================================
-- RPC: rpc_cancel_invite
-- =============================================================================
-- Sender cancels their pending invite
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_cancel_invite(
  p_invite_id UUID
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
  
  UPDATE live_session_invites
  SET status = 'cancelled', responded_at = now()
  WHERE id = p_invite_id
    AND from_host_id = v_user_id
    AND status = 'pending';
    
  RETURN FOUND;
END;
$$;

-- =============================================================================
-- RPC: rpc_end_session
-- =============================================================================
-- Ends a session or transitions to cooldown
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
  END IF;
  
  RETURN TRUE;
END;
$$;

-- =============================================================================
-- RPC: rpc_start_rematch
-- =============================================================================
-- Starts a new battle with same opponent (resets timer)
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
  v_new_session_id UUID;
  v_battle_duration INTERVAL;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Fetch the original session
  SELECT * INTO v_session
  FROM live_sessions
  WHERE id = p_session_id
    AND (host_a = v_user_id OR host_b = v_user_id)
    AND status = 'cooldown';
    
  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Session not found or not in cooldown';
  END IF;
  
  -- End the old session
  UPDATE live_sessions SET status = 'ended' WHERE id = p_session_id;
  
  -- Create new session with same hosts
  IF v_session.mode = 'speed' THEN
    v_battle_duration := INTERVAL '60 seconds';
  ELSE
    v_battle_duration := INTERVAL '180 seconds';
  END IF;
  
  INSERT INTO live_sessions (type, mode, host_a, host_b, status, started_at, ends_at)
  VALUES (
    v_session.type,
    v_session.mode,
    v_session.host_a,
    v_session.host_b,
    'active',
    now(),
    now() + v_battle_duration
  )
  RETURNING id INTO v_new_session_id;
  
  RETURN v_new_session_id;
END;
$$;

-- =============================================================================
-- RPC: rpc_join_battle_pool
-- =============================================================================
-- Adds user to speed battle pool
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_join_battle_pool()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_live BOOLEAN;
  v_in_session BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check user is live
  SELECT EXISTS (
    SELECT 1 FROM live_streams 
    WHERE profile_id = v_user_id 
      AND live_available = true 
      AND streaming_mode = 'solo'
  ) INTO v_is_live;
  
  IF NOT v_is_live THEN
    RAISE EXCEPTION 'Must be live in solo mode to join pool';
  END IF;
  
  -- Check not already in active session
  SELECT EXISTS (
    SELECT 1 FROM live_sessions 
    WHERE (host_a = v_user_id OR host_b = v_user_id) 
      AND status IN ('active', 'cooldown')
  ) INTO v_in_session;
  
  IF v_in_session THEN
    RAISE EXCEPTION 'Already in an active session';
  END IF;
  
  -- Upsert into pool
  INSERT INTO battle_pool (profile_id, status, joined_at)
  VALUES (v_user_id, 'waiting', now())
  ON CONFLICT (profile_id) DO UPDATE SET
    status = 'waiting',
    joined_at = now();
    
  RETURN TRUE;
END;
$$;

-- =============================================================================
-- RPC: rpc_leave_battle_pool
-- =============================================================================
-- Removes user from speed battle pool
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_leave_battle_pool()
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
  
  DELETE FROM battle_pool WHERE profile_id = v_user_id;
  
  RETURN TRUE;
END;
$$;

-- =============================================================================
-- RPC: rpc_match_battle_pool
-- =============================================================================
-- Transaction-safe matching of two oldest waiting pool members
-- Uses FOR UPDATE SKIP LOCKED to prevent race conditions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_match_battle_pool()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_match_a UUID;
  v_match_b UUID;
  v_session_id UUID;
  v_battle_duration INTERVAL := INTERVAL '60 seconds'; -- Speed mode
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Lock and select two oldest waiting users
  -- Using SKIP LOCKED prevents blocking if another transaction is matching
  SELECT profile_id INTO v_match_a
  FROM battle_pool
  WHERE status = 'waiting'
  ORDER BY joined_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF v_match_a IS NULL THEN
    RETURN jsonb_build_object('matched', false, 'reason', 'no_users');
  END IF;
  
  -- Get second user (not the first one)
  SELECT profile_id INTO v_match_b
  FROM battle_pool
  WHERE status = 'waiting' AND profile_id != v_match_a
  ORDER BY joined_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF v_match_b IS NULL THEN
    RETURN jsonb_build_object('matched', false, 'reason', 'waiting_for_opponent');
  END IF;
  
  -- Mark both as matched
  UPDATE battle_pool 
  SET status = 'matched', last_match_at = now()
  WHERE profile_id IN (v_match_a, v_match_b);
  
  -- Create the battle session
  INSERT INTO live_sessions (type, mode, host_a, host_b, status, started_at, ends_at)
  VALUES (
    'battle',
    'speed',
    v_match_a,
    v_match_b,
    'active',
    now(),
    now() + v_battle_duration
  )
  RETURNING id INTO v_session_id;
  
  -- Remove from pool (they're in a match now)
  DELETE FROM battle_pool WHERE profile_id IN (v_match_a, v_match_b);
  
  RETURN jsonb_build_object(
    'matched', true,
    'session_id', v_session_id,
    'host_a', v_match_a,
    'host_b', v_match_b
  );
END;
$$;

-- =============================================================================
-- RPC: rpc_get_active_session_for_host
-- =============================================================================
-- Returns active session for a given host (used by viewers)
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
  v_host_a_profile profiles%ROWTYPE;
  v_host_b_profile profiles%ROWTYPE;
BEGIN
  -- Find active or cooldown session for this host
  SELECT * INTO v_session
  FROM live_sessions
  WHERE (host_a = p_host_id OR host_b = p_host_id)
    AND status IN ('active', 'cooldown')
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_session IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get host profiles
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
    'host_a', jsonb_build_object(
      'id', v_host_a_profile.id,
      'username', v_host_a_profile.username,
      'display_name', v_host_a_profile.display_name,
      'avatar_url', v_host_a_profile.avatar_url
    ),
    'host_b', jsonb_build_object(
      'id', v_host_b_profile.id,
      'username', v_host_b_profile.username,
      'display_name', v_host_b_profile.display_name,
      'avatar_url', v_host_b_profile.avatar_url
    )
  );
END;
$$;

-- =============================================================================
-- RPC: rpc_check_pool_status
-- =============================================================================
-- Returns current user's pool status and any match
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_check_pool_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_pool_entry battle_pool%ROWTYPE;
  v_session live_sessions%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('in_pool', false);
  END IF;
  
  -- Check pool entry
  SELECT * INTO v_pool_entry FROM battle_pool WHERE profile_id = v_user_id;
  
  IF v_pool_entry IS NULL THEN
    -- Check if we have an active session (we might have just been matched)
    SELECT * INTO v_session
    FROM live_sessions
    WHERE (host_a = v_user_id OR host_b = v_user_id)
      AND status = 'active'
      AND created_at > now() - INTERVAL '10 seconds'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_session IS NOT NULL THEN
      RETURN jsonb_build_object(
        'in_pool', false,
        'matched', true,
        'session_id', v_session.id
      );
    END IF;
    
    RETURN jsonb_build_object('in_pool', false);
  END IF;
  
  IF v_pool_entry.status = 'matched' THEN
    -- Find the session
    SELECT * INTO v_session
    FROM live_sessions
    WHERE (host_a = v_user_id OR host_b = v_user_id)
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN jsonb_build_object(
      'in_pool', true,
      'status', 'matched',
      'matched', true,
      'session_id', v_session.id
    );
  END IF;
  
  RETURN jsonb_build_object(
    'in_pool', true,
    'status', v_pool_entry.status,
    'joined_at', v_pool_entry.joined_at
  );
END;
$$;

COMMIT;
