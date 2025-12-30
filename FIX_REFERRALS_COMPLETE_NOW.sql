-- ============================================================================
-- COMPLETE FIX FOR REFERRAL SYSTEM - RUN THIS ENTIRE FILE
-- ============================================================================
-- This will:
-- 1. Force enable pgcrypto
-- 2. Recreate the generate_referral_code function
-- 3. Test that everything works
-- ============================================================================

BEGIN;

-- STEP 1: Force enable pgcrypto extension
DROP EXTENSION IF EXISTS pgcrypto CASCADE;
CREATE EXTENSION pgcrypto;

-- STEP 2: Verify pgcrypto is now available
DO $$
BEGIN
  PERFORM gen_random_bytes(8);
  RAISE NOTICE 'SUCCESS: pgcrypto extension is now active';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'FAILED: pgcrypto could not be enabled: %', SQLERRM;
END $$;

-- STEP 3: Recreate the generate_referral_code function with pgcrypto
DROP FUNCTION IF EXISTS public.generate_referral_code(int);

CREATE OR REPLACE FUNCTION public.generate_referral_code(p_length int DEFAULT 8)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_out text := '';
  v_i int;
  v_idx int;
BEGIN
  IF p_length IS NULL OR p_length < 6 OR p_length > 16 THEN
    p_length := 8;
  END IF;

  -- This now uses pgcrypto's gen_random_bytes
  v_bytes := gen_random_bytes(p_length);

  FOR v_i IN 0..(p_length - 1) LOOP
    v_idx := (get_byte(v_bytes, v_i) % length(v_alphabet)) + 1;
    v_out := v_out || substr(v_alphabet, v_idx, 1);
  END LOOP;

  RETURN v_out;
END;
$$;

-- STEP 4: Test the function
DO $$
DECLARE
  v_test_code text;
BEGIN
  v_test_code := public.generate_referral_code(8);
  IF v_test_code IS NULL OR length(v_test_code) != 8 THEN
    RAISE EXCEPTION 'FAILED: generate_referral_code did not return valid code';
  END IF;
  RAISE NOTICE 'SUCCESS: generate_referral_code() returned: %', v_test_code;
END $$;

COMMIT;

-- ============================================================================
-- FINAL VERIFICATION - Run these separately after the above succeeds
-- ============================================================================

-- Test 1: Check pgcrypto is installed
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto')
    THEN '✓ pgcrypto is installed'
    ELSE '✗ pgcrypto is MISSING'
  END as pgcrypto_status;

-- Test 2: Test gen_random_bytes directly
SELECT 
  gen_random_bytes(8) as random_bytes,
  '✓ gen_random_bytes works!' as status;

-- Test 3: Test generate_referral_code
SELECT 
  public.generate_referral_code(8) as referral_code,
  '✓ generate_referral_code works!' as status;

-- Test 4: Check function exists
SELECT 
  routine_name,
  routine_type,
  '✓ Function exists in database' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'generate_referral_code';

