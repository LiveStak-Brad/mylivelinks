-- =====================================================
-- Reports + Moderation - Quick Test Data & Verification
-- =====================================================
-- Run these queries to test the reports/moderation system

-- ======================
-- 1. INSERT TEST DATA
-- ======================

-- Insert test report (replace usernames with actual users in your DB)
INSERT INTO content_reports (
  reporter_profile_id,
  target_profile_id,
  type,
  severity,
  reason,
  status
) VALUES (
  (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1),  -- reporter
  (SELECT id FROM profiles WHERE username = 'testuser' LIMIT 1),  -- target
  'spam',
  'medium',
  'Test report - spamming chat with links',
  'open'
) RETURNING id, created_at;

-- Insert test report with message_id (if chat_messages exists)
INSERT INTO content_reports (
  reporter_profile_id,
  target_profile_id,
  message_id,
  type,
  severity,
  reason,
  status
) VALUES (
  (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1),
  (SELECT id FROM profiles WHERE username = 'testuser' LIMIT 1),
  (SELECT id FROM chat_messages ORDER BY created_at DESC LIMIT 1),
  'harassment',
  'high',
  'Test report - inappropriate message',
  'open'
) RETURNING id, created_at;

-- ======================
-- 2. VERIFY REPORTS
-- ======================

-- Count reports by status
SELECT status, COUNT(*) as count
FROM content_reports
GROUP BY status
ORDER BY count DESC;

-- List all reports with details
SELECT 
  id,
  type,
  severity,
  status,
  reporter_username,
  target_username,
  reason,
  created_at
FROM content_reports_with_details
ORDER BY created_at DESC
LIMIT 20;

-- Get specific report
SELECT * FROM content_reports_with_details
WHERE id = 'YOUR_REPORT_ID_HERE';

-- ======================
-- 3. TEST RPC: UPDATE REPORT STATUS
-- ======================

SELECT update_report_status(
  p_report_id := 'YOUR_REPORT_ID_HERE',
  p_actor_profile_id := (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1),
  p_status := 'under_review',
  p_admin_note := 'Investigating this case'
);

-- ======================
-- 4. TEST RPC: APPLY MODERATION ACTION
-- ======================

-- Test: Mute user for 60 minutes
SELECT apply_moderation_action(
  p_report_id := 'YOUR_REPORT_ID_HERE',
  p_actor_profile_id := (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1),
  p_target_profile_id := (SELECT id FROM profiles WHERE username = 'testuser' LIMIT 1),
  p_action_type := 'mute',
  p_duration_minutes := 60,
  p_reason := 'Test mute - 60 minutes',
  p_metadata := '{"test": true}'::jsonb
);

-- Test: Ban user for 24 hours
SELECT apply_moderation_action(
  p_report_id := 'YOUR_REPORT_ID_HERE',
  p_actor_profile_id := (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1),
  p_target_profile_id := (SELECT id FROM profiles WHERE username = 'testuser' LIMIT 1),
  p_action_type := 'ban',
  p_duration_minutes := 1440,
  p_reason := 'Test ban - 24 hours',
  p_metadata := NULL
);

-- Test: Remove monetization
SELECT apply_moderation_action(
  p_report_id := 'YOUR_REPORT_ID_HERE',
  p_actor_profile_id := (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1),
  p_target_profile_id := (SELECT id FROM profiles WHERE username = 'testuser' LIMIT 1),
  p_action_type := 'remove_monetization',
  p_duration_minutes := NULL,
  p_reason := 'Multiple violations',
  p_metadata := '{"violation_count": 3}'::jsonb
);

-- Test: Warn user (no enforcement)
SELECT apply_moderation_action(
  p_report_id := 'YOUR_REPORT_ID_HERE',
  p_actor_profile_id := (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1),
  p_target_profile_id := (SELECT id FROM profiles WHERE username = 'testuser' LIMIT 1),
  p_action_type := 'warn',
  p_duration_minutes := NULL,
  p_reason := 'First warning',
  p_metadata := NULL
);

