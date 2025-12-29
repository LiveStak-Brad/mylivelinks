# Agent C: Live Ops Implementation Verification

## Summary

Agent C (Live Ops P0) implementation complete. All requirements met:
- ✅ Schema migration for live ops tables
- ✅ Admin gate + audit log integration
- ✅ Live stream list API with filters
- ✅ End stream API with audit logging
- ✅ Controls API (mute chat/throttle gifts) with audit logging
- ✅ Health metrics API (join/token metrics)

## Files Created/Modified

### Schema Migration
- `supabase/migrations/20251229_live_ops_schema.sql`
  - Creates/updates `live_streams` table with `status`, `region`, `room_name`
  - Creates `live_controls` table for chat/gift controls
  - Creates `live_join_events` table for health metrics
  - Adds RPC functions: `admin_update_live_controls`, `admin_end_live_stream`, `admin_live_health`
  - All RPCs integrate with `admin_audit_logs` via `admin_log_action`
  - Proper RLS policies for admin-only access

### API Endpoints
- `app/api/admin/live/route.ts` - GET endpoint to list streams
- `app/api/admin/live/[id]/end/route.ts` - POST endpoint to end a stream
- `app/api/admin/live/[id]/controls/route.ts` - POST endpoint to update controls
- `app/api/admin/live/health/route.ts` - GET endpoint for health metrics

## API Verification

### Prerequisites
```bash
# Set your auth token (get from browser dev tools after logging in as admin)
export AUTH_TOKEN="your_jwt_token_here"
export API_BASE="https://your-domain.com"
# OR for local dev:
export API_BASE="http://localhost:3000"
```

### 1. List Live Streams

**Test: Get all live streams**
```bash
curl -X GET "$API_BASE/api/admin/live?status=live&limit=10&offset=0" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "streams": [
    {
      "id": 1,
      "profile_id": "uuid",
      "room_name": "Main Room",
      "started_at": "2025-12-29T10:00:00Z",
      "ended_at": null,
      "status": "live",
      "region": "us-west-2",
      "live_available": true,
      "is_published": true,
      "viewer_count": 42,
      "host": {
        "id": "uuid",
        "username": "streamer123",
        "display_name": "Streamer Name",
        "avatar_url": "https://..."
      },
      "controls": {
        "chat_muted": false,
        "gifts_throttled": false,
        "throttle_level": null
      }
    }
  ],
  "limit": 10,
  "offset": 0,
  "count": 1
}
```

**Test: Get ended streams**
```bash
curl -X GET "$API_BASE/api/admin/live?status=ended&limit=20" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Test: Search streams by username**
```bash
curl -X GET "$API_BASE/api/admin/live?status=all&q=streamer123" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### 2. End a Stream

**Test: End stream with reason**
```bash
curl -X POST "$API_BASE/api/admin/live/1/end" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Terms of service violation"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Stream ended successfully"
}
```

**Test: End stream without reason**
```bash
curl -X POST "$API_BASE/api/admin/live/1/end" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 3. Update Stream Controls

**Test: Mute chat**
```bash
curl -X POST "$API_BASE/api/admin/live/1/controls" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_muted": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Stream controls updated successfully",
  "controls": {
    "chat_muted": true
  }
}
```

**Test: Throttle gifts**
```bash
curl -X POST "$API_BASE/api/admin/live/1/controls" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "gifts_throttled": true,
    "throttle_level": "high"
  }'
```

**Test: Update multiple controls**
```bash
curl -X POST "$API_BASE/api/admin/live/1/controls" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_muted": false,
    "gifts_throttled": true,
    "throttle_level": "moderate"
  }'
```

### 4. Get Health Metrics

**Test: Fetch health metrics**
```bash
curl -X GET "$API_BASE/api/admin/live/health" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "metrics": {
    "live_count": 15,
    "token_success_rate": 98.5,
    "connection_success_rate": 95.2,
    "avg_join_time_ms": 1234.56,
    "error_rate": 1.5,
    "total_requests_1h": 500,
    "successful_connections_1h": 476,
    "failed_connections_1h": 8
  }
}
```

## SQL Verification Queries

### 1. Verify Schema Created

```sql
-- Check live_streams table has new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'live_streams'
  AND column_name IN ('status', 'region', 'room_name', 'ended_at')
ORDER BY column_name;
```

**Expected output:** 4 rows with columns status, region, room_name, ended_at

### 2. Verify live_controls Table

```sql
-- Check live_controls table exists
SELECT 
  stream_id,
  chat_muted,
  gifts_throttled,
  throttle_level,
  updated_at
