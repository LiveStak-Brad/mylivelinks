-- ============================================================================
-- FORCE SCHEMA CACHE RELOAD in Supabase
-- ============================================================================
-- PostgREST caches schema info. This forces a reload.
-- ============================================================================

-- Method 1: Send SIGUSR1 signal to PostgREST (Supabase does this automatically, but worth trying)
NOTIFY pgrst, 'reload schema';

-- Method 2: Just verify the function exists with correct signature
SELECT 
  routine_name,
  routine_type,
  specific_name,
  data_type,
  type_udt_name,
  CASE 
    WHEN routine_definition LIKE '%role_text%' THEN 'V3 (FIXED)'
    WHEN routine_definition LIKE '%CAST(wr.role%' THEN 'V2 (broken)'
    ELSE 'Unknown version'
  END as version_detected
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'rpc_get_team_chat_messages';

SELECT 'If you see V2 above, the V3 script did not apply correctly. Run it again.' AS instruction;
SELECT 'If you see V3 above, wait 10-30 seconds for Supabase to reload schema cache.' AS instruction;
