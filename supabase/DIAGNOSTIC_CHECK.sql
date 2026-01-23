-- =============================================================================
-- DIAGNOSTIC SCRIPT - Run this to check your database state
-- =============================================================================
-- Copy the output and share it so I can see what's actually in your database

-- Check if points column exists
SELECT 
  'points_column_exists' as check_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'battle_scores' AND column_name = 'points'
  ) as result;

-- Check rpc_battle_score_apply signature
SELECT 
  'rpc_battle_score_apply_exists' as check_name,
  EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_name = 'rpc_battle_score_apply'
  ) as result;

-- Check rpc_cooldown_to_cohost exists
SELECT 
  'rpc_cooldown_to_cohost_exists' as check_name,
  EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_name = 'rpc_cooldown_to_cohost'
  ) as result;

-- Check rpc_end_session signature
SELECT 
  'rpc_end_session_exists' as check_name,
  EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_name = 'rpc_end_session'
  ) as result;

-- Check team constraint on live_session_participants
SELECT 
  'team_constraint' as check_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'live_session_participants_team_check';

-- Test if we can call rpc_battle_score_apply with team 'C'
-- This will show if the function accepts teams beyond A/B
-- (Will fail if you're not authenticated, but that's OK)
SELECT 
  'test_team_c_validation' as check_name,
  'Run this manually: SELECT rpc_battle_score_apply(''00000000-0000-0000-0000-000000000000''::uuid, ''C'', 1)' as instruction;

-- Check a recent battle_scores record to see if points column has data
SELECT 
  'recent_battle_scores' as check_name,
  session_id,
  points_a,
  points_b,
  points,
  created_at
FROM battle_scores
ORDER BY created_at DESC
LIMIT 1;
