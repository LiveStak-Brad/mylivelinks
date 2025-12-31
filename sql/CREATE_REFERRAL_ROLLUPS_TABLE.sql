-- Drop and recreate referral_rollups table with correct schema
DROP TABLE IF EXISTS public.referral_rollups CASCADE;

CREATE TABLE public.referral_rollups (
  referrer_profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_count bigint DEFAULT 0 NOT NULL,
  active bigint DEFAULT 0 NOT NULL,
  last_activity_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index for leaderboard queries
CREATE INDEX idx_referral_rollups_leaderboard 
  ON public.referral_rollups(active DESC, joined_count DESC, last_activity_at DESC, referrer_profile_id ASC);

-- RLS policies
ALTER TABLE public.referral_rollups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view referral rollups" 
  ON public.referral_rollups FOR SELECT 
  TO authenticated, anon
  USING (true);

-- Function to refresh rollups
CREATE OR REPLACE FUNCTION refresh_referral_rollups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO referral_rollups (
    referrer_profile_id,
    joined_count,
    active,
    last_activity_at
  )
  SELECT 
    referred_by as referrer_profile_id,
    COUNT(*) as joined_count,
    COUNT(*) FILTER (WHERE email_verified = true) as active,
    MAX(created_at) as last_activity_at
  FROM profiles
  WHERE referred_by IS NOT NULL
  GROUP BY referred_by
  ON CONFLICT (referrer_profile_id) 
  DO UPDATE SET
    joined_count = EXCLUDED.joined_count,
    active = EXCLUDED.active,
    last_activity_at = EXCLUDED.last_activity_at,
    updated_at = now();
END;
$$;

-- Initial data load
SELECT refresh_referral_rollups();

COMMENT ON TABLE public.referral_rollups IS 'Aggregated referral counts for leaderboard performance';
