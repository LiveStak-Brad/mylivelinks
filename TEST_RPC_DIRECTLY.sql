-- ============================================================================
-- DIAGNOSTIC: Test the RPC directly with your team_id
-- ============================================================================
-- This will tell us if the function works when called directly from SQL Editor
-- ============================================================================

-- Test 1: Call the function directly
SELECT 
  message_id,
  author_username,
  author_role,  -- This is the problematic column
  content,
  created_at
FROM public.rpc_get_team_chat_messages(
  'b1c67fa9-3eff-4313-9c95-1498d28725dd'::uuid,  -- Your team_id from logs
  50,
  NULL,
  NULL
)
LIMIT 5;

-- Test 2: Show the actual function source code currently in DB
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'rpc_get_team_chat_messages'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
