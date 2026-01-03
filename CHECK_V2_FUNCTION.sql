-- Check which version of the function is actually deployed
SELECT 
  pg_get_functiondef(oid) AS function_source
FROM pg_proc
WHERE proname = 'rpc_get_team_chat_messages_v2'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LIMIT 1;

-- Also show when it was created
SELECT 
  routine_name,
  created,
  last_altered
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'rpc_get_team_chat_messages_v2';
