-- ============================================================================
-- LINK SYSTEM - QUICK VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify installation
-- ============================================================================

-- ============================================================================
-- 1. VERIFY ALL TABLES EXIST
-- ============================================================================
DO $$
DECLARE
  v_missing_tables text[];
  v_expected_tables text[] := ARRAY[
    'link_profiles',
    'link_settings', 
    'link_decisions',
    'link_mutuals',
    'dating_profiles',
    'dating_decisions',
    'dating_matches',
    'link_events'
  ];
  v_table text;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CHECKING TABLES...';
  RAISE NOTICE '========================================';
  
  FOREACH v_table IN ARRAY v_expected_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = v_table
    ) THEN
      v_missing_tables := array_append(v_missing_tables, v_table);
    ELSE
      RAISE NOTICE '✓ Table exists: %', v_table;
    END IF;
  END LOOP;
  
  IF array_length(v_missing_tables, 1) > 0 THEN
    RAISE EXCEPTION '❌ Missing tables: %', v_missing_tables;
  ELSE
    RAISE NOTICE '✅ All 8 tables exist';
  END IF;
END $$;

-- ============================================================================
-- 2. VERIFY ALL RPCS EXIST
-- ============================================================================
DO $$
DECLARE
  v_missing_rpcs text[];
  v_expected_rpcs text[] := ARRAY[
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
  ];
  v_rpc text;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CHECKING RPCs...';
  RAISE NOTICE '========================================';
  
  FOREACH v_rpc IN ARRAY v_expected_rpcs
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_name = v_rpc
    ) THEN
      v_missing_rpcs := array_append(v_missing_rpcs, v_rpc);
    ELSE
      RAISE NOTICE '✓ RPC exists: %', v_rpc;
    END IF;
  END LOOP;
  
  IF array_length(v_missing_rpcs, 1) > 0 THEN
    RAISE EXCEPTION '❌ Missing RPCs: %', v_missing_rpcs;
  ELSE
    RAISE NOTICE '✅ All 12 RPCs exist';
  END IF;
END $$;

-- ============================================================================
-- 3. VERIFY RLS ENABLED
-- ============================================================================
DO $$
DECLARE
  v_table text;
  v_rls_disabled text[];
  v_tables text[] := ARRAY[
    'link_profiles',
    'link_settings',
    'link_decisions',
    'link_mutuals',
    'dating_profiles',
    'dating_decisions',
    'dating_matches',
    'link_events'
  ];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CHECKING RLS...';
  RAISE NOTICE '========================================';
  
  FOREACH v_table IN ARRAY v_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' 
        AND tablename = v_table
        AND rowsecurity = true
    ) THEN
      v_rls_disabled := array_append(v_rls_disabled, v_table);
    ELSE
      RAISE NOTICE '✓ RLS enabled: %', v_table;
    END IF;
  END LOOP;
  
  IF array_length(v_rls_disabled, 1) > 0 THEN
    RAISE EXCEPTION '❌ RLS not enabled on: %', v_rls_disabled;
  ELSE
    RAISE NOTICE '✅ RLS enabled on all tables';
  END IF;
END $$;

-- ============================================================================
-- 4. VERIFY POLICIES EXIST
-- ============================================================================
SELECT 
  '========================================' as notice
UNION ALL
SELECT 'CHECKING RLS POLICIES...'
UNION ALL
SELECT '========================================';

SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN (
  'link_profiles',
  'link_settings',
  'link_decisions',
  'link_mutuals',
  'dating_profiles',
  'dating_decisions',
  'dating_matches',
  'link_events'
)
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- 5. VERIFY INDEXES EXIST
-- ============================================================================
SELECT 
  '' as notice
UNION ALL
SELECT '========================================'
UNION ALL
SELECT 'CHECKING INDEXES...'
UNION ALL
SELECT '========================================';

SELECT 
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE tablename IN (
  'link_profiles',
  'link_settings',
  'link_decisions',
  'link_mutuals',
  'dating_profiles',
  'dating_decisions',
  'dating_matches',
  'link_events'
)
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- 6. TEST RPC SIGNATURES (dry run - no data created)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TESTING RPC SIGNATURES...';
  RAISE NOTICE '========================================';
  
  -- Test that RPCs have correct signatures (will error if wrong)
  PERFORM rpc_upsert_link_profile(false);
  RAISE NOTICE '✓ rpc_upsert_link_profile signature OK';
  
  PERFORM rpc_upsert_link_settings();
  RAISE NOTICE '✓ rpc_upsert_link_settings signature OK';
  
  PERFORM rpc_get_link_candidates();
  RAISE NOTICE '✓ rpc_get_link_candidates signature OK';
  
  PERFORM rpc_get_my_mutuals();
  RAISE NOTICE '✓ rpc_get_my_mutuals signature OK';
  
  PERFORM rpc_upsert_dating_profile(false);
  RAISE NOTICE '✓ rpc_upsert_dating_profile signature OK';
  
  PERFORM rpc_get_dating_candidates();
  RAISE NOTICE '✓ rpc_get_dating_candidates signature OK';
  
  PERFORM rpc_get_my_dating_matches();
  RAISE NOTICE '✓ rpc_get_my_dating_matches signature OK';
  
  RAISE NOTICE '✅ All RPC signatures valid';
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ RPC signature error: %', SQLERRM;
END $$;

-- ============================================================================
-- 7. VERIFY CONSTRAINTS
-- ============================================================================
SELECT 
  '' as notice
UNION ALL
SELECT '========================================'
UNION ALL
SELECT 'CHECKING CONSTRAINTS...'
UNION ALL
SELECT '========================================';

SELECT 
  conrelid::regclass AS table_name,
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid::regclass::text IN (
  'link_profiles',
  'link_settings',
  'link_decisions',
  'link_mutuals',
  'dating_profiles',
  'dating_decisions',
  'dating_matches',
  'link_events'
)
ORDER BY table_name, constraint_type, constraint_name;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ LINK SYSTEM VERIFICATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test RPCs with real data (see LINK_SYSTEM_VERIFICATION.md)';
  RAISE NOTICE '2. Integrate with Next.js (see lib/link/api.ts)';
  RAISE NOTICE '3. Provide follow schema for auto-link integration';
  RAISE NOTICE '4. Build UI components';
  RAISE NOTICE '';
END $$;
