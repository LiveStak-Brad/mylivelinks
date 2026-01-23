-- Fix: Update rpc_get_active_session_for_host to include battle_ready and battle_active statuses
-- This allows gifts to count towards battle scores during all active battle phases
-- Also restore rpc_get_live_users_for_invite to original working version (remove any participants references)

-- Restore rpc_get_live_users_for_invite to original working version
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

-- Update rpc_get_active_session_for_host
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
  -- Find active session for this host
  -- Include battle_ready and battle_active statuses so gifts count during all battle phases
  SELECT * INTO v_session
  FROM live_sessions
  WHERE (host_a = p_host_id OR host_b = p_host_id)
    AND status IN ('active', 'cooldown', 'battle_active', 'battle_ready')
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_session IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get host profiles (always try to get them for backward compatibility)
  IF v_session.host_a IS NOT NULL THEN
    SELECT * INTO v_host_a_profile FROM profiles WHERE id = v_session.host_a;
  END IF;
  IF v_session.host_b IS NOT NULL THEN
    SELECT * INTO v_host_b_profile FROM profiles WHERE id = v_session.host_b;
  END IF;
  
  -- Build response - always include host_a/host_b for backward compatibility
  RETURN jsonb_build_object(
    'session_id', v_session.id,
    'id', v_session.id, -- Also include 'id' for compatibility
    'type', v_session.type,
    'mode', v_session.mode,
    'status', v_session.status,
    'started_at', v_session.started_at,
    'ends_at', v_session.ends_at,
    'cooldown_ends_at', v_session.cooldown_ends_at,
    'host_a', CASE 
      WHEN v_host_a_profile IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', v_host_a_profile.id,
        'username', v_host_a_profile.username,
        'display_name', v_host_a_profile.display_name,
        'avatar_url', v_host_a_profile.avatar_url
      )
    END,
    'host_b', CASE
      WHEN v_host_b_profile IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', v_host_b_profile.id,
        'username', v_host_b_profile.username,
        'display_name', v_host_b_profile.display_name,
        'avatar_url', v_host_b_profile.avatar_url
      )
    END
  );
END;
$$;
