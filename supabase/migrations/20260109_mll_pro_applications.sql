-- =============================================================================
-- MLL PRO Applications System
-- =============================================================================
-- Stores MLL PRO applications with consent tracking and owner review workflow
-- =============================================================================

BEGIN;

-- Create mll_pro_applications table
CREATE TABLE IF NOT EXISTS public.mll_pro_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Review workflow
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewing', 'approved', 'declined')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  
  -- Identity / Contact
  display_name TEXT NOT NULL,
  mll_username TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  timezone TEXT,
  
  -- Streaming background
  currently_streaming BOOLEAN NOT NULL,
  platforms JSONB, -- [{platform: string, username: string}]
  streaming_duration TEXT,
  categories JSONB, -- array of strings
  schedule TEXT,
  avg_stream_length TEXT,
  avg_viewers TEXT,
  strengths TEXT,
  
  -- Growth intent
  growth_plan TEXT,
  promotion_methods JSONB, -- array of strings
  will_share_link BOOLEAN,
  community_goal TEXT,
  
  -- Referral + participation
  invited_already BOOLEAN,
  invited_count INTEGER,
  referral_info TEXT,
  
  -- Quality / standards
  fit_reason TEXT,
  vod_links JSONB, -- array of strings
  agrees_to_standards BOOLEAN NOT NULL,
  
  -- Email consent
  consent_transactional BOOLEAN NOT NULL DEFAULT true,
  consent_updates BOOLEAN NOT NULL DEFAULT false,
  opt_out_marketing BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  meta JSONB
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mll_pro_applications_status ON public.mll_pro_applications(status);
CREATE INDEX IF NOT EXISTS idx_mll_pro_applications_email ON public.mll_pro_applications(email);
CREATE INDEX IF NOT EXISTS idx_mll_pro_applications_created_at ON public.mll_pro_applications(created_at DESC);

-- Add comments
COMMENT ON TABLE public.mll_pro_applications IS 'MLL PRO program applications with consent tracking';
COMMENT ON COLUMN public.mll_pro_applications.status IS 'Application status: submitted, reviewing, approved, declined';
COMMENT ON COLUMN public.mll_pro_applications.consent_transactional IS 'User consents to receive application decision emails';
COMMENT ON COLUMN public.mll_pro_applications.consent_updates IS 'User wants MLL PRO program updates';
COMMENT ON COLUMN public.mll_pro_applications.opt_out_marketing IS 'User opts out of marketing emails (transactional still allowed)';

-- =============================================================================
-- RLS Policies
-- =============================================================================

-- Enable RLS
ALTER TABLE public.mll_pro_applications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert applications (public form submission)
CREATE POLICY "Anyone can submit MLL PRO applications"
  ON public.mll_pro_applications
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Only authenticated users can view their own applications
CREATE POLICY "Users can view their own applications"
  ON public.mll_pro_applications
  FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Owner/admin can view all applications (will be enforced via service role in API)
-- No direct SELECT policy for all - use service role API routes

-- Owner/admin can update review fields (will be enforced via service role in API)
-- No direct UPDATE policy - use service role API routes

COMMIT;
