-- ============================================================================
-- GUEST REQUESTS SYSTEM
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Create the guest_requests table
CREATE TABLE IF NOT EXISTS public.guest_requests (
  id BIGSERIAL PRIMARY KEY,
  live_stream_id BIGINT NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('request', 'invite')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  has_camera BOOLEAN DEFAULT true,
  has_mic BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  
  -- Prevent duplicate pending requests from same user to same stream
  CONSTRAINT unique_pending_request UNIQUE (live_stream_id, requester_id, type, status)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_guest_requests_live_stream_id ON public.guest_requests(live_stream_id);
CREATE INDEX IF NOT EXISTS idx_guest_requests_requester_id ON public.guest_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_guest_requests_host_id ON public.guest_requests(host_id);
CREATE INDEX IF NOT EXISTS idx_guest_requests_status ON public.guest_requests(status);
CREATE INDEX IF NOT EXISTS idx_guest_requests_pending ON public.guest_requests(live_stream_id, status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.guest_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can view requests where they are the requester or host
CREATE POLICY "Users can view their own requests"
  ON public.guest_requests
  FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = host_id);

-- Viewers can create requests (type = 'request')
CREATE POLICY "Viewers can create guest requests"
  ON public.guest_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id 
    AND type = 'request'
  );

-- Hosts can create invites (type = 'invite')
CREATE POLICY "Hosts can create guest invites"
  ON public.guest_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = host_id 
    AND type = 'invite'
  );

-- Hosts can update requests (accept/decline viewer requests)
CREATE POLICY "Hosts can respond to requests"
  ON public.guest_requests
  FOR UPDATE
  USING (auth.uid() = host_id AND type = 'request')
  WITH CHECK (auth.uid() = host_id AND type = 'request');

-- Viewers can update invites (accept/decline host invites)
CREATE POLICY "Viewers can respond to invites"
  ON public.guest_requests
  FOR UPDATE
  USING (auth.uid() = requester_id AND type = 'invite')
  WITH CHECK (auth.uid() = requester_id AND type = 'invite');

-- Users can cancel their own pending requests/invites
CREATE POLICY "Users can cancel own requests"
  ON public.guest_requests
  FOR UPDATE
  USING (
    (auth.uid() = requester_id AND type = 'request')
    OR (auth.uid() = host_id AND type = 'invite')
  )
  WITH CHECK (
    status = 'cancelled'
  );

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_requests;

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_guest_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status != OLD.status AND NEW.status IN ('accepted', 'declined') THEN
    NEW.responded_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_guest_requests_updated_at ON public.guest_requests;
CREATE TRIGGER trigger_guest_requests_updated_at
  BEFORE UPDATE ON public.guest_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_guest_request_updated_at();

-- Function to expire old pending requests (run periodically or on demand)
CREATE OR REPLACE FUNCTION expire_old_guest_requests()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.guest_requests
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION expire_old_guest_requests() TO authenticated;

-- ============================================================================
-- VERIFICATION QUERY (run after to confirm)
-- ============================================================================
-- SELECT 
--   table_name, 
--   column_name, 
--   data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'guest_requests'
-- ORDER BY ordinal_position;
