-- ============================================================================
-- FIX: Enable pgcrypto extension for referral code generation
-- ============================================================================
-- ISSUE: generate_referral_code() function uses gen_random_bytes() which 
-- requires pgcrypto extension, but the referral migrations don't enable it.
-- This causes "function gen_random_bytes(integer) does not exist" error
-- when users try to claim referrals.
-- ============================================================================

BEGIN;

-- Enable pgcrypto extension (required for gen_random_bytes)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verify the function exists now
DO $$
BEGIN
  PERFORM gen_random_bytes(8);
  RAISE NOTICE 'pgcrypto extension enabled successfully - gen_random_bytes() is available';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'pgcrypto extension failed to enable: %', SQLERRM;
END;
$$;

COMMIT;

-- ============================================================================
-- VERIFICATION: Test referral code generation
-- ============================================================================

BEGIN;

-- Test generate_referral_code function
DO $$
DECLARE
  v_code text;
BEGIN
  v_code := public.generate_referral_code(8);
  RAISE NOTICE 'Successfully generated referral code: %', v_code;
  
  IF length(v_code) <> 8 THEN
    RAISE EXCEPTION 'Generated code has wrong length: % (expected 8)', length(v_code);
  END IF;
END;
$$;

COMMIT;

-- ============================================================================
-- DIAGNOSTIC QUERIES
-- ============================================================================

-- Check if pgcrypto is enabled
SELECT 
  extname as extension_name,
  extversion as version
FROM pg_extension
WHERE extname = 'pgcrypto';

-- Check all existing referral codes
SELECT 
  COUNT(*) as total_codes,
  COUNT(DISTINCT profile_id) as unique_profiles
FROM public.referral_codes;

-- Check referrals that might have failed
SELECT 
  r.id,
  r.referrer_profile_id,
  r.referred_profile_id,
  r.code_used,
  r.claimed_at,
  p1.username as referrer_username,
  p2.username as referred_username
FROM public.referrals r
LEFT JOIN public.profiles p1 ON p1.id = r.referrer_profile_id
LEFT JOIN public.profiles p2 ON p2.id = r.referred_profile_id
ORDER BY r.claimed_at DESC
LIMIT 20;

-- Check referral rollups
SELECT 
  rr.referrer_profile_id,
  p.username,
  rr.click_count,
  rr.referral_count,
  rr.activation_count,
  rr.last_click_at,
  rr.last_referral_at
FROM public.referral_rollups rr
JOIN public.profiles p ON p.id = rr.referrer_profile_id
ORDER BY rr.referral_count DESC;

