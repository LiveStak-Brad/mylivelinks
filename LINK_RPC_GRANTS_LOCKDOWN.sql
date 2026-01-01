-- ============================================================================
-- LINK RPC GRANTS LOCKDOWN
-- Enforce: anon can only discover, authenticated for mutations/private data
-- ============================================================================

-- ============================================================================
-- STEP 1: REVOKE ALL from PUBLIC (includes anon + authenticated)
-- ============================================================================

REVOKE ALL ON FUNCTION rpc_upsert_link_profile(boolean, text, text, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION rpc_upsert_link_settings(boolean, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION rpc_get_link_candidates(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION rpc_submit_link_decision(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION rpc_get_my_mutuals(int, int) FROM PUBLIC;

REVOKE ALL ON FUNCTION rpc_upsert_dating_profile(boolean, text, text, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION rpc_get_dating_candidates(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION rpc_submit_dating_decision(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION rpc_get_my_dating_matches(int, int) FROM PUBLIC;

REVOKE ALL ON FUNCTION rpc_handle_follow_event(uuid, uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION is_link_mutual(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION is_dating_match(uuid, uuid) FROM PUBLIC;

-- ============================================================================
-- STEP 2: Grant A - anon + authenticated (READ-ONLY discovery)
-- ============================================================================

-- Discovery/browsing allowed for both anon and authenticated
GRANT EXECUTE ON FUNCTION rpc_get_link_candidates(int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_dating_candidates(int, int) TO anon, authenticated;

-- ============================================================================
-- STEP 3: Grant B - authenticated ONLY (mutations + private reads)
-- ============================================================================

-- Profile mutations
GRANT EXECUTE ON FUNCTION rpc_upsert_link_profile(boolean, text, text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_upsert_link_settings(boolean, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_upsert_dating_profile(boolean, text, text, jsonb, jsonb) TO authenticated;

-- Decision mutations (creates mutuals/matches)
GRANT EXECUTE ON FUNCTION rpc_submit_link_decision(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_submit_dating_decision(uuid, text) TO authenticated;

-- Private reads (my mutuals/matches)
GRANT EXECUTE ON FUNCTION rpc_get_my_mutuals(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_my_dating_matches(int, int) TO authenticated;

-- Helper functions for messaging gating (authenticated only)
GRANT EXECUTE ON FUNCTION is_link_mutual(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_dating_match(uuid, uuid) TO authenticated;

-- ============================================================================
-- STEP 4: Grant C - service_role ONLY (internal/follow glue)
-- ============================================================================

-- Follow event handler (internal use only)
GRANT EXECUTE ON FUNCTION rpc_handle_follow_event(uuid, uuid) TO service_role;

-- ============================================================================
-- VERIFICATION: Run this to confirm grants
-- ============================================================================

SELECT 
  routine_name,
  grantee
FROM information_schema.role_routine_grants
WHERE routine_name LIKE 'rpc_%link%' 
   OR routine_name LIKE 'rpc_%dating%'
   OR routine_name IN ('is_link_mutual', 'is_dating_match')
ORDER BY routine_name, grantee;

-- ============================================================================
-- EXPECTED OUTPUT:
-- ============================================================================
-- is_dating_match                | authenticated
-- is_link_mutual                 | authenticated
-- rpc_get_dating_candidates      | anon
-- rpc_get_dating_candidates      | authenticated
-- rpc_get_link_candidates        | anon
-- rpc_get_link_candidates        | authenticated
-- rpc_get_my_dating_matches      | authenticated
-- rpc_get_my_mutuals             | authenticated
-- rpc_handle_follow_event        | service_role
-- rpc_submit_dating_decision     | authenticated
-- rpc_submit_link_decision       | authenticated
-- rpc_upsert_dating_profile      | authenticated
-- rpc_upsert_link_profile        | authenticated
-- rpc_upsert_link_settings       | authenticated
-- ============================================================================
-- TOTAL: 16 grants
-- anon: 2 grants (discovery only)
-- authenticated: 12 grants (discovery + mutations + private reads + helpers)
-- service_role: 1 grant (follow handler)
-- NO PUBLIC grants
-- ============================================================================
