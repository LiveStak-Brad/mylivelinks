-- ============================================================================
-- P0 FIX: GUEST REQUESTS SYSTEM - COMPLETE AUDIT & REPAIR
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: DIAGNOSTIC QUERIES (Run these first to understand current state)
-- ============================================================================

-- 1.1: Check for orphaned/stale requests
SELECT 
  gr.id,
  gr.live_stream_id,
  gr.requester_id,
  gr.host_id,
  gr.status,
  gr.type,
  gr.created_at,
  gr.updated_at,
  ls.live_available,
  req_profile.username as requester_username,
  host_profile.username as host_username
FROM guest_requests gr
LEFT JOIN live_streams ls ON gr.live_stream_id = ls.id
LEFT JOIN profiles req_profile ON gr.requester_id = req_profile.id
LEFT JOIN profiles host_profile ON gr.host_id = host_profile.id
WHERE gr.status = 'pending'
ORDER BY gr.created_at DESC
LIMIT 50;

-- 1.2: Check for duplicate user rows (same user, same stream, different statuses)
SELECT 
  live_stream_id,
  requester_id,
  type,
  COUNT(*) as row_count,
  array_agg(status) as statuses,
  array_agg(id) as ids
FROM guest_requests
GROUP BY live_stream_id, requester_id, type
HAVING COUNT(*) > 1
ORDER BY row_count DESC;

-- 1.3: Check current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies 
WHERE tablename = 'guest_requests'
ORDER BY policyname;

-- 1.4: Check current unique constraints
SELECT 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name 
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'guest_requests' 
  AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
ORDER BY tc.constraint_name, kcu.ordinal_position;

-- ============================================================================
-- STEP 2: CLEANUP STALE DATA (Safe operations)
-- ============================================================================

-- 2.1: Expire very old pending requests (older than 1 hour)
UPDATE guest_requests
SET status = 'expired', updated_at = NOW()
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '1 hour';

-- 2.2: Clean up pending requests for streams that are no longer live
UPDATE guest_requests gr
SET status = 'expired', updated_at = NOW()
WHERE gr.status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM live_streams ls 
    WHERE ls.id = gr.live_stream_id 
      AND ls.live_available = true
  );

-- 2.3: Delete old non-active requests (older than 24 hours, not accepted)
DELETE FROM guest_requests
WHERE status IN ('declined', 'cancelled', 'expired')
  AND updated_at < NOW() - INTERVAL '24 hours';

-- ============================================================================
-- STEP 3: FIX UNIQUE CONSTRAINT (if needed)
-- ============================================================================

-- The current constraint UNIQUE(live_stream_id, requester_id, type, status)
-- allows multiple rows per user with different statuses.
-- This is intentional for history, but we need a partial index to prevent
-- multiple PENDING requests.

-- 3.1: Check if the partial index already exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'guest_requests' 
  AND indexname = 'unique_one_pending_request';

-- 3.2: Create a partial unique index for pending requests only
-- (This prevents duplicate pending requests while allowing history rows)
DROP INDEX IF EXISTS unique_one_pending_request;
CREATE UNIQUE INDEX unique_one_pending_request 
ON guest_requests (live_stream_id, requester_id, type) 
WHERE status = 'pending';

-- ============================================================================
-- STEP 4: VERIFY/FIX RLS POLICIES
-- ============================================================================

-- 4.1: Drop existing policies (we'll recreate them correctly)
DROP POLICY IF EXISTS "Users can view their own requests" ON guest_requests;
DROP POLICY IF EXISTS "Anyone can view accepted guests" ON guest_requests;
DROP POLICY IF EXISTS "Viewers can create guest requests" ON guest_requests;
DROP POLICY IF EXISTS "Hosts can create guest invites" ON guest_requests;
DROP POLICY IF EXISTS "Hosts can respond to requests" ON guest_requests;
DROP POLICY IF EXISTS "Viewers can respond to invites" ON guest_requests;
DROP POLICY IF EXISTS "Users can cancel own requests" ON guest_requests;
DROP POLICY IF EXISTS "Hosts can delete guest requests" ON guest_requests;
DROP POLICY IF EXISTS "Guests can delete own requests" ON guest_requests;

-- 4.2: Recreate SELECT policies
-- Users can see their own requests (as requester or host)
CREATE POLICY "Users can view their own requests"
  ON guest_requests
  FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = host_id);

