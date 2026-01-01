-- ============================================================================
-- CRITICAL SECURITY FIX: RPC Permissions
-- Run this immediately to fix grant issues on existing database
-- ============================================================================

-- REVOKE ALL from all roles comprehensively (PUBLIC includes anon + authenticated)
REVOKE ALL ON FUNCTION rpc_upsert_link_profile(boolean, text, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION rpc_upsert_link_settings(boolean, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION rpc_get_link_candidates(int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION rpc_submit_link_decision(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION rpc_get_my_mutuals(int, int) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION rpc_upsert_dating_profile(boolean, text, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION rpc_get_dating_candidates(int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION rpc_submit_dating_decision(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION rpc_get_my_dating_matches(int, int) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION rpc_handle_follow_event(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION is_link_mutual(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION is_dating_match(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Grant execute ONLY to authenticated for user-facing RPCs (NOT anon, NOT public)
GRANT EXECUTE ON FUNCTION rpc_upsert_link_profile(boolean, text, text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_upsert_link_settings(boolean, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_link_candidates(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_submit_link_decision(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_my_mutuals(int, int) TO authenticated;

GRANT EXECUTE ON FUNCTION rpc_upsert_dating_profile(boolean, text, text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_dating_candidates(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_submit_dating_decision(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_my_dating_matches(int, int) TO authenticated;

-- Helper functions ONLY to authenticated (for messaging gating)
GRANT EXECUTE ON FUNCTION is_link_mutual(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_dating_match(uuid, uuid) TO authenticated;

-- Follow event handler ONLY to service_role
GRANT EXECUTE ON FUNCTION rpc_handle_follow_event(uuid, uuid) TO service_role;

-- ============================================================================
-- VERIFICATION: Run this after applying fix
-- ============================================================================
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.role_routine_grants
WHERE routine_name IN (
  'rpc_upsert_link_profile',
  'rpc_upsert_link_settings',
  'rpc_get_link_candidates',
  'rpc_submit_link_decision',
  'rpc_get_my_mutuals',
  'rpc_upsert_dating_profile',
  'rpc_get_dating_candidates',
  'rpc_submit_dating_decision',
  'rpc_get_my_dating_matches',
  'rpc_handle_follow_event',
  'is_link_mutual',
  'is_dating_match'
)
ORDER BY routine_name, grantee;

-- Expected output:
-- All user-facing RPCs: ONLY 'authenticated' grantee
-- rpc_handle_follow_event: ONLY 'service_role' grantee
-- NO 'anon' or 'public' grants anywhere