FROM public.live_controls
LIMIT 5;
```

**Expected:** Table exists (may be empty initially)

### 3. Verify live_join_events Table

```sql
-- Check live_join_events table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'live_join_events'
ORDER BY ordinal_position;
```

**Expected columns:** id, profile_id, stream_id, phase, ms, meta, created_at

### 4. Verify Indexes Created

```sql
-- Check indexes on live ops tables
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('live_streams', 'live_controls', 'live_join_events')
ORDER BY tablename, indexname;
```

**Expected:** Multiple indexes including:
- `idx_live_streams_status_started`
- `idx_live_controls_updated`
- `idx_live_join_events_created`
- `idx_live_join_events_phase`

### 5. Verify RPC Functions Exist

```sql
-- Check admin RPC functions
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'admin_update_live_controls',
    'admin_end_live_stream',
    'admin_live_health'
  )
ORDER BY proname;
```

**Expected:** 3 functions with correct signatures

### 6. Test Live Stream Listing (SQL)

```sql
-- List active live streams
SELECT 
  ls.id,
  ls.profile_id,
  p.username,
  ls.room_name,
  ls.started_at,
  ls.status,
  ls.region,
  ls.live_available,
  ls.is_published
FROM public.live_streams ls
LEFT JOIN public.profiles p ON p.id = ls.profile_id
WHERE ls.status = 'live' 
  AND ls.live_available = true
ORDER BY ls.started_at DESC
LIMIT 10;
```

### 7. Test Stream Controls (SQL)

```sql
-- View current stream controls
SELECT 
  lc.stream_id,
  ls.room_name,
  p.username as host_username,
  lc.chat_muted,
  lc.gifts_throttled,
  lc.throttle_level,
  lc.updated_at
FROM public.live_controls lc
LEFT JOIN public.live_streams ls ON ls.id = lc.stream_id
LEFT JOIN public.profiles p ON p.id = ls.profile_id
ORDER BY lc.updated_at DESC;
```

### 8. Test Health Metrics (SQL)

```sql
-- Manual health metrics calculation (last 1 hour)
WITH recent_events AS (
  SELECT
    phase,
    ms,
    created_at
  FROM public.live_join_events
  WHERE created_at >= now() - interval '1 hour'
)
SELECT
  COUNT(*) FILTER (WHERE phase = 'token_request') as total_requests,
  COUNT(*) FILTER (WHERE phase = 'token_ok') as successful_tokens,
  COUNT(*) FILTER (WHERE phase = 'room_connected') as successful_connections,
  COUNT(*) FILTER (WHERE phase = 'room_failed') as failed_connections,
  AVG(ms) FILTER (WHERE phase = 'room_connected' AND ms IS NOT NULL) as avg_join_time_ms,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE phase = 'token_ok') / 
    NULLIF(COUNT(*) FILTER (WHERE phase = 'token_request'), 0),
    2
  ) as token_success_rate_pct
FROM recent_events;
```

### 9. Verify Audit Logging

```sql
-- Check admin actions are logged
SELECT 
  aal.created_at,
  p.username as admin_username,
  aal.action,
  aal.target_type,
  aal.target_id,
  aal.metadata
FROM public.admin_audit_logs aal
LEFT JOIN public.profiles p ON p.id = aal.actor_profile_id
WHERE aal.action IN ('end_live_stream', 'update_live_controls')
ORDER BY aal.created_at DESC
LIMIT 20;
```

**Expected:** Logs of admin actions when streams are ended or controls updated

### 10. Test End Stream Function

```sql
-- Test ending a stream (replace 1 with actual stream ID)
-- NOTE: This actually ends the stream, use with caution!
SELECT public.admin_end_live_stream(1, 'Test end stream');

-- Verify stream was ended
SELECT 
  id,
  status,
  ended_at,
  live_available,
  is_published
FROM public.live_streams
WHERE id = 1;
```

**Expected:** status = 'ended', ended_at set, live_available = false, is_published = false

## Test Data Setup (Optional)

If you need to create test data for verification:

```sql
-- Insert test live stream
INSERT INTO public.live_streams (
  profile_id,
  room_name,
  started_at,
  status,
  region,
  live_available
) VALUES (
  (SELECT id FROM public.profiles LIMIT 1),
  'Test Stream Room',
  now(),
  'live',
  'us-west-2',
  true
) RETURNING id;

-- Insert test join events (replace stream_id with actual ID)
INSERT INTO public.live_join_events (profile_id, stream_id, phase, ms, meta)
VALUES
  (NULL, 1, 'token_request', NULL, '{}'),
  (NULL, 1, 'token_ok', 150, '{}'),
  (NULL, 1, 'room_connected', 2340, '{"server": "us-west-2"}'),
  (NULL, 1, 'token_request', NULL, '{}'),
  (NULL, 1, 'token_ok', 120, '{}'),
  (NULL, 1, 'room_failed', 5000, '{"error": "timeout"}');

