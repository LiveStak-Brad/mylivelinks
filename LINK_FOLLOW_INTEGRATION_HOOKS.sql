-- ============================================================================
-- MUTUAL => FOLLOW INTEGRATION HOOKS
-- Task 1: Prepare for follow system integration (deferred-safe)
-- ============================================================================

-- ============================================================================
-- CURRENT STATE
-- ============================================================================
/*
Link system tracks "link intent" via link_mutuals table:
- Manual mutuals (source='manual'): Both users swiped "link"
- Auto-follow mutuals (source='auto_follow'): Created via rpc_handle_follow_event

Follow system is SEPARATE and not yet integrated.

WHEN FOLLOW SCHEMA IS PROVIDED:
We will implement follow creation when mutuals are created.
*/

-- ============================================================================
-- INTEGRATION POINT 1: Manual Mutual Creation (in rpc_submit_link_decision)
-- ============================================================================

/*
Location: rpc_submit_link_decision() around line 493-520 in migration

Current code:
```sql
IF v_reverse_decision = 'link' THEN
  -- Create mutual (ensure ordered pair)
  v_mutual_id_a := LEAST(v_from_profile_id, p_to_profile_id);
  v_mutual_id_b := GREATEST(v_from_profile_id, p_to_profile_id);
  
  INSERT INTO link_mutuals (profile_a, profile_b, source)
  VALUES (v_mutual_id_a, v_mutual_id_b, 'manual')
  ON CONFLICT DO NOTHING;
  
  -- TODO: FOLLOW INTEGRATION HOOK #1
  -- When follow schema is provided, add here:
  -- PERFORM create_mutual_follows(v_from_profile_id, p_to_profile_id);
  -- This should create bidirectional follows:
  --   INSERT INTO follows (follower_id, followed_id) VALUES (user_a, user_b);
  --   INSERT INTO follows (follower_id, followed_id) VALUES (user_b, user_a);
  
  -- Create event for notification
  INSERT INTO link_events (...);
  
  v_is_mutual := true;
END IF;
```

REQUIRED SCHEMA INFO:
- Table name where follows are stored
- Column names (follower_id? followed_id? user_id? target_id?)
- Any existing constraints or triggers
- Should follow creation be in RPC or separate function?
*/

-- ============================================================================
-- INTEGRATION POINT 2: Auto-Link Mutual Creation (in rpc_handle_follow_event)
-- ============================================================================

/*
Location: rpc_handle_follow_event() around line 909-933 in migration

Current code:
```sql
INSERT INTO link_mutuals (profile_a, profile_b, source)
VALUES (v_mutual_id_a, v_mutual_id_b, 'auto_follow')
ON CONFLICT DO NOTHING
RETURNING true INTO v_mutual_created;

-- TODO: FOLLOW INTEGRATION HOOK #2
-- For auto-link mutuals, follow ALREADY EXISTS (that's what triggered this)
-- So we need to create the REVERSE follow only:
-- IF v_mutual_created THEN
--   -- User A followed User B (already done - that's why we're here)
--   -- Create reverse: User B follows User A
--   INSERT INTO follows (follower_id, followed_id)
--   VALUES (p_followed_id, p_follower_id)
--   ON CONFLICT DO NOTHING;
-- END IF;
```

NOTE: Auto-link is triggered BY a follow, so only reverse follow is needed.
*/

-- ============================================================================
-- HELPER FUNCTION TEMPLATE (Create when follow schema is provided)
-- ============================================================================

/*
CREATE OR REPLACE FUNCTION create_mutual_follows(
  p_user_a uuid,
  p_user_b uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create bidirectional follows
  INSERT INTO follows (follower_id, followed_id, created_at)
  VALUES (p_user_a, p_user_b, now())
  ON CONFLICT (follower_id, followed_id) DO NOTHING;
  
  INSERT INTO follows (follower_id, followed_id, created_at)
  VALUES (p_user_b, p_user_a, now())
  ON CONFLICT (follower_id, followed_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION create_mutual_follows(uuid, uuid) TO service_role;
*/

-- ============================================================================
-- DATA INTEGRITY CHECKS (Run after follow integration)
-- ============================================================================

/*
After follow integration, verify:

1. All manual mutuals have bidirectional follows:
SELECT 
  lm.profile_a,
  lm.profile_b,
  EXISTS(SELECT 1 FROM follows WHERE follower_id=lm.profile_a AND followed_id=lm.profile_b) as a_follows_b,
  EXISTS(SELECT 1 FROM follows WHERE follower_id=lm.profile_b AND followed_id=lm.profile_a) as b_follows_a
FROM link_mutuals lm
WHERE lm.source = 'manual'
  AND (
    NOT EXISTS(SELECT 1 FROM follows WHERE follower_id=lm.profile_a AND followed_id=lm.profile_b)
    OR NOT EXISTS(SELECT 1 FROM follows WHERE follower_id=lm.profile_b AND followed_id=lm.profile_a)
  );
-- Expected: 0 rows (all mutuals have both follows)

2. All auto-follow mutuals have bidirectional follows:
SELECT 
  lm.profile_a,
  lm.profile_b,
  EXISTS(SELECT 1 FROM follows WHERE follower_id=lm.profile_a AND followed_id=lm.profile_b) as a_follows_b,
  EXISTS(SELECT 1 FROM follows WHERE follower_id=lm.profile_b AND followed_id=lm.profile_a) as b_follows_a
FROM link_mutuals lm
WHERE lm.source = 'auto_follow'
  AND (
    NOT EXISTS(SELECT 1 FROM follows WHERE follower_id=lm.profile_a AND followed_id=lm.profile_b)
    OR NOT EXISTS(SELECT 1 FROM follows WHERE follower_id=lm.profile_b AND followed_id=lm.profile_a)
  );
-- Expected: 0 rows (all auto-link mutuals have both follows)

3. No orphaned follows (follows without mutual):
SELECT 
  f1.follower_id as user_a,
  f1.followed_id as user_b,
  'mutual_missing' as status
FROM follows f1
JOIN follows f2 ON f1.follower_id = f2.followed_id AND f1.followed_id = f2.follower_id
WHERE NOT EXISTS(
  SELECT 1 FROM link_mutuals lm
  WHERE lm.profile_a = LEAST(f1.follower_id, f1.followed_id)
    AND lm.profile_b = GREATEST(f1.follower_id, f1.followed_id)
);
-- This query finds bidirectional follows that DON'T have a mutual
-- Allowed if follows existed before Link system
-- But NEW mutuals should always have follows
*/

-- ============================================================================
-- QUESTIONS FOR USER (BLOCKING TASK 1 COMPLETION)
-- ============================================================================

/*
To complete follow integration, provide:

1. Follow table schema:
   - Table name: _______________
   - Follower column: _______________
   - Followed column: _______________
   - Any unique constraints: _______________

2. Integration approach (choose one):
   [ ] Option A: Add follow writes directly in existing RPCs
   [ ] Option B: Create separate helper function
   [ ] Option C: Use database trigger on link_mutuals table

3. Existing follow handling:
   - Where are follows currently created in app? _______________
   - Any existing follow events/webhooks? _______________
   - Should Link mutuals retroactively create follows? _______________
*/
