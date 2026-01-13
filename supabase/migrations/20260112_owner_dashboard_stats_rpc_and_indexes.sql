-- ============================================================================
-- Owner Dashboard: canonical stats RPC + required indexes
-- Fixes inflated "active users" counts after room_presence became per-room scoped.
-- Makes /api/owner/summary resilient and fast by ensuring the DB can compute
-- aggregates efficiently and correctly.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Performance indexes (migrate from sql/owner_dashboard_indexes.sql into Supabase)
-- ----------------------------------------------------------------------------

-- Profiles by creation date (new users 24h)
CREATE INDEX IF NOT EXISTS idx_profiles_created_at
ON public.profiles(created_at DESC);

-- Optional tables: create indexes only if the table exists (keeps migrations resilient
-- in dev environments / partial schemas).
DO $$
BEGIN
  IF to_regclass('public.room_presence') IS NOT NULL THEN
    -- Room presence by last seen + profile (active users distinct)
    -- Needed because room_presence is keyed by (profile_id, room_id) and a single user
    -- can have multiple rows across rooms. Stats must count DISTINCT profile_id.
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_room_presence_last_seen_profile ON public.room_presence(last_seen_at DESC, profile_id)';
  END IF;

  IF to_regclass('public.room_presence') IS NOT NULL THEN
    -- Keep the existing per-room helper index (may already exist via other migrations)
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_room_presence_room_last_seen ON public.room_presence(room_id, last_seen_at DESC)';
  END IF;

  IF to_regclass('public.live_streams') IS NOT NULL THEN
    -- Live streams availability
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_live_streams_live_available ON public.live_streams(live_available) WHERE live_available = true';
  END IF;

  IF to_regclass('public.ledger_entries') IS NOT NULL THEN
    -- Ledger entries (revenue and gifts)
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ledger_entries_revenue ON public.ledger_entries(entry_type, created_at DESC) WHERE entry_type = ''coin_purchase''';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ledger_entries_gifts ON public.ledger_entries(entry_type, created_at DESC) WHERE entry_type = ''coin_spend_gift''';
  END IF;

  IF to_regclass('public.content_reports') IS NOT NULL THEN
    -- Content reports (pending + recent)
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_content_reports_status_pending ON public.content_reports(status) WHERE status = ''pending''';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_content_reports_created ON public.content_reports(created_at DESC)';
  END IF;

  IF to_regclass('public.room_applications') IS NOT NULL THEN
    -- Room applications (pending)
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_room_applications_status_pending ON public.room_applications(status) WHERE status = ''pending''';
  END IF;

  IF to_regclass('public.feature_flags') IS NOT NULL THEN
    -- Feature flags (recent)
    -- Note: feature_flags uses last_changed_at in this repo (not updated_at).
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'feature_flags'
        AND column_name = 'last_changed_at'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_feature_flags_last_changed_at ON public.feature_flags(last_changed_at DESC)';
    ELSIF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'feature_flags'
        AND column_name = 'updated_at'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_feature_flags_updated ON public.feature_flags(updated_at DESC)';
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Canonical owner dashboard stats RPC (single-row)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.owner_dashboard_stats_v1()
RETURNS TABLE (
  generated_at timestamptz,
  users_total bigint,
  users_new_24h bigint,
  users_active_24h bigint,
  users_active_7d bigint,
  profiles_total bigint,
  streams_live bigint,
  gifts_today_count bigint,
  gifts_today_coins bigint,
  reports_pending bigint,
  applications_pending bigint,
  revenue_today_usd_cents bigint,
  revenue_30d_usd_cents bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_now timestamptz := now();
  v_since_24h timestamptz := v_now - interval '24 hours';
  v_since_7d timestamptz := v_now - interval '7 days';
  v_start_of_day timestamptz := date_trunc('day', v_now);
  v_since_30d timestamptz := v_now - interval '30 days';

  v_users_total bigint := 0;
  v_users_new_24h bigint := 0;
  v_users_active_24h bigint := 0;
  v_users_active_7d bigint := 0;
  v_profiles_total bigint := 0;
  v_streams_live bigint := 0;
  v_gifts_today_count bigint := 0;
  v_gifts_today_coins bigint := 0;
  v_reports_pending bigint := 0;
  v_applications_pending bigint := 0;
  v_revenue_today_usd_cents bigint := 0;
  v_revenue_30d_usd_cents bigint := 0;
BEGIN
  -- Authorization: allow service_role (server) or a real owner user.
  IF auth.role() <> 'service_role' AND public.is_owner(auth.uid()) IS NOT TRUE THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Users / profiles
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM public.profiles' INTO v_users_total;
    EXECUTE 'SELECT COUNT(*) FROM public.profiles WHERE created_at >= $1' INTO v_users_new_24h USING v_since_24h;
    v_profiles_total := v_users_total;
  END IF;

  -- Active users (distinct profile_id across all rooms)
  IF to_regclass('public.room_presence') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(DISTINCT profile_id) FROM public.room_presence WHERE last_seen_at >= $1'
      INTO v_users_active_24h
      USING v_since_24h;

    EXECUTE 'SELECT COUNT(DISTINCT profile_id) FROM public.room_presence WHERE last_seen_at >= $1'
      INTO v_users_active_7d
      USING v_since_7d;
  END IF;

  -- Streams live
  IF to_regclass('public.live_streams') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM public.live_streams WHERE live_available = true'
      INTO v_streams_live;
  END IF;

  -- Gifts + revenue (from ledger)
  IF to_regclass('public.ledger_entries') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM public.ledger_entries WHERE created_at >= $1 AND entry_type = $2'
      INTO v_gifts_today_count
      USING v_start_of_day, 'coin_spend_gift';

    EXECUTE 'SELECT COALESCE(SUM(ABS(COALESCE(delta_coins, 0))), 0) FROM public.ledger_entries WHERE created_at >= $1 AND entry_type = $2'
      INTO v_gifts_today_coins
      USING v_start_of_day, 'coin_spend_gift';

    EXECUTE 'SELECT COALESCE(SUM(COALESCE(amount_usd_cents, 0)), 0) FROM public.ledger_entries WHERE created_at >= $1 AND entry_type = $2'
      INTO v_revenue_today_usd_cents
      USING v_start_of_day, 'coin_purchase';

    EXECUTE 'SELECT COALESCE(SUM(COALESCE(amount_usd_cents, 0)), 0) FROM public.ledger_entries WHERE created_at >= $1 AND entry_type = $2'
      INTO v_revenue_30d_usd_cents
      USING v_since_30d, 'coin_purchase';
  END IF;

  -- Pending reports
  IF to_regclass('public.content_reports') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM public.content_reports WHERE status IN (''pending'',''open'',''under_review'')'
      INTO v_reports_pending;
  ELSIF to_regclass('public.reports') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM public.reports WHERE status IN (''pending'',''open'',''under_review'')'
      INTO v_reports_pending;
  END IF;

  -- Pending applications
  IF to_regclass('public.room_applications') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM public.room_applications WHERE status = ''pending'''
      INTO v_applications_pending;
  ELSIF to_regclass('public.applications') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM public.applications WHERE status = ''pending'''
      INTO v_applications_pending;
  END IF;

  generated_at := v_now;
  users_total := COALESCE(v_users_total, 0);
  users_new_24h := COALESCE(v_users_new_24h, 0);
  users_active_24h := COALESCE(v_users_active_24h, 0);
  users_active_7d := COALESCE(v_users_active_7d, 0);
  profiles_total := COALESCE(v_profiles_total, 0);
  streams_live := COALESCE(v_streams_live, 0);
  gifts_today_count := COALESCE(v_gifts_today_count, 0);
  gifts_today_coins := COALESCE(v_gifts_today_coins, 0);
  reports_pending := COALESCE(v_reports_pending, 0);
  applications_pending := COALESCE(v_applications_pending, 0);
  revenue_today_usd_cents := COALESCE(v_revenue_today_usd_cents, 0);
  revenue_30d_usd_cents := COALESCE(v_revenue_30d_usd_cents, 0);

  RETURN NEXT;
END;
$$;

-- Avoid exposing owner stats function to anonymous callers.
REVOKE ALL ON FUNCTION public.owner_dashboard_stats_v1() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_dashboard_stats_v1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_dashboard_stats_v1() TO service_role;

COMMIT;