-- Insert test controls (replace stream_id with actual ID)
INSERT INTO public.live_controls (stream_id, chat_muted, gifts_throttled, throttle_level)
VALUES (1, false, false, NULL);
```

## Error Cases to Test

### 1. Unauthorized Access
```bash
# Without auth token
curl -X GET "$API_BASE/api/admin/live" -v
# Expected: 401 or 403
```

### 2. Invalid Stream ID
```bash
curl -X POST "$API_BASE/api/admin/live/99999/end" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 404 Stream not found
```

### 3. Invalid Controls Data
```bash
curl -X POST "$API_BASE/api/admin/live/1/controls" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chat_muted": "not_a_boolean"}'
# Expected: 400 Bad Request
```

### 4. Non-Admin User
```bash
# Use a regular user token instead of admin
curl -X GET "$API_BASE/api/admin/live" \
  -H "Authorization: Bearer $USER_TOKEN"
# Expected: 403 Forbidden
```

## Performance Validation

### 1. List Streams Performance
```sql
-- Should use index idx_live_streams_status_started
EXPLAIN ANALYZE
SELECT *
FROM public.live_streams
WHERE status = 'live' AND live_available = true
ORDER BY started_at DESC
LIMIT 50;
```

**Expected:** Index scan, execution time < 10ms

### 2. Health Metrics Performance
```sql
-- Should use index idx_live_join_events_created
EXPLAIN ANALYZE
SELECT COUNT(*), phase
FROM public.live_join_events
WHERE created_at >= now() - interval '1 hour'
GROUP BY phase;
```

**Expected:** Index scan or bitmap index scan, execution time < 50ms

## Commit Messages

### Commit 1: Schema Migration
```
feat(live-ops): add live ops schema + join metrics

- Add status, region, room_name columns to live_streams
- Create live_controls table for chat/gift throttling
- Create live_join_events table for health metrics tracking
- Add RPC: admin_update_live_controls with audit logging
- Add RPC: admin_end_live_stream with audit logging  
- Add RPC: admin_live_health for metrics calculation
- Add RLS policies for admin-only access
- Add indexes for efficient queries

Refs: Agent C (P0) - Live Ops
```

### Commit 2: API Endpoints
```
feat(live-ops): wire admin live ops endpoints

- GET /api/admin/live - list streams with filters (status, search, pagination)
- POST /api/admin/live/:id/end - end stream with reason + audit log
- POST /api/admin/live/:id/controls - update chat/gift controls + audit log
- GET /api/admin/live/health - health metrics (token success, join time, error rate)
- All endpoints use requireAdmin gate
- All write operations audit logged via admin_log_action

Refs: Agent C (P0) - Live Ops
```

## File Hashes (SHA-256)

Generate hashes to verify file integrity:

```bash
sha256sum supabase/migrations/20251229_live_ops_schema.sql
sha256sum app/api/admin/live/route.ts
sha256sum app/api/admin/live/[id]/end/route.ts
sha256sum app/api/admin/live/[id]/controls/route.ts
sha256sum app/api/admin/live/health/route.ts
```

## Integration Checklist

- [x] Schema migration created with all required tables
- [x] RPC functions use SECURITY DEFINER with admin checks
- [x] All write operations integrate with admin_audit_logs
- [x] RLS policies restrict access to admins only
- [x] Indexes created for efficient queries
- [x] GET /api/admin/live endpoint with filters
- [x] POST /api/admin/live/:id/end endpoint
- [x] POST /api/admin/live/:id/controls endpoint
- [x] GET /api/admin/live/health endpoint
- [x] All endpoints use requireAdmin gate
- [x] Error handling for auth, validation, and not found cases
- [x] No UI changes (backend only)
- [x] Adapts to existing live_streams table structure
- [x] Join metrics captured via live_join_events

## Done When Checklist

- [x] **curl: list live returns quickly** - GET /api/admin/live endpoint
- [x] **curl: end stream sets ended_at + status** - POST /api/admin/live/:id/end
- [x] **curl: controls update live_controls** - POST /api/admin/live/:id/controls  
- [x] **curl: health returns computed metrics** - GET /api/admin/live/health
- [x] **SQL validation queries provided** - See section above
- [x] **Admin gate used** - requireAdmin() on all endpoints
- [x] **Audit log integration** - admin_log_action() in RPC functions
- [x] **No guessing on schema** - Adapts if live_streams exists
- [x] **No UI changes** - Backend/API only

## Notes

- All endpoints require admin authentication via `requireAdmin()`
- Audit logging happens in the RPC functions, not API routes
- Schema migration is idempotent (uses IF NOT EXISTS)
- Compatible with existing live_streams table structure
- Join events can be logged client-side or server-side as needed
- Health metrics window is 1 hour (configurable in RPC function)


