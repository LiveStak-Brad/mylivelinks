-- ============================================================================
-- CHECK: Which version of rpc_get_team_chat_messages is currently deployed?
-- ============================================================================
-- This will show the full function definition to confirm if CAST fix is applied
-- ============================================================================

SELECT 
  routine_name,
  routine_type,
  data_type,
  created as created_at
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'rpc_get_team_chat_messages';

-- Now show the full function source
SELECT pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'rpc_get_team_chat_messages'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
