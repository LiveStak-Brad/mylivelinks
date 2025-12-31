-- Fix Security Advisor Issues - PHASE 1
-- This migration ONLY fixes the Security Definer views and enables RLS
-- Policies will be added in a follow-up migration after verifying column names

BEGIN;

-- ============================================================================
-- FIX: Security Definer Views
-- ============================================================================
-- Convert SECURITY DEFINER views to normal views (SECURITY INVOKER)

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
  
  -- Drop and recreate v_coin_purchases_normalized with SECURITY INVOKER
  IF v_coin_purchases_def IS NOT NULL THEN
    EXECUTE 'DROP VIEW IF EXISTS public.v_coin_purchases_normalized CASCADE';
    EXECUTE format('CREATE VIEW public.v_coin_purchases_normalized WITH (security_invoker = true) AS %s', v_coin_purchases_def);
  END IF;
  
  -- Drop and recreate v_friends with SECURITY INVOKER
  IF v_friends_def IS NOT NULL THEN
    EXECUTE 'DROP VIEW IF EXISTS public.v_friends CASCADE';
    EXECUTE format('CREATE VIEW public.v_friends WITH (security_invoker = true) AS %s', v_friends_def);
  END IF;
  
  -- Drop dependent views first
  DROP VIEW IF EXISTS public.v_rooms_public CASCADE;
  
  -- Drop and recreate v_rooms_effective with SECURITY INVOKER
  IF v_rooms_effective_def IS NOT NULL THEN
    EXECUTE 'DROP VIEW IF EXISTS public.v_rooms_effective CASCADE';
    EXECUTE format('CREATE VIEW public.v_rooms_effective WITH (security_invoker = true) AS %s', v_rooms_effective_def);
  END IF;
  
  -- Recreate v_rooms_public with SECURITY INVOKER
  IF v_rooms_public_def IS NOT NULL THEN
    EXECUTE format('CREATE VIEW public.v_rooms_public WITH (security_invoker = true) AS %s', v_rooms_public_def);
  END IF;
  
END $$;

-- Grant necessary permissions for views
GRANT SELECT ON public.v_coin_purchases_normalized TO authenticated, anon;
GRANT SELECT ON public.v_friends TO authenticated;
GRANT SELECT ON public.v_rooms_effective TO authenticated, anon;
GRANT SELECT ON public.v_rooms_public TO authenticated, anon;

-- ============================================================================
-- ENABLE RLS: Core Tables
-- ============================================================================
-- Just enable RLS on all tables (policies will be added in phase 2)

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
-- TEMPORARY PERMISSIVE POLICIES
-- ============================================================================
-- Add very permissive policies temporarily so nothing breaks
-- These will be tightened in phase 2 after verifying column names

-- Allow admins full access to everything (safe fallback)
DO $$
BEGIN
  -- Diamond wallets
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diamond_wallets' AND policyname = 'Admin full access') THEN
    CREATE POLICY "Admin full access" ON public.diamond_wallets FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  
  -- Gifter levels (read-only for all, write for admins)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gifter_levels' AND policyname = 'Public read') THEN
    CREATE POLICY "Public read" ON public.gifter_levels FOR SELECT TO authenticated, anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gifter_levels' AND policyname = 'Admin write') THEN
    CREATE POLICY "Admin write" ON public.gifter_levels FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  
  -- Admin allowlist (admin only)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_allowlist' AND policyname = 'Admin only') THEN
    CREATE POLICY "Admin only" ON public.admin_allowlist FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  
  -- VIP unlocks (admin access)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vip_unlocks' AND policyname = 'Admin full access') THEN
    CREATE POLICY "Admin full access" ON public.vip_unlocks FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  
  -- Stripe events (admin only)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stripe_events' AND policyname = 'Admin only') THEN
    CREATE POLICY "Admin only" ON public.stripe_events FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  
  -- Stripe connected accounts (admin access)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stripe_connected_accounts' AND policyname = 'Admin full access') THEN
    CREATE POLICY "Admin full access" ON public.stripe_connected_accounts FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  
  -- Gift payout config (public read, admin write)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gift_payout_config' AND policyname = 'Public read') THEN
    CREATE POLICY "Public read" ON public.gift_payout_config FOR SELECT TO authenticated, anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gift_payout_config' AND policyname = 'Admin write') THEN
    CREATE POLICY "Admin write" ON public.gift_payout_config FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  
  -- Leaderboard cache (public read, admin write)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leaderboard_cache' AND policyname = 'Public read') THEN
    CREATE POLICY "Public read" ON public.leaderboard_cache FOR SELECT TO authenticated, anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leaderboard_cache' AND policyname = 'Admin write') THEN
    CREATE POLICY "Admin write" ON public.leaderboard_cache FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  
  -- Withdrawal config (public read, admin write)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'withdrawal_config' AND policyname = 'Public read') THEN
    CREATE POLICY "Public read" ON public.withdrawal_config FOR SELECT TO authenticated, anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'withdrawal_config' AND policyname = 'Admin write') THEN
    CREATE POLICY "Admin write" ON public.withdrawal_config FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  
  -- VIP pack purchases (admin access for now)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vip_pack_purchases' AND policyname = 'Admin full access') THEN
    CREATE POLICY "Admin full access" ON public.vip_pack_purchases FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
  END IF;
  
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW public.v_coin_purchases_normalized IS 
  'View of coin purchases with SECURITY INVOKER (runs with caller privileges)';

COMMENT ON VIEW public.v_friends IS 
  'View of friends with SECURITY INVOKER (runs with caller privileges)';

COMMENT ON VIEW public.v_rooms_effective IS 
  'View of all rooms with SECURITY INVOKER (runs with caller privileges)';

COMMENT ON VIEW public.v_rooms_public IS 
  'View of public rooms only with SECURITY INVOKER (runs with caller privileges)';

COMMIT;
