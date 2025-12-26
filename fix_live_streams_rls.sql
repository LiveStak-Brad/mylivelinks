-- ============================================================================
-- FIX RLS POLICIES FOR live_streams TABLE
-- ============================================================================
-- This fixes the 406 (Not Acceptable) errors when querying live_streams
-- The UPDATE policy was missing the FOR UPDATE clause
-- ============================================================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Live streams are viewable by everyone" ON live_streams;
DROP POLICY IF EXISTS "Streamers can update own live_available" ON live_streams;
DROP POLICY IF EXISTS "Streamers can insert own live stream" ON live_streams;

-- RLS Policy 1: Everyone can SELECT live streams (for grid, viewer list, etc.)
-- This allows all users to see who is live_available and their publishing status
CREATE POLICY "Live streams are viewable by everyone"
    ON live_streams FOR SELECT
    USING (true);

-- RLS Policy 2: Streamers can UPDATE their own live_streams record
-- This allows users to set live_available=true/false, update ended_at, etc.
-- CRITICAL: Users can only update their own record (where profile_id matches auth.uid())
CREATE POLICY "Streamers can update own live_available"
    ON live_streams FOR UPDATE
    USING (auth.uid() = profile_id)
    WITH CHECK (auth.uid() = profile_id);

-- RLS Policy 3: Streamers can INSERT their own live_streams record
-- This allows users to create their initial live_streams record when going live
-- CRITICAL: Users can only insert records where profile_id matches auth.uid()
CREATE POLICY "Streamers can insert own live stream"
    ON live_streams FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this, verify with:
-- SELECT * FROM pg_policies WHERE tablename = 'live_streams';
-- 
-- Expected policies:
-- 1. "Live streams are viewable by everyone" - SELECT - USING (true)
-- 2. "Streamers can update own live_available" - UPDATE - USING (auth.uid() = profile_id)
-- 3. "Streamers can insert own live stream" - INSERT - WITH CHECK (auth.uid() = profile_id)
-- ============================================================================





