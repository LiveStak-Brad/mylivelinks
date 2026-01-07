-- ============================================================================
-- GUEST REQUESTS - ADD DELETE POLICY
-- Run this AFTER the main APPLY_GUEST_REQUESTS.sql
-- ============================================================================

-- Allow host to delete any guest request for their stream
CREATE POLICY "Hosts can delete guest requests"
  ON public.guest_requests
  FOR DELETE
  USING (auth.uid() = host_id);

-- Allow guests to delete their own requests (to leave cleanly)
CREATE POLICY "Guests can delete own requests"
  ON public.guest_requests
  FOR DELETE
  USING (auth.uid() = requester_id);