-- ======================
-- 5. VERIFY MODERATION ACTIONS
-- ======================

-- Count actions by type
SELECT action_type, COUNT(*) as count
FROM moderation_actions
GROUP BY action_type
ORDER BY count DESC;

-- List recent moderation actions
SELECT 
  ma.id,
  ma.action_type,
  ma.duration_minutes,
  ma.reason,
  target.username as target_username,
  actor.username as actor_username,
  ma.created_at,
  ma.expires_at
FROM moderation_actions ma
JOIN profiles target ON target.id = ma.target_profile_id
JOIN profiles actor ON actor.id = ma.actor_profile_id
ORDER BY ma.created_at DESC
LIMIT 20;

-- Actions for specific report
SELECT 
  ma.*,
  actor.username as actor_username,
  target.username as target_username
FROM moderation_actions ma
JOIN profiles actor ON actor.id = ma.actor_profile_id
JOIN profiles target ON target.id = ma.target_profile_id
WHERE ma.report_id = 'YOUR_REPORT_ID_HERE'
ORDER BY ma.created_at DESC;

-- ======================
-- 6. VERIFY USER SANCTIONS
-- ======================

-- List all active sanctions
SELECT 
  us.target_profile_id,
  p.username,
  p.display_name,
  us.muted_until,
  us.banned_until,
  us.monetization_disabled,
  us.updated_at,
  -- Show if still active
  CASE 
    WHEN us.muted_until > NOW() THEN 'MUTED'
    WHEN us.banned_until > NOW() THEN 'BANNED'
    WHEN us.monetization_disabled THEN 'MONETIZATION_DISABLED'
    ELSE 'NO_ACTIVE_SANCTIONS'
  END as current_status
FROM user_sanctions us
JOIN profiles p ON p.id = us.target_profile_id
ORDER BY us.updated_at DESC;

-- Check specific user sanctions
SELECT 
  us.*,
  p.username,
  CASE WHEN us.muted_until > NOW() THEN TRUE ELSE FALSE END as is_currently_muted,
  CASE WHEN us.banned_until > NOW() THEN TRUE ELSE FALSE END as is_currently_banned
FROM user_sanctions us
JOIN profiles p ON p.id = us.target_profile_id
WHERE p.username = 'testuser';

-- ======================
-- 7. VERIFY AUDIT LOG
-- ======================

-- Count actions by type
SELECT action, COUNT(*) as count
FROM admin_audit_log
GROUP BY action
ORDER BY count DESC;

-- List recent audit entries
SELECT 
  aal.id,
  p.username as actor_username,
  aal.action,
  aal.target_type,
  aal.target_id,
  aal.metadata,
  aal.created_at
FROM admin_audit_log aal
JOIN profiles p ON p.id = aal.actor_profile_id
ORDER BY aal.created_at DESC
LIMIT 20;

-- Audit trail for specific actor
SELECT 
  aal.action,
  aal.target_type,
  aal.metadata,
  aal.created_at
FROM admin_audit_log aal
WHERE aal.actor_profile_id = (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1)
ORDER BY aal.created_at DESC
LIMIT 20;

-- ======================
-- 8. FULL FLOW VERIFICATION
-- ======================

-- Complete report → action → sanction flow for a report
SELECT 
  cr.id as report_id,
  cr.type as report_type,
  cr.severity as report_severity,
  cr.status as report_status,
  cr.created_at as reported_at,
  ma.action_type,
  ma.duration_minutes,
  ma.reason as action_reason,
  ma.created_at as action_taken_at,
  us.muted_until,
  us.banned_until,
  us.monetization_disabled,
  CASE 
    WHEN us.muted_until > NOW() THEN 'CURRENTLY_MUTED'
    WHEN us.banned_until > NOW() THEN 'CURRENTLY_BANNED'
    WHEN us.monetization_disabled THEN 'MONETIZATION_DISABLED'
    ELSE 'NO_ACTIVE_SANCTIONS'
  END as sanction_status
