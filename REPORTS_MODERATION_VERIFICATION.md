# Reports + Moderation System - Verification Guide

## Quick Reference

### Endpoints Created

1. **GET /api/admin/reports** - List all reports (with filtering)
2. **GET /api/admin/reports/:id** - Get report details + related messages
3. **POST /api/admin/reports/:id/status** - Update report status
4. **POST /api/admin/moderation/action** - Take moderation action

---

## curl Commands

### Prerequisites
```bash
# Set your auth token and base URL
export AUTH_TOKEN="your_supabase_jwt_token_here"
export BASE_URL="http://localhost:3000"  # or your deployment URL
```

### 1. List Reports
```bash
# List all open reports
curl -X GET "$BASE_URL/api/admin/reports?status=open&limit=10" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

# List by severity
curl -X GET "$BASE_URL/api/admin/reports?severity=high&limit=10" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"

# Pagination
curl -X GET "$BASE_URL/api/admin/reports?limit=20&offset=20" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "ok": true,
  "reqId": "a1b2c3d4e5f6g7h8",
  "data": {
    "rows": [
      {
        "id": "uuid",
        "reporter_profile_id": "uuid",
        "target_profile_id": "uuid",
        "type": "harassment",
        "severity": "high",
        "status": "open",
        "reason": "User posted inappropriate content",
        "reporter_username": "john_doe",
        "target_username": "bad_actor",
        "created_at": "2025-12-29T12:00:00Z"
      }
    ],
    "total": 15,
    "limit": 10,
    "offset": 0
  }
}
```

### 2. Get Report Details
```bash
# Replace REPORT_ID with actual UUID
export REPORT_ID="your-report-uuid-here"

curl -X GET "$BASE_URL/api/admin/reports/$REPORT_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "ok": true,
  "reqId": "...",
  "data": {
    "report": {
      "id": "uuid",
      "type": "spam",
      "severity": "medium",
      "status": "open",
      "reason": "Spamming chat with links",
      "reporter_username": "alice",
      "target_username": "spammer123",
      "created_at": "2025-12-29T10:00:00Z"
    },
    "relatedMessages": [
      {
        "id": "msg-uuid",
        "profile_id": "uuid",
        "content": "Buy my product here: spam.link",
        "created_at": "2025-12-29T09:55:00Z"
      }
    ],
    "moderationActions": []
  }
}
```

### 3. Update Report Status
```bash
# Mark report as under review
curl -X POST "$BASE_URL/api/admin/reports/$REPORT_ID/status" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "under_review",
    "admin_note": "Investigating this case"
  }'

# Resolve report
curl -X POST "$BASE_URL/api/admin/reports/$REPORT_ID/status" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved",
    "admin_note": "User warned and content removed"
  }'

# Dismiss report
curl -X POST "$BASE_URL/api/admin/reports/$REPORT_ID/status" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "dismissed",
    "admin_note": "Not a violation"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "reqId": "...",
  "data": {
    "success": true
  }
}
```

### 4. Take Moderation Actions

#### Warn User
```bash
export TARGET_PROFILE_ID="offender-uuid-here"

curl -X POST "$BASE_URL/api/admin/moderation/action" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_profile_id": "'"$TARGET_PROFILE_ID"'",
    "action_type": "warn",
    "reason": "First warning for inappropriate behavior",
    "report_id": "'"$REPORT_ID"'"
  }'
```

#### Mute User (temporary)
```bash
curl -X POST "$BASE_URL/api/admin/moderation/action" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_profile_id": "'"$TARGET_PROFILE_ID"'",
    "action_type": "mute",
    "duration_minutes": 60,
    "reason": "Spamming chat - 1 hour mute",
    "report_id": "'"$REPORT_ID"'"
  }'
```

#### Timeout User (1 day)
```bash
curl -X POST "$BASE_URL/api/admin/moderation/action" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_profile_id": "'"$TARGET_PROFILE_ID"'",
    "action_type": "timeout",
    "duration_minutes": 1440,
    "reason": "Harassment - 24 hour timeout",
    "report_id": "'"$REPORT_ID"'"
  }'
```

#### Ban User (7 days)
```bash
curl -X POST "$BASE_URL/api/admin/moderation/action" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_profile_id": "'"$TARGET_PROFILE_ID"'",
    "action_type": "ban",
    "duration_minutes": 10080,
    "reason": "Severe violation - 7 day ban",
    "report_id": "'"$REPORT_ID"'",
    "metadata": {
      "severity": "high",
      "violation_count": 3
    }
  }'
```

#### Remove Monetization
```bash
curl -X POST "$BASE_URL/api/admin/moderation/action" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_profile_id": "'"$TARGET_PROFILE_ID"'",
    "action_type": "remove_monetization",
    "reason": "Multiple violations - monetization disabled",
    "report_id": "'"$REPORT_ID"'"
  }'
```

