-- ============================================================================
-- IMMEDIATE FIX: Run this ONE SQL block in Supabase SQL Editor
-- ============================================================================
-- This will:
-- 1. Enable pgcrypto extension (fixes gen_random_bytes error)
-- 2. Verify the fix works
-- 3. Show you current referral data
-- ============================================================================

-- Step 1: Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 3: Show current referral stats
SELECT 
  '=== REFERRAL SYSTEM STATUS ===' as info;

-- Who has referral codes?
SELECT 
  p.username,
  rc.code,
  'https://mylivelinks.com/signup?ref=' || rc.code as invite_link,
  rc.created_at
FROM public.referral_codes rc
JOIN public.profiles p ON p.id = rc.profile_id
ORDER BY rc.created_at DESC;

-- Who has referral stats?
SELECT 
  p.username,
  rr.click_count as clicks,
  rr.referral_count as signups,
  rr.activation_count as activations,
  rr.last_referral_at
FROM public.referral_rollups rr
JOIN public.profiles p ON p.id = rr.referrer_profile_id
ORDER BY rr.referral_count DESC;

-- Recent referral claims
SELECT 
  p_referrer.username as referrer,
  p_referred.username as referred,
  r.code_used,
  r.claimed_at,
  CASE 
    WHEN r.activated_at IS NOT NULL THEN '✓ Activated'
    ELSE '⏳ Pending'
  END as status
FROM public.referrals r
JOIN public.profiles p_referrer ON p_referrer.id = r.referrer_profile_id
JOIN public.profiles p_referred ON p_referred.id = r.referred_profile_id
ORDER BY r.claimed_at DESC
LIMIT 10;

-- Summary
SELECT 
  (SELECT COUNT(*) FROM public.referral_codes) as "Total Referral Codes",
  (SELECT COUNT(*) FROM public.referrals) as "Total Referrals Claimed",
  (SELECT COUNT(*) FROM public.referrals WHERE activated_at IS NOT NULL) as "Total Activated",
  (SELECT COUNT(DISTINCT referrer_profile_id) FROM public.referral_rollups WHERE referral_count > 0) as "Users with Referrals";

