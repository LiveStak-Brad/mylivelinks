#!/bin/bash
# =====================================================
# Reports + Moderation System - Git Commit Script
# Agent B: P0 Reports Pipeline
# =====================================================

set -e

echo "🚀 Agent B: Reports + Moderation - Commit Script"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from project root"
  exit 1
fi

echo "📋 Files to commit:"
echo ""
echo "Schema:"
echo "  - supabase/migrations/20251229_reports_moderation_schema.sql"
echo ""
echo "API Endpoints:"
echo "  - app/api/admin/reports/route.ts (updated)"
echo "  - app/api/admin/reports/[id]/route.ts (new)"
echo "  - app/api/admin/reports/[id]/status/route.ts (new)"
echo "  - app/api/admin/moderation/action/route.ts (new)"
echo "  - app/api/admin/reports/resolve/route.ts (deleted)"
echo ""
echo "Documentation:"
echo "  - REPORTS_MODERATION_DELIVERABLE.md"
echo "  - REPORTS_MODERATION_VERIFICATION.md"
echo "  - sql/test_reports_moderation.sql"
echo ""

# Commit 1: Schema
echo "📦 Commit 1: feat(reports): add reports + moderation schema"
git add supabase/migrations/20251229_reports_moderation_schema.sql
git commit -m "feat(reports): add reports + moderation schema

- Add content_reports table (report tracking)
- Add moderation_actions table (action history)
- Add user_sanctions table (enforcement state)
- Add admin_audit_log table (audit trail)
- Add RLS policies (admin-only access)
- Add RPC functions:
  - admin_log_action() - audit logging
  - apply_moderation_action() - moderation workflow
  - update_report_status() - report status updates
- Add content_reports_with_details view

Tables:
- content_reports: reporter_profile_id, target_profile_id, type, severity, status
- moderation_actions: action_type, duration_minutes, expires_at
- user_sanctions: muted_until, banned_until, monetization_disabled
- admin_audit_log: actor_profile_id, action, target_type, target_id

All tables have RLS enabled (admin-only).
All write operations log to admin_audit_log.

Agent B: P0 Reports Pipeline"

echo "✅ Commit 1 complete"
echo ""

# Commit 2: API
echo "📦 Commit 2: feat(reports): wire admin reports endpoints + actions"
git add \
  app/api/admin/reports/route.ts \
  app/api/admin/reports/[id]/route.ts \
  app/api/admin/reports/[id]/status/route.ts \
  app/api/admin/moderation/action/route.ts

# Check if resolve endpoint exists before trying to remove it
if [ -f "app/api/admin/reports/resolve/route.ts" ]; then
  git rm app/api/admin/reports/resolve/route.ts
fi

git commit -m "feat(reports): wire admin reports endpoints + actions

API Endpoints:
- GET /api/admin/reports - list reports (filter by status, severity)
- GET /api/admin/reports/:id - report detail + related messages
- POST /api/admin/reports/:id/status - update report status
- POST /api/admin/moderation/action - take moderation action

Behavior:
- All endpoints require admin auth (requireAdmin)
- Consistent JSON responses with reqId
- Never returns HTML errors
- Calls admin_log_action() for audit trail
- Related messages fetched from chat_messages if available

Moderation actions:
- warn, mute, timeout, ban, unban
- remove_monetization, restore_monetization
- Writes to moderation_actions + user_sanctions
- Auto-calculates expires_at from duration_minutes

Deleted:
- app/api/admin/reports/resolve/route.ts (replaced by status endpoint)

Agent B: P0 Reports Pipeline"

echo "✅ Commit 2 complete"
echo ""

# Commit 3: Documentation
echo "📦 Commit 3: docs(reports): add verification guide and deliverable"
git add \
  REPORTS_MODERATION_DELIVERABLE.md \
  REPORTS_MODERATION_VERIFICATION.md \
  sql/test_reports_moderation.sql

git commit -m "docs(reports): add verification guide and deliverable

- REPORTS_MODERATION_DELIVERABLE.md - complete implementation summary
- REPORTS_MODERATION_VERIFICATION.md - curl commands + SQL queries
- sql/test_reports_moderation.sql - test data and verification queries

Includes:
- Full curl examples for all endpoints
- SQL verification queries
- Testing checklist
- Error handling details

Agent B: P0 Reports Pipeline"

echo "✅ Commit 3 complete"
echo ""

echo "🎉 All commits complete!"
echo ""
echo "Summary:"
echo "  - 3 commits created"
echo "  - Schema: 1 migration file"
echo "  - API: 4 endpoints (1 updated, 3 new, 1 deleted)"
echo "  - Docs: 3 files"
echo ""
echo "Next steps:"
echo "  1. Push to remote: git push origin main"
echo "  2. Apply migration: Run supabase/migrations/20251229_reports_moderation_schema.sql"
echo "  3. Test endpoints: See REPORTS_MODERATION_VERIFICATION.md"
echo "  4. Verify with SQL: Run sql/test_reports_moderation.sql"
echo ""
echo "✅ Agent B: Reports + Moderation - COMPLETE"