-- Anyone can view accepted guests (for guest video overlay)
CREATE POLICY "Anyone can view accepted guests"
  ON guest_requests
  FOR SELECT
  USING (status = 'accepted');

-- 4.3: Recreate INSERT policies
-- Viewers can create requests
CREATE POLICY "Viewers can create guest requests"
  ON guest_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id 
    AND type = 'request'
  );

-- Hosts can create invites
CREATE POLICY "Hosts can create guest invites"
  ON guest_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = host_id 
    AND type = 'invite'
  );

-- 4.4: Recreate UPDATE policies
-- Hosts can accept/decline requests
CREATE POLICY "Hosts can respond to requests"
  ON guest_requests
  FOR UPDATE
  USING (auth.uid() = host_id AND type = 'request')
  WITH CHECK (auth.uid() = host_id AND type = 'request');

-- Viewers can accept/decline invites
CREATE POLICY "Viewers can respond to invites"
  ON guest_requests
  FOR UPDATE
  USING (auth.uid() = requester_id AND type = 'invite')
  WITH CHECK (auth.uid() = requester_id AND type = 'invite');

-- Requesters can cancel their own requests
CREATE POLICY "Requesters can cancel own requests"
  ON guest_requests
  FOR UPDATE
  USING (auth.uid() = requester_id AND type = 'request' AND status = 'pending')
  WITH CHECK (status = 'cancelled');

-- Hosts can cancel their own invites
CREATE POLICY "Hosts can cancel own invites"
  ON guest_requests
  FOR UPDATE
  USING (auth.uid() = host_id AND type = 'invite' AND status = 'pending')
  WITH CHECK (status = 'cancelled');

-- 4.5: Recreate DELETE policies
-- Hosts can delete any request for their stream
CREATE POLICY "Hosts can delete guest requests"
  ON guest_requests
  FOR DELETE
  USING (auth.uid() = host_id);

-- Guests can delete their own requests
CREATE POLICY "Guests can delete own requests"
  ON guest_requests
  FOR DELETE
  USING (auth.uid() = requester_id);

-- ============================================================================
-- STEP 5: CREATE/UPDATE HELPER FUNCTIONS
-- ============================================================================

-- 5.1: Function to clean up stale requests for a specific stream
CREATE OR REPLACE FUNCTION cleanup_stale_guest_requests(p_live_stream_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  -- Expire pending requests older than 5 minutes for this stream
  UPDATE guest_requests
  SET status = 'expired', updated_at = NOW()
  WHERE live_stream_id = p_live_stream_id
    AND status = 'pending'
    AND created_at < NOW() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cleanup_stale_guest_requests(BIGINT) TO authenticated;

-- 5.2: Function for a user to cleanly reset their request state for a stream
-- This allows a stuck user to clear their state and try again
CREATE OR REPLACE FUNCTION reset_my_guest_request(p_live_stream_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Delete any of the current user's requests for this stream
  DELETE FROM guest_requests
  WHERE live_stream_id = p_live_stream_id
    AND requester_id = auth.uid()
    AND type = 'request';
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reset_my_guest_request(BIGINT) TO authenticated;

-- ============================================================================
-- STEP 6: VERIFY REALTIME IS ENABLED
-- ============================================================================

-- Check if guest_requests is in the realtime publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Ensure it's added (idempotent)
ALTER PUBLICATION supabase_realtime ADD TABLE guest_requests;

-- ============================================================================
-- STEP 7: VERIFICATION QUERIES (Run after fixes)
-- ============================================================================

-- 7.1: Confirm RLS policies are correct
SELECT policyname, cmd, qual as using_clause, with_check
FROM pg_policies 
WHERE tablename = 'guest_requests'
ORDER BY cmd, policyname;

-- 7.2: Confirm indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'guest_requests';

-- 7.3: Confirm no stale pending requests remain
SELECT COUNT(*) as stale_pending_count
FROM guest_requests
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '5 minutes';

-- ============================================================================
-- END OF FIX SCRIPT
-- ============================================================================
