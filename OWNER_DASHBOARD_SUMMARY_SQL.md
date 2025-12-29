# Owner Dashboard Summary - SQL Queries & Performance

## Summary

This document outlines the SQL queries used by `/api/owner/summary` and provides index recommendations for optimal performance.

## Queries Used

### 1. Total Users Count
```sql
SELECT COUNT(*) FROM profiles;
```
**Usage:** Returns total user count  
**Performance:** Fast with primary key index

### 2. New Users (24h)
```sql
SELECT COUNT(*) FROM profiles
WHERE created_at >= NOW() - INTERVAL '24 hours';
```
**Usage:** Returns users created in last 24 hours  
**Index needed:** `profiles(created_at)`

### 3. Active Users (24h)
```sql
SELECT COUNT(DISTINCT profile_id) FROM room_presence
WHERE last_seen_at >= NOW() - INTERVAL '24 hours';
```
**Usage:** Returns unique users active in last 24 hours  
**Index needed:** `room_presence(last_seen_at, profile_id)`

### 4. Active Users (7d)
```sql
SELECT COUNT(DISTINCT profile_id) FROM room_presence
WHERE last_seen_at >= NOW() - INTERVAL '7 days';
```
**Usage:** Returns unique users active in last 7 days  
**Index needed:** `room_presence(last_seen_at, profile_id)`

### 5. Live Streams Count
```sql
SELECT COUNT(*) FROM live_streams
WHERE live_available = true;
```
**Usage:** Returns current active live stream count  
**Index needed:** `live_streams(live_available)`

### 6. Pending Reports Count
```sql
SELECT COUNT(*) FROM content_reports
WHERE status = 'pending';
```
**Usage:** Returns count of pending reports  
**Index needed:** `content_reports(status)`

### 7. Pending Applications Count
```sql
SELECT COUNT(*) FROM room_applications
WHERE status = 'pending';
```
**Usage:** Returns count of pending room applications  
**Index needed:** `room_applications(status)`

### 8. Revenue Today (Ledger)
```sql
SELECT amount_usd_cents, created_at, entry_type
FROM ledger_entries
WHERE created_at >= DATE_TRUNC('day', NOW())
  AND entry_type = 'coin_purchase'
LIMIT 5000;
```
**Usage:** Sums up coin purchases from today  
**Index needed:** `ledger_entries(entry_type, created_at)`

### 9. Revenue 30d (Ledger)
```sql
SELECT amount_usd_cents, created_at, entry_type
FROM ledger_entries
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND entry_type = 'coin_purchase'
LIMIT 5000;
```
**Usage:** Sums up coin purchases from last 30 days  
**Index needed:** `ledger_entries(entry_type, created_at)`

### 10. Live Streams List (NEW - Just Implemented)
```sql
SELECT 
  ls.id,
  ls.room_id,
  ls.title,
  ls.status,
  ls.started_at,
  ls.ended_at,
  ls.viewer_count,
  ls.peak_viewer_count,
  ls.is_recording,
  p.id as host_id,
  p.username as host_username,
  p.display_name as host_display_name,
  p.avatar_url as host_avatar_url,
  r.slug as room_slug
FROM live_streams ls
LEFT JOIN profiles p ON ls.host_id = p.id
LEFT JOIN rooms r ON ls.room_id = r.id
WHERE ls.status = 'live'
ORDER BY ls.started_at DESC
LIMIT 25;
```
**Usage:** Returns current live streams for dashboard  
**Index needed:** `live_streams(status, started_at DESC)` WHERE status = 'live'

### 11. Recent Reports
```sql
SELECT 
  cr.id,
  cr.report_type,
  cr.report_reason,
  cr.report_details,
  cr.status,
  cr.created_at,
  cr.reviewed_at,
  cr.reviewed_by,
  cr.admin_notes,
  reporter.username as reporter_username,
  reporter.display_name as reporter_display_name,
  reporter.avatar_url as reporter_avatar_url,
  reported.id as reported_user_id,
  reported.username as reported_user_username,
  reported.display_name as reported_user_display_name,
  reported.avatar_url as reported_user_avatar_url
FROM content_reports cr
LEFT JOIN profiles reporter ON cr.reporter_id = reporter.id
LEFT JOIN profiles reported ON cr.reported_user_id = reported.id
ORDER BY cr.created_at DESC
LIMIT 25
OFFSET 0;
```
**Usage:** Returns recent reports for dashboard  
**Index needed:** `content_reports(created_at DESC)`

