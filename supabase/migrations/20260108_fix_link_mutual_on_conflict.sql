-- ============================================================================
-- Fix Link Mutual and Dating Match ON CONFLICT targets
-- Ensures functions do not reference non-existent unique constraints
-- ============================================================================

BEGIN;

-- Update rpc_submit_link_decision to rely on implicit unique index conflict
CREATE OR REPLACE FUNCTION rpc_submit_link_decision(
  p_to_profile_id uuid,
  p_decision text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_profile_id uuid;
  v_is_mutual boolean := false;
  v_reverse_decision text;
  v_mutual_id_a uuid;
  v_mutual_id_b uuid;
BEGIN
  v_from_profile_id := auth.uid();
  
  IF v_from_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF v_from_profile_id = p_to_profile_id THEN
    RAISE EXCEPTION 'Cannot decide on yourself';
  END IF;
  
  IF p_decision NOT IN ('link', 'nah') THEN
    RAISE EXCEPTION 'Invalid decision. Must be "link" or "nah"';
  END IF;
  
  -- Insert decision (idempotent)
  INSERT INTO link_decisions (
    from_profile_id,
    to_profile_id,
    decision
  )
  VALUES (
    v_from_profile_id,
    p_to_profile_id,
    p_decision
  )
  ON CONFLICT (from_profile_id, to_profile_id) 
  DO UPDATE SET
    decision = EXCLUDED.decision,
    created_at = now();
  
  -- Check if both decided 'link'
  IF p_decision = 'link' THEN
    SELECT decision INTO v_reverse_decision
    FROM link_decisions
    WHERE from_profile_id = p_to_profile_id
      AND to_profile_id = v_from_profile_id;
    
    IF v_reverse_decision = 'link' THEN
      -- Create mutual (ensure ordered pair)
      v_mutual_id_a := LEAST(v_from_profile_id, p_to_profile_id);
      v_mutual_id_b := GREATEST(v_from_profile_id, p_to_profile_id);
      
      INSERT INTO link_mutuals (
        profile_a,
        profile_b,
        source,
        created_at
      )
      VALUES (
        v_mutual_id_a,
        v_mutual_id_b,
        'manual',
        now()
      )
      ON CONFLICT DO NOTHING;
      
      v_is_mutual := true;
      
      -- Create follow relationships both ways (idempotent)
      INSERT INTO follows (
        follower_id,
        followee_id,
        followed_at
      )
      VALUES (
        v_from_profile_id,
        p_to_profile_id,
        now()
      )
      ON CONFLICT (follower_id, followee_id) DO NOTHING;
      
      INSERT INTO follows (
        follower_id,
        followee_id,
        followed_at
      )
      VALUES (
        p_to_profile_id,
        v_from_profile_id,
        now()
      )
      ON CONFLICT (follower_id, followee_id) DO NOTHING;
      
      -- Create notification events for both users
      INSERT INTO link_events (event_type, actor_profile_id, target_profile_id, metadata)
      VALUES
        ('link_mutual_created', v_from_profile_id, p_to_profile_id, jsonb_build_object('source', 'manual')),
        ('link_mutual_created', p_to_profile_id, v_from_profile_id, jsonb_build_object('source', 'manual'));
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'mutual', v_is_mutual
  );
END;
$$;

-- Update rpc_submit_dating_decision similarly
CREATE OR REPLACE FUNCTION rpc_submit_dating_decision(
  p_to_profile_id uuid,
  p_decision text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_profile_id uuid;
  v_is_match boolean := false;
  v_reverse_decision text;
  v_match_id_a uuid;
  v_match_id_b uuid;
BEGIN
  v_from_profile_id := auth.uid();
  
  IF v_from_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF v_from_profile_id = p_to_profile_id THEN
    RAISE EXCEPTION 'Cannot decide on yourself';
  END IF;
  
  IF p_decision NOT IN ('like', 'nah') THEN
    RAISE EXCEPTION 'Invalid decision. Must be "like" or "nah"';
  END IF;
  
  -- Insert decision (idempotent)
  INSERT INTO dating_decisions (
    from_profile_id,
    to_profile_id,
    decision
  )
  VALUES (
    v_from_profile_id,
    p_to_profile_id,
    p_decision
  )
  ON CONFLICT (from_profile_id, to_profile_id) 
  DO UPDATE SET
    decision = EXCLUDED.decision,
    created_at = now();
  
  -- Check if both decided 'like'
  IF p_decision = 'like' THEN
    SELECT decision INTO v_reverse_decision
    FROM dating_decisions
    WHERE from_profile_id = p_to_profile_id
      AND to_profile_id = v_from_profile_id;
    
    IF v_reverse_decision = 'like' THEN
      -- Create match (ensure ordered pair)
      v_match_id_a := LEAST(v_from_profile_id, p_to_profile_id);
      v_match_id_b := GREATEST(v_from_profile_id, p_to_profile_id);
      
      INSERT INTO dating_matches (
        profile_a,
        profile_b,
        created_at
      )
      VALUES (
        v_match_id_a,
        v_match_id_b,
        now()
      )
      ON CONFLICT DO NOTHING;
      
      v_is_match := true;
      
      -- Create follow relationships both ways (idempotent)
      INSERT INTO follows (
        follower_id,
        followee_id,
        followed_at
      )
      VALUES (
        v_from_profile_id,
        p_to_profile_id,
        now()
      )
      ON CONFLICT (follower_id, followee_id) DO NOTHING;
      
      INSERT INTO follows (
        follower_id,
        followee_id,
        followed_at
      )
      VALUES (
        p_to_profile_id,
        v_from_profile_id,
        now()
      )
      ON CONFLICT (follower_id, followee_id) DO NOTHING;
      
      -- Create notification events
      INSERT INTO link_events (event_type, actor_profile_id, target_profile_id, metadata)
      VALUES
        ('dating_match_created', v_from_profile_id, p_to_profile_id, jsonb_build_object('match_id', v_match_id_a::text)),
        ('dating_match_created', p_to_profile_id, v_from_profile_id, jsonb_build_object('match_id', v_match_id_a::text));
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'match', v_is_match
  );
END;
$$;

COMMIT;
