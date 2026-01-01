-- ============================================================================
-- FIX: Gift sending error - "no unique or exclusion constraint matching ON CONFLICT"
-- ============================================================================
-- Problem: send_gift_v2 uses ON CONFLICT (idempotency_key) but the unique
-- constraint might be missing from ledger_entries table
-- ============================================================================

-- MOVED: This file is now tracked under supabase/migrations/20260101_fix_gift_on_conflict_error.sql
