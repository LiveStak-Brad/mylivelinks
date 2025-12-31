-- Fix Security Advisor Issues
-- Addresses all errors found in Supabase Security Advisor
-- 1. Removes SECURITY DEFINER from problematic views
-- 2. Enables RLS on all public tables
-- 3. Adds appropriate RLS policies where needed

BEGIN;

-- ============================================================================
-- FIX: Security Definer Views
-- ============================================================================
-- Convert SECURITY DEFINER views to normal views (SECURITY INVOKER)
-- This ensures views run with the privileges of the querying user
-- Strategy: Preserve existing view logic, just change security model

-- Store existing view definitions
DO $$
DECLARE
  v_coin_purchases_def TEXT;
  v_friends_def TEXT;
  v_rooms_effective_def TEXT;
  v_rooms_public_def TEXT;
BEGIN
  -- Get existing view definitions
  SELECT definition INTO v_coin_purchases_def 
  FROM pg_views 
  WHERE schemaname = 'public' AND viewname = 'v_coin_purchases_normalized';
  
  SELECT definition INTO v_friends_def 
  FROM pg_views 
  WHERE schemaname = 'public' AND viewname = 'v_friends';
  
  SELECT definition INTO v_rooms_effective_def 
  FROM pg_views 
  WHERE schemaname = 'public' AND viewname = 'v_rooms_effective';
  
  SELECT definition INTO v_rooms_public_def 
  FROM pg_views 
  WHERE schemaname = 'public' AND viewname = 'v_rooms_public';
  
  RAISE NOTICE 'Found views: v_coin_purchases=%, v_friends=%, v_rooms_effective=%, v_rooms_public=%', 
    (v_coin_purchases_def IS NOT NULL), 
    (v_friends_def IS NOT NULL), 
    (v_rooms_effective_def IS NOT NULL), 
    (v_rooms_public_def IS NOT NULL);
  
  -- Drop and recreate v_coin_purchases_normalized with SECURITY INVOKER
  IF v_coin_purchases_def IS NOT NULL THEN
    RAISE NOTICE 'Recreating v_coin_purchases_normalized';
    EXECUTE 'DROP VIEW IF EXISTS public.v_coin_purchases_normalized CASCADE';
    EXECUTE format('CREATE VIEW public.v_coin_purchases_normalized WITH (security_invoker = true) AS %s', v_coin_purchases_def);
  ELSE
    RAISE NOTICE 'Skipping v_coin_purchases_normalized (does not exist)';
  END IF;
  
  -- Drop and recreate v_friends with SECURITY INVOKER (ONLY IF IT EXISTS)
  IF v_friends_def IS NOT NULL THEN
    RAISE NOTICE 'Recreating v_friends';
    EXECUTE 'DROP VIEW IF EXISTS public.v_friends CASCADE';
    EXECUTE format('CREATE VIEW public.v_friends WITH (security_invoker = true) AS %s', v_friends_def);
  ELSE
    RAISE NOTICE 'Skipping v_friends (does not exist)';
  END IF;
  
  -- Drop dependent views first (ONLY IF THEY EXIST)
  IF v_rooms_public_def IS NOT NULL THEN
    DROP VIEW IF EXISTS public.v_rooms_public CASCADE;
  END IF;
  
  -- Drop and recreate v_rooms_effective with SECURITY INVOKER
  IF v_rooms_effective_def IS NOT NULL THEN
    RAISE NOTICE 'Recreating v_rooms_effective';
    EXECUTE 'DROP VIEW IF EXISTS public.v_rooms_effective CASCADE';
    EXECUTE format('CREATE VIEW public.v_rooms_effective WITH (security_invoker = true) AS %s', v_rooms_effective_def);
  ELSE
    RAISE NOTICE 'Skipping v_rooms_effective (does not exist)';
  END IF;
  
  -- Recreate v_rooms_public with SECURITY INVOKER (ONLY IF IT EXISTS)
  IF v_rooms_public_def IS NOT NULL THEN
    RAISE NOTICE 'Recreating v_rooms_public';
    EXECUTE format('CREATE VIEW public.v_rooms_public WITH (security_invoker = true) AS %s', v_rooms_public_def);
  ELSE
    RAISE NOTICE 'Skipping v_rooms_public (does not exist)';
  END IF;
  
END $$;

-- ============================================================================
-- ENABLE RLS: Core Tables
-- ============================================================================

-- Enable RLS on all tables that need it
ALTER TABLE public.diamond_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifter_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_payout_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_pack_purchases ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: Diamond Wallets
-- ============================================================================

-- Users can view their own diamond wallet
CREATE POLICY "Users can view own diamond wallet"
  ON public.diamond_wallets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all wallets
CREATE POLICY "Admins can view all diamond wallets"
  ON public.diamond_wallets
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- System can update wallets (via service role or SECURITY DEFINER functions)
CREATE POLICY "System can manage diamond wallets"
  ON public.diamond_wallets
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES: Gifter Levels
-- ============================================================================

-- Everyone can view gifter levels (public reference data)
CREATE POLICY "Anyone can view gifter levels"
  ON public.gifter_levels
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only admins can modify gifter levels
CREATE POLICY "Admins can manage gifter levels"
  ON public.gifter_levels
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES: Admin Allowlist
-- ============================================================================

