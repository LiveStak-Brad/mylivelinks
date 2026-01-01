-- ============================================================================
-- LINK + FOLLOW INTEGRATION
-- Connects Link mutuals to Follow system
-- ============================================================================

-- ============================================================================
-- PART 1: Update rpc_submit_link_decision to create follows on mutual
-- ============================================================================

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
      ON CONFLICT (profile_a, profile_b) DO NOTHING;
      
      v_is_mutual := true;
      
      -- ============================================================================
      -- NEW: Create follow relationships both ways
      -- ============================================================================
      
      -- User A follows User B
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
      
      -- User B follows User A
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
      
      -- ============================================================================
      -- Create notification events for both users
      -- ============================================================================
      
      INSERT INTO link_events (event_type, actor_profile_id, target_profile_id, metadata)
      VALUES
        ('mutual_link', v_from_profile_id, p_to_profile_id, jsonb_build_object('source', 'manual')),
        ('mutual_link', p_to_profile_id, v_from_profile_id, jsonb_build_object('source', 'manual'));
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'mutual', v_is_mutual
  );
END;
$$;

-- ============================================================================
-- PART 2: Update rpc_submit_dating_decision to create follows on match
-- ============================================================================

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
      ON CONFLICT (profile_a, profile_b) DO NOTHING;
      
      v_is_match := true;
      
      -- ============================================================================
      -- NEW: Create follow relationships both ways (dating matches also follow)
      -- ============================================================================
      
      -- User A follows User B
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
      
      -- User B follows User A
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
      
      -- ============================================================================
      -- Create notification events
      -- ============================================================================
      
      INSERT INTO link_events (event_type, actor_profile_id, target_profile_id, metadata)
      VALUES
        ('dating_match', v_from_profile_id, p_to_profile_id, jsonb_build_object('match_id', v_match_id_a::text)),
        ('dating_match', p_to_profile_id, v_from_profile_id, jsonb_build_object('match_id', v_match_id_a::text));
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'match', v_is_match
  );
END;
$$;

-- ============================================================================
-- PART 3: Create helper function to call from your follow system
-- ============================================================================

-- This function should be called whenever someone follows another user
-- It checks if recipient has auto_link_on_follow enabled and creates mutual if so

-- Your existing rpc_handle_follow_event is already perfect!
-- Just need to wire it to be called when follows are created

-- Example trigger (OPTIONAL - you can also call from app layer):

CREATE OR REPLACE FUNCTION trigger_auto_link_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call the auto-link handler
  -- This will create mutual if recipient has auto_link_on_follow enabled
  PERFORM rpc_handle_follow_event(NEW.follower_id, NEW.followee_id);
  
  RETURN NEW;
END;
$$;

-- Create trigger on follows table
DROP TRIGGER IF EXISTS auto_link_on_follow_trigger ON follows;

CREATE TRIGGER auto_link_on_follow_trigger
AFTER INSERT ON follows
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_link_on_follow();

COMMENT ON TRIGGER auto_link_on_follow_trigger ON follows IS 
  'Automatically creates Link mutual if followee has auto_link_on_follow enabled';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test Link mutual → Follow
-- 1. User A links User B
-- 2. User B links User A
-- 3. Both should now follow each other
-- 4. Check: SELECT * FROM follows WHERE (follower_id = A AND followee_id = B) OR (follower_id = B AND followee_id = A);

-- Test Auto-Link on follow
-- 1. User B enables auto_link_on_follow in settings
-- 2. User C follows User B
-- 3. Link mutual should be auto-created
-- 4. Check: SELECT * FROM link_mutuals WHERE profile_a = LEAST(B,C) AND profile_b = GREATEST(B,C);

-- ============================================================================
-- SUMMARY
-- ============================================================================

/*
✅ Link Mutual (any mode) → Auto-follow both ways
✅ Dating Match → Auto-follow both ways  
✅ Follow → Auto-Link (if recipient has auto_link_on_follow enabled)

Flow:
1. User A swipes "Link" on User B
2. User B swipes "Link" on User A
3. → Link mutual created
4. → Both users auto-follow each other
5. → Notifications sent to both

Auto-Link Flow:
1. User B enables "Auto-Link on Follow" in settings
2. User C follows User B
3. → Trigger fires: trigger_auto_link_on_follow()
4. → Calls rpc_handle_follow_event(C, B)
5. → Checks if B has auto_link enabled (yes)
6. → Creates Link mutual between C and B
7. → Notifications sent

All operations are idempotent (ON CONFLICT DO NOTHING)
*/
