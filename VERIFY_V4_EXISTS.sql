-- ============================================================================
-- VERIFY V4 EXISTS AND TEST IT
-- ============================================================================
-- Run this to confirm V4 function was created successfully
-- ============================================================================

-- 1. Check if V4 function exists
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_signature
FROM pg_proc 
WHERE proname = 'rpc_get_team_chat_messages_v4' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 2. Test V4 function directly (use your actual team_id)
SELECT * FROM public.rpc_get_team_chat_messages_v4(
  'b1c67fa9-3eff-4313-9c95-1498d28725dd'::uuid,
  10,
  NULL,
  NULL
);

-- 3. Check what functions exist
SELECT proname, pg_get_function_result(oid) 
FROM pg_proc 
WHERE proname LIKE '%rpc_get_team_chat_messages%'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

SELECT '=== If V4 exists and query 2 returns messages, the database is fine ===' AS status;
SELECT '=== The problem is browser caching or build system not reloading ===' AS next_step;