### 12. Feature Flags
```sql
SELECT key, description, scope, enabled, value_json, updated_at
FROM feature_flags
ORDER BY updated_at DESC
LIMIT 50;
```
**Usage:** Returns feature flags configuration  
**Index needed:** `feature_flags(updated_at DESC)`

### 13. System Health Checks
```sql
-- Database health
SELECT id FROM profiles LIMIT 0;

-- Storage health
-- (Via Supabase Storage API: listBuckets())
```
**Usage:** Checks database and storage connectivity  
**Performance:** Fast lightweight queries

## Recommended Indexes

### High Priority (P0)
These indexes are critical for < 500ms response time:

```sql
-- Profiles by creation date (for new users count)
CREATE INDEX IF NOT EXISTS idx_profiles_created_at 
ON profiles(created_at DESC);

-- Room presence by last seen (for active users)
CREATE INDEX IF NOT EXISTS idx_room_presence_last_seen 
ON room_presence(last_seen_at DESC, profile_id);

-- Live streams by availability (for live count and list)
CREATE INDEX IF NOT EXISTS idx_live_streams_live_available 
ON live_streams(live_available) 
WHERE live_available = true;

-- Live streams by status and start time (for live list)
CREATE INDEX IF NOT EXISTS idx_live_streams_status_started 
ON live_streams(status, started_at DESC)
WHERE status = 'live';

-- Ledger entries for revenue (critical for performance)
CREATE INDEX IF NOT EXISTS idx_ledger_entries_revenue 
ON ledger_entries(entry_type, created_at DESC)
WHERE entry_type = 'coin_purchase';
```

### Medium Priority (P1)
These indexes improve performance for secondary data:

```sql
-- Content reports by status
CREATE INDEX IF NOT EXISTS idx_content_reports_status 
ON content_reports(status)
WHERE status = 'pending';

-- Content reports by creation date
CREATE INDEX IF NOT EXISTS idx_content_reports_created 
ON content_reports(created_at DESC);

-- Room applications by status
CREATE INDEX IF NOT EXISTS idx_room_applications_status 
ON room_applications(status)
WHERE status = 'pending';

-- Feature flags by update time
CREATE INDEX IF NOT EXISTS idx_feature_flags_updated 
ON feature_flags(updated_at DESC);
```

## Performance Targets

- **Overall Response Time:** < 500ms (P95)
- **Database Queries:** < 300ms total (P95)
- **Each Individual Query:** < 50ms (P95)

## Current Performance Notes

1. **Timeout Protection:** Endpoint has 9000ms timeout with graceful degradation
2. **Parallel Execution:** Stats, health, flags, and reports are fetched in parallel
3. **Error Handling:** Individual query failures don't crash the entire endpoint
4. **Schema Validation:** Response is validated against Zod schema before returning

## Monitoring Recommendations

Monitor these metrics:
- Response time percentiles (P50, P95, P99)
- Individual query execution times
- Error rates for each data source
- Timeout occurrences
- Cache hit rates (if caching added later)

## Future Optimizations

1. **Materialized Views:** Consider for aggregate stats (total users, revenue)
2. **Read Replicas:** Route heavy analytical queries to read replica
3. **Caching:** Add Redis cache with 30-60 second TTL for dashboard data
4. **Query Batching:** Use Supabase RPC functions to batch related queries
5. **Incremental Updates:** For trend calculations, store previous day's values

## Testing Queries

To test index effectiveness, use EXPLAIN ANALYZE:

```sql
EXPLAIN ANALYZE
SELECT COUNT(*) FROM profiles
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

Target: Seq Scan → Index Scan with < 10ms execution time

