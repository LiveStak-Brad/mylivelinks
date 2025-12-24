-- Test Follow Functionality
-- Run this to verify the follow button works correctly after the fix

-- ============================================================================
-- 1. Setup: Create test users if they don't exist
-- ============================================================================

-- Check if we have at least 2 users to test with
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM profiles;
    
    IF user_count < 2 THEN
        RAISE NOTICE 'You need at least 2 users to test follow functionality';
        RAISE NOTICE 'Current users: %', user_count;
    ELSE
        RAISE NOTICE 'Found % users - ready for testing', user_count;
    END IF;
END $$;

-- ============================================================================
-- 2. View current users
-- ============================================================================

SELECT 
    p.id,
    p.username,
    p.display_name,
    u.email
FROM 
    profiles p
    LEFT JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 10;

-- ============================================================================
-- 3. Check follow relationships
-- ============================================================================

SELECT 
    f.id,
    follower.username as follower_username,
    followee.username as followee_username,
    f.followed_at
FROM 
    follows f
    JOIN profiles follower ON f.follower_id = follower.id
    JOIN profiles followee ON f.followee_id = followee.id
ORDER BY f.followed_at DESC;

-- ============================================================================
-- 4. Test toggle_follow RPC function directly
-- ============================================================================

-- Get two user IDs for testing
DO $$
DECLARE
    v_user1_id UUID;
    v_user2_id UUID;
    v_result JSON;
BEGIN
    -- Get first user
    SELECT id INTO v_user1_id FROM profiles LIMIT 1;
    
    -- Get second user (different from first)
    SELECT id INTO v_user2_id FROM profiles WHERE id != v_user1_id LIMIT 1;
    
    IF v_user1_id IS NULL OR v_user2_id IS NULL THEN
        RAISE NOTICE 'Not enough users to test follow functionality';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with:';
    RAISE NOTICE '  User 1 (follower): %', v_user1_id;
    RAISE NOTICE '  User 2 (followee): %', v_user2_id;
    
    -- Test 1: Follow
    RAISE NOTICE '';
    RAISE NOTICE '--- Test 1: Follow ---';
    SELECT toggle_follow(v_user1_id, v_user2_id) INTO v_result;
    RAISE NOTICE 'Result: %', v_result;
    
    -- Wait a moment
    PERFORM pg_sleep(1);
    
    -- Test 2: Unfollow
    RAISE NOTICE '';
    RAISE NOTICE '--- Test 2: Unfollow ---';
    SELECT toggle_follow(v_user1_id, v_user2_id) INTO v_result;
    RAISE NOTICE 'Result: %', v_result;
    
    -- Wait a moment
    PERFORM pg_sleep(1);
    
    -- Test 3: Follow again
    RAISE NOTICE '';
    RAISE NOTICE '--- Test 3: Follow again ---';
    SELECT toggle_follow(v_user1_id, v_user2_id) INTO v_result;
    RAISE NOTICE 'Result: %', v_result;
    
    -- Test 4: User 2 follows User 1 (mutual/friends)
    RAISE NOTICE '';
    RAISE NOTICE '--- Test 4: Mutual follow (should become friends) ---';
    SELECT toggle_follow(v_user2_id, v_user1_id) INTO v_result;
    RAISE NOTICE 'Result: %', v_result;
    
END $$;

-- ============================================================================
-- 5. Verify follower counts
-- ============================================================================

SELECT 
    p.username,
    p.follower_count,
    (SELECT COUNT(*) FROM follows WHERE followee_id = p.id) as actual_followers,
    (SELECT COUNT(*) FROM follows WHERE follower_id = p.id) as following_count
FROM 
    profiles p
ORDER BY p.username;

-- ============================================================================
-- 6. Test error cases
-- ============================================================================

-- Test self-follow (should fail)
DO $$
DECLARE
    v_user_id UUID;
    v_result JSON;
BEGIN
    SELECT id INTO v_user_id FROM profiles LIMIT 1;
    
    RAISE NOTICE '';
    RAISE NOTICE '--- Test: Self-follow (should fail) ---';
    SELECT toggle_follow(v_user_id, v_user_id) INTO v_result;
    RAISE NOTICE 'Result: %', v_result;
    
    IF (v_result->>'success')::boolean = false THEN
        RAISE NOTICE '✓ Correctly prevented self-follow';
    ELSE
        RAISE NOTICE '✗ ERROR: Self-follow was allowed!';
    END IF;
END $$;

-- ============================================================================
-- 7. Performance test - Check indexes
-- ============================================================================

EXPLAIN ANALYZE
SELECT * FROM follows WHERE follower_id = (SELECT id FROM profiles LIMIT 1);

EXPLAIN ANALYZE
SELECT * FROM follows WHERE followee_id = (SELECT id FROM profiles LIMIT 1);

-- ============================================================================
-- 8. Clean up test data (optional - uncomment to run)
-- ============================================================================

/*
-- Remove all follow relationships (CAREFUL!)
-- DELETE FROM follows;

-- Reset follower counts
UPDATE profiles SET follower_count = 0;
*/

-- ============================================================================
-- MANUAL TESTING CHECKLIST
-- ============================================================================

/*
Manual testing steps in the browser:

✓ 1. Log in as User A
✓ 2. Visit User B's profile at /{username}
✓ 3. Click "Follow" button
   - Should NOT show "Please login" message
   - Should NOT redirect to login page
   - Button should change to "Following" immediately
   - Follower count should increment
   
✓ 4. Click "Following" button to unfollow
   - Button should change back to "Follow"
   - Follower count should decrement
   
✓ 5. Refresh the page
   - Button should still show "Follow" (not "Following")
   - Follower count should be correct
   
✓ 6. Follow again and verify persistence
   - Button changes to "Following"
   - Follower count increments
   - Refresh page - button still shows "Following"
   
✓ 7. Log in as User B
✓ 8. Visit User A's profile
✓ 9. Follow User A
   - Both should now be "Friends"
   - Button should show "Friends" (green)
   
✓ 10. Log out
✓ 11. Visit any profile
✓ 12. Click "Follow" button
   - Should show "Please log in" alert
   - Should redirect to login page
   - Should have returnUrl in query params
   
✓ 13. Log in
   - Should redirect back to the profile
   - Should be able to follow now
   
✓ 14. Open browser console
   - Check for error messages
   - Verify console logs show:
     * "User logged in: {userId} Has session: true"
     * "Follow response: {success: true, status: 'following'}"
     * NO "Authentication failed" errors
*/