-- Only admins can view the admin allowlist
CREATE POLICY "Admins can view admin allowlist"
  ON public.admin_allowlist
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR profile_id = auth.uid());

-- Only admins can modify the admin allowlist
CREATE POLICY "Admins can manage admin allowlist"
  ON public.admin_allowlist
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES: VIP Unlocks
-- ============================================================================

-- Users can view their own VIP unlocks
CREATE POLICY "Users can view own vip unlocks"
  ON public.vip_unlocks
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all VIP unlocks
CREATE POLICY "Admins can view all vip unlocks"
  ON public.vip_unlocks
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- System can create/update VIP unlocks
CREATE POLICY "System can manage vip unlocks"
  ON public.vip_unlocks
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES: Stripe Events
-- ============================================================================

-- Only admins can view stripe events (sensitive payment data)
CREATE POLICY "Admins can view stripe events"
  ON public.stripe_events
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Only admins and system can insert stripe events
CREATE POLICY "Admins can manage stripe events"
  ON public.stripe_events
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES: Stripe Connected Accounts
-- ============================================================================

-- Users can view their own connected account
CREATE POLICY "Users can view own stripe account"
  ON public.stripe_connected_accounts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all connected accounts
CREATE POLICY "Admins can view all stripe accounts"
  ON public.stripe_connected_accounts
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Users can manage their own connected account
CREATE POLICY "Users can manage own stripe account"
  ON public.stripe_connected_accounts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: Gift Payout Config
-- ============================================================================

-- Everyone can view payout config (public reference data)
CREATE POLICY "Anyone can view gift payout config"
  ON public.gift_payout_config
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only admins can modify payout config
CREATE POLICY "Admins can manage gift payout config"
  ON public.gift_payout_config
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES: Leaderboard Cache
-- ============================================================================

-- Everyone can view leaderboard cache
CREATE POLICY "Anyone can view leaderboard cache"
  ON public.leaderboard_cache
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only system can update leaderboard cache
CREATE POLICY "System can manage leaderboard cache"
  ON public.leaderboard_cache
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES: Withdrawal Config
-- ============================================================================

-- Everyone can view withdrawal config (public reference data)
CREATE POLICY "Anyone can view withdrawal config"
  ON public.withdrawal_config
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Only admins can modify withdrawal config
CREATE POLICY "Admins can manage withdrawal config"
  ON public.withdrawal_config
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES: VIP Pack Purchases
-- ============================================================================

-- Users can view their own VIP pack purchases
CREATE POLICY "Users can view own vip purchases"
  ON public.vip_pack_purchases
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all VIP pack purchases
CREATE POLICY "Admins can view all vip purchases"
  ON public.vip_pack_purchases
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- System can create VIP pack purchases
CREATE POLICY "System can create vip purchases"
  ON public.vip_pack_purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Ensure proper permissions for views (only grant if they exist)
DO $$
BEGIN
  -- Grant on v_coin_purchases_normalized if it exists
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_coin_purchases_normalized') THEN
    GRANT SELECT ON public.v_coin_purchases_normalized TO authenticated, anon;
  END IF;
  
  -- Grant on v_friends if it exists
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_friends') THEN
    GRANT SELECT ON public.v_friends TO authenticated;
  END IF;
  
  -- Grant on v_rooms_effective if it exists
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_rooms_effective') THEN
    GRANT SELECT ON public.v_rooms_effective TO authenticated, anon;
  END IF;
  
  -- Grant on v_rooms_public if it exists
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_rooms_public') THEN
    GRANT SELECT ON public.v_rooms_public TO authenticated, anon;
  END IF;
END $$;

-- Ensure proper permissions for tables
GRANT SELECT ON public.diamond_wallets TO authenticated;
GRANT SELECT ON public.gifter_levels TO authenticated, anon;
GRANT SELECT ON public.admin_allowlist TO authenticated;
GRANT SELECT ON public.vip_unlocks TO authenticated;
GRANT SELECT ON public.stripe_events TO authenticated;
GRANT SELECT ON public.stripe_connected_accounts TO authenticated;
GRANT SELECT ON public.gift_payout_config TO authenticated, anon;
GRANT SELECT ON public.leaderboard_cache TO authenticated, anon;
GRANT SELECT ON public.withdrawal_config TO authenticated, anon;
GRANT SELECT ON public.vip_pack_purchases TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

-- Add comments only for views that exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_coin_purchases_normalized') THEN
    COMMENT ON VIEW public.v_coin_purchases_normalized IS 
      'View of coin purchases with SECURITY INVOKER (runs with caller privileges)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_friends') THEN
    COMMENT ON VIEW public.v_friends IS 
      'View of friends with SECURITY INVOKER (runs with caller privileges)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_rooms_effective') THEN
    COMMENT ON VIEW public.v_rooms_effective IS 
      'View of all rooms with SECURITY INVOKER (runs with caller privileges)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_rooms_public') THEN
    COMMENT ON VIEW public.v_rooms_public IS 
      'View of public rooms only with SECURITY INVOKER (runs with caller privileges)';
  END IF;
END $$;

COMMIT;
