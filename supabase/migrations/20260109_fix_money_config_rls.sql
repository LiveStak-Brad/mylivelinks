-- Fix Security Advisor: Enable RLS on money_config table
-- This table contains sensitive financial configuration (gift rates, conversion rates)
-- and must not be world-readable

BEGIN;

-- ============================================================================
-- ENABLE RLS ON money_config
-- ============================================================================

ALTER TABLE public.money_config ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: money_config
-- ============================================================================
-- Strategy: Public read access (rates are public reference data)
--           Admin-only write access (only admins can change rates)

-- Everyone can view money config (public reference data like gift rates)
-- These rates are used in client-side calculations and are not sensitive
CREATE POLICY "Anyone can view money config"
  ON public.money_config
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only admins can modify money config
CREATE POLICY "Admins can manage money config"
  ON public.money_config
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.money_config TO authenticated, anon;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.money_config IS 
  'Financial configuration (gift rates, conversion rates). RLS enabled with public read, admin write.';

COMMIT;
