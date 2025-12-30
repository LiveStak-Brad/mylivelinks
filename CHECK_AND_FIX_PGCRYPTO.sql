-- ============================================================================
-- STEP 1: Check if pgcrypto is installed
-- ============================================================================
-- Run this first to see if the extension exists
-- ============================================================================

SELECT 
  extname as extension_name, 
  extversion as version,
  nspname as schema
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE extname = 'pgcrypto';

-- If this returns 0 rows, pgcrypto is NOT installed
-- If this returns 1 row, pgcrypto IS installed (skip to Step 3)

-- ============================================================================
-- STEP 2: Install pgcrypto (if Step 1 returned 0 rows)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- STEP 3: Verify gen_random_bytes works
-- ============================================================================

SELECT gen_random_bytes(8) as test_bytes;

-- Should return something like: \x1a2b3c4d5e6f7a8b

-- ============================================================================
-- STEP 4: Test generate_referral_code function
-- ============================================================================

SELECT public.generate_referral_code(8) as test_code;

-- Should return something like: "ABC12XYZ"

-- ============================================================================
-- If Step 4 fails, the function might not exist. Check with:
-- ============================================================================

SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'generate_referral_code';

-- If this returns 0 rows, you need to run the referral migration first