FROM content_reports cr
LEFT JOIN moderation_actions ma ON ma.report_id = cr.id
LEFT JOIN user_sanctions us ON us.target_profile_id = cr.target_profile_id
WHERE cr.id = 'YOUR_REPORT_ID_HERE'
ORDER BY ma.created_at DESC;

-- ======================
-- 9. CLEANUP TEST DATA (OPTIONAL)
-- ======================

-- WARNING: This deletes test data. Only run if you want to clean up.

-- Delete test reports (adjust WHERE clause as needed)
-- DELETE FROM content_reports 
-- WHERE reason LIKE 'Test report%';

-- Delete test moderation actions
-- DELETE FROM moderation_actions 
-- WHERE reason LIKE 'Test%';

-- Delete test sanctions for specific user
-- DELETE FROM user_sanctions 
-- WHERE target_profile_id = (SELECT id FROM profiles WHERE username = 'testuser' LIMIT 1);

-- Delete test audit log entries
-- DELETE FROM admin_audit_log 
-- WHERE action LIKE '%test%' 
-- OR metadata->>'test' = 'true';

-- ======================
-- 10. PERFORMANCE CHECKS
-- ======================

-- Check table sizes
SELECT 
  'content_reports' as table_name,
  COUNT(*) as row_count
FROM content_reports
UNION ALL
SELECT 
  'moderation_actions',
  COUNT(*)
FROM moderation_actions
UNION ALL
SELECT 
  'user_sanctions',
  COUNT(*)
FROM user_sanctions
UNION ALL
SELECT 
  'admin_audit_log',
  COUNT(*)
FROM admin_audit_log;

-- Check index usage (PostgreSQL specific)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE tablename IN ('content_reports', 'moderation_actions', 'user_sanctions', 'admin_audit_log')
ORDER BY tablename, idx_scan DESC;

-- ======================
-- 11. HELPER QUERIES
-- ======================

-- Get all reports for a specific user (as target)
SELECT 
  cr.*,
  reporter.username as reporter_username,
  reviewer.username as reviewer_username
FROM content_reports cr
JOIN profiles reporter ON reporter.id = cr.reporter_profile_id
LEFT JOIN profiles reviewer ON reviewer.id = cr.reviewed_by
WHERE cr.target_profile_id = (SELECT id FROM profiles WHERE username = 'testuser' LIMIT 1)
ORDER BY cr.created_at DESC;

-- Get all moderation actions for a specific user
SELECT 
  ma.*,
  actor.username as actor_username
FROM moderation_actions ma
JOIN profiles actor ON actor.id = ma.actor_profile_id
WHERE ma.target_profile_id = (SELECT id FROM profiles WHERE username = 'testuser' LIMIT 1)
ORDER BY ma.created_at DESC;

-- Get reports that need review (open status, no reviewer)
SELECT 
  id,
  type,
  severity,
  reporter_username,
  target_username,
  created_at
FROM content_reports_with_details
WHERE status = 'open'
AND reviewed_by IS NULL
ORDER BY 
  CASE severity 
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  created_at ASC;

-- Get expired sanctions (need cleanup)
SELECT 
  target_profile_id,
  p.username,
  CASE 
    WHEN muted_until IS NOT NULL AND muted_until < NOW() THEN 'MUTE_EXPIRED'
    WHEN banned_until IS NOT NULL AND banned_until < NOW() THEN 'BAN_EXPIRED'
  END as expired_sanction,
  muted_until,
  banned_until
FROM user_sanctions us
JOIN profiles p ON p.id = us.target_profile_id
WHERE (muted_until IS NOT NULL AND muted_until < NOW())
   OR (banned_until IS NOT NULL AND banned_until < NOW());


