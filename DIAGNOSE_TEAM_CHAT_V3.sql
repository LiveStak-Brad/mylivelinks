-- ============================================================================
-- DIAGNOSTIC SCRIPT: Team Chat V3 Function and Data Verification
-- ============================================================================
-- Purpose: Verify V3 function exists, check its signature, and test data flow
-- Run this in Supabase SQL Editor to diagnose the 42804 error
-- ============================================================================

-- 1. Check if V3 function exists and get its signature
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_type,
  pg_get_functiondef(oid) as full_definition
FROM pg_proc 
WHERE proname = 'rpc_get_team_chat_messages_v3' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 2. Check if messages exist in the table
SELECT 
  COUNT(*) as total_messages,
  COUNT(DISTINCT team_id) as teams_with_messages,
  MIN(created_at) as oldest_message,
  MAX(created_at) as newest_message
FROM public.team_chat_messages;

-- 3. Sample messages for a specific team
SELECT 
  id, team_id, author_id, content, created_at
FROM public.team_chat_messages
ORDER BY created_at DESC
LIMIT 5;

-- 4. Test direct function call (replace with actual team_id from your logs)
-- Using team_id from debug logs: b1c67fa9-3eff-4313-9c95-1498d28725dd
SELECT * FROM public.rpc_get_team_chat_messages_v3(
  'b1c67fa9-3eff-4313-9c95-1498d28725dd'::uuid,
  50,
  NULL,
  NULL
);

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- Query 1: Should show V3 function with NO author_role in return_type
--          If author_role exists, V3 was not applied correctly
--
-- Query 2: Should show count > 0 if messages exist
--          If count = 0, need to create test messages
--
-- Query 3: Shows sample messages to verify data structure
--
-- Query 4: Direct function call - if this works but client fails = cache issue
--          If this fails with 42804 = function definition is broken
-- ============================================================================