#### Unban User
```bash
curl -X POST "$BASE_URL/api/admin/moderation/action" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_profile_id": "'"$TARGET_PROFILE_ID"'",
    "action_type": "unban",
    "reason": "Appeal approved - ban lifted"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "reqId": "...",
  "data": {
    "action_id": "action-uuid",
    "success": true
  }
}
```

---

## SQL Verification Queries

### Check Reports Exist
```sql
-- Count reports by status
SELECT status, COUNT(*) as count
FROM content_reports
GROUP BY status
ORDER BY count DESC;

-- List recent reports
SELECT 
  id,
  type,
  severity,
  status,
  reporter_profile_id,
  target_profile_id,
  created_at
FROM content_reports
ORDER BY created_at DESC
LIMIT 10;
```

### Check Moderation Actions Exist
```sql
-- Count actions by type
SELECT action_type, COUNT(*) as count
FROM moderation_actions
GROUP BY action_type
ORDER BY count DESC;

-- List recent moderation actions
SELECT 
  id,
  action_type,
  target_profile_id,
  duration_minutes,
  reason,
  created_at
FROM moderation_actions
ORDER BY created_at DESC
LIMIT 10;
```

### Check User Sanctions
```sql
-- List all active sanctions
SELECT 
  target_profile_id,
  muted_until,
  banned_until,
  monetization_disabled,
  updated_at
FROM user_sanctions
WHERE 
  muted_until > NOW() OR
  banned_until > NOW() OR
  monetization_disabled = TRUE;

-- Check specific user sanctions
SELECT 
  us.*,
  p.username,
  p.display_name
FROM user_sanctions us
JOIN profiles p ON p.id = us.target_profile_id
WHERE us.target_profile_id = 'your-target-profile-id';
```

### Check Audit Log
```sql
-- List recent admin actions
SELECT 
  id,
  actor_profile_id,
  action,
  target_type,
  target_id,
  metadata,
  created_at
FROM admin_audit_log
ORDER BY created_at DESC
LIMIT 20;

-- Count actions by actor
SELECT 
  p.username,
  aal.action,
  COUNT(*) as count
FROM admin_audit_log aal
JOIN profiles p ON p.id = aal.actor_profile_id
GROUP BY p.username, aal.action
ORDER BY count DESC;
```

### Verify Report → Action → Sanction Flow
```sql
-- Full flow for a specific report
SELECT 
  cr.id as report_id,
  cr.type as report_type,
  cr.status as report_status,
  ma.action_type,
  ma.duration_minutes,
  us.muted_until,
  us.banned_until,
  us.monetization_disabled
FROM content_reports cr
LEFT JOIN moderation_actions ma ON ma.report_id = cr.id
LEFT JOIN user_sanctions us ON us.target_profile_id = cr.target_profile_id
WHERE cr.id = 'your-report-id'
ORDER BY ma.created_at DESC;
```

### Test Data Insertion (for testing)
```sql
-- Insert test report
INSERT INTO content_reports (
  reporter_profile_id,
  target_profile_id,
  type,
  severity,
  reason,
  status
) VALUES (
  (SELECT id FROM profiles WHERE username = 'admin_user' LIMIT 1),
  (SELECT id FROM profiles WHERE username = 'test_user' LIMIT 1),
  'spam',
  'medium',
  'Testing reports system',
  'open'
) RETURNING id;
```

---

## Error Handling

All endpoints return consistent error format:

```json
{
  "ok": false,
  "error": "Error message here",
  "reqId": "unique-request-id"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (invalid parameters)
- `401` - Unauthorized (no auth token)
- `403` - Forbidden (not admin)
- `404` - Not found (report doesn't exist)
- `500` - Server error

---

## Testing Checklist

- [ ] List reports returns `{ ok: true, data: { rows, total } }`
- [ ] Filter by status works (open, under_review, resolved, dismissed)
- [ ] Filter by severity works (low, medium, high, critical)
- [ ] Pagination works (limit, offset)
- [ ] Report detail includes relatedMessages (if message_id/stream_id present)
- [ ] Status update writes to content_reports
- [ ] Status update writes to admin_audit_log
- [ ] Moderation action writes to moderation_actions
- [ ] Moderation action updates user_sanctions
- [ ] Moderation action writes to admin_audit_log
- [ ] Expired sanctions (muted_until, banned_until) are not enforced
- [ ] SQL queries verify rows exist in all tables

---

## Notes

- All endpoints require admin authentication (`requireAdmin` middleware)
- All write operations log to `admin_audit_log` automatically
- Moderation actions with duration create `expires_at` timestamp
- User sanctions are denormalized for fast enforcement checks
- RLS policies ensure only admins can access these tables


