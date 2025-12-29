-- ============================================================================
-- Owner Dashboard Summary - Performance Indexes
-- ============================================================================
-- These indexes optimize the /api/owner/summary endpoint for < 500ms response
-- All indexes use IF NOT EXISTS to safely re-run this script
-- ============================================================================

-- ============================================================================
-- HIGH PRIORITY (P0) - Critical for performance
-- ============================================================================

-- Profiles by creation date (for new users count in last 24h)
CREATE INDEX IF NOT EXISTS idx_profiles_created_at 
ON profiles(created_at DESC);

-- Room presence by last seen (for active users in 24h/7d)
-- Composite index supports both filtering and counting distinct profile_ids
CREATE INDEX IF NOT EXISTS idx_room_presence_last_seen_profile 
ON room_presence(last_seen_at DESC, profile_id);

-- Live streams by availability (for quick count of live streams)
-- Partial index only on live streams for efficiency
CREATE INDEX IF NOT EXISTS idx_live_streams_live_available 
ON live_streams(live_available) 
WHERE live_available = true;

-- Live streams by status and start time (for live streams list)
-- Used when fetching recent live streams ordered by start time
-- Note: Query joins with profiles and rooms tables via foreign keys
CREATE INDEX IF NOT EXISTS idx_live_streams_status_started 
ON live_streams(status, started_at DESC)
WHERE status = 'live';

-- Foreign key index for live streams host lookup
-- Improves join performance with profiles table
CREATE INDEX IF NOT EXISTS idx_live_streams_host_id 
ON live_streams(host_id);

-- Foreign key index for live streams room lookup  
-- Improves join performance with rooms table
CREATE INDEX IF NOT EXISTS idx_live_streams_room_id 
ON live_streams(room_id);

-- Ledger entries for revenue calculations (CRITICAL)
-- Composite index for filtering by type and ordering by date
-- Partial index only on coin purchases for efficiency
CREATE INDEX IF NOT EXISTS idx_ledger_entries_revenue 
ON ledger_entries(entry_type, created_at DESC)
WHERE entry_type = 'coin_purchase';

-- ============================================================================
-- MEDIUM PRIORITY (P1) - Improves secondary queries
-- ============================================================================

-- Content reports by status (for pending reports count)
-- Partial index only on pending reports for efficiency
CREATE INDEX IF NOT EXISTS idx_content_reports_status_pending 
ON content_reports(status)
WHERE status = 'pending';

-- Content reports by creation date (for recent reports list)
-- Used when fetching and ordering recent reports
CREATE INDEX IF NOT EXISTS idx_content_reports_created 
ON content_reports(created_at DESC);

-- Room applications by status (for pending applications count)
-- Partial index only on pending applications for efficiency
CREATE INDEX IF NOT EXISTS idx_room_applications_status_pending 
ON room_applications(status)
WHERE status = 'pending';

-- Feature flags by update time (for feature flags list)
-- Used when fetching and ordering feature flags
CREATE INDEX IF NOT EXISTS idx_feature_flags_updated 
ON feature_flags(updated_at DESC);

-- ============================================================================
-- VERIFY INDEXES
-- ============================================================================

-- Run this query to verify all indexes were created:
-- SELECT schemaname, tablename, indexname 
-- FROM pg_indexes 
-- WHERE indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;

-- ============================================================================
-- PERFORMANCE TESTING
-- ============================================================================

-- Test profile creation date query:
-- EXPLAIN ANALYZE SELECT COUNT(*) FROM profiles WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Test room presence query:
-- EXPLAIN ANALYZE SELECT COUNT(DISTINCT profile_id) FROM room_presence WHERE last_seen_at >= NOW() - INTERVAL '24 hours';

-- Test live streams query:
-- EXPLAIN ANALYZE SELECT COUNT(*) FROM live_streams WHERE live_available = true;

-- Test ledger entries query:
-- EXPLAIN ANALYZE SELECT amount_usd_cents FROM ledger_entries WHERE entry_type = 'coin_purchase' AND created_at >= NOW() - INTERVAL '30 days' LIMIT 5000;

-- Test content reports query:
-- EXPLAIN ANALYZE SELECT COUNT(*) FROM content_reports WHERE status = 'pending';

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. All indexes use IF NOT EXISTS for safe re-application
-- 2. Partial indexes (WHERE clauses) reduce index size and improve performance
-- 3. DESC ordering on date columns optimizes recent-first queries
-- 4. Composite indexes support multiple query patterns
-- 5. Monitor index usage with: pg_stat_user_indexes view
-- 6. Expected improvement: 10-50x faster queries on large tables

