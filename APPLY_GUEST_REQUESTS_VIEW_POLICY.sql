-- ============================================================================
-- GUEST REQUESTS - ADD VIEW ALL ACCEPTED GUESTS POLICY
-- Run this AFTER the main APPLY_GUEST_REQUESTS.sql
-- This allows all users to see accepted guests for any stream (for the overlay)
-- ============================================================================

-- Allow anyone to view accepted guests for any stream
-- This is needed so viewers can see the guest overlay with all guests
CREATE POLICY "Anyone can view accepted guests"
  ON public.guest_requests
  FOR SELECT
  USING (status = 'accepted');
