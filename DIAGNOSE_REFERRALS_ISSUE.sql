-- ============================================================================
-- COMPREHENSIVE REFERRALS DIAGNOSTIC REPORT
-- ============================================================================
-- Run this to understand why only one person is getting referral stats
-- ============================================================================

-- 1. Check if pgcrypto extension is enabled
SELECT '=== EXTENSION CHECK ===' as section;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') 
    THEN '✓ pgcrypto is enabled'
    ELSE '✗ pgcrypto is MISSING (this is the problem!)'
  END as pgcrypto_status;

-- 2. Check all referral codes generated
SELECT '=== REFERRAL CODES ===' as section;
SELECT 
  rc.profile_id,
  p.username,
  rc.code,
  rc.created_at,
  'https://mylivelinks.com/signup?ref=' || rc.code as invite_link
FROM public.referral_codes rc
JOIN public.profiles p ON p.id = rc.profile_id
ORDER BY rc.created_at DESC;

-- 3. Check all referral claims (who referred whom)
SELECT '=== REFERRAL CLAIMS ===' as section;
SELECT 
  r.id,
  p_referrer.username as referrer_username,
  p_referred.username as referred_username,
  r.code_used,
  r.click_id,
  r.claimed_at,
  r.activated_at,
  CASE 
    WHEN r.activated_at IS NOT NULL THEN '✓ Activated'
    WHEN r.claimed_at + interval '7 days' < now() THEN '✗ Expired'
    ELSE '⏳ Pending'
  END as status
FROM public.referrals r
LEFT JOIN public.profiles p_referrer ON p_referrer.id = r.referrer_profile_id
LEFT JOIN public.profiles p_referred ON p_referred.id = r.referred_profile_id
ORDER BY r.claimed_at DESC;

-- 4. Check referral clicks (link tracking)
SELECT '=== REFERRAL CLICKS ===' as section;
SELECT 
  c.id,
  c.referral_code,
  p.username as referrer_username,
  c.device_id,
  c.clicked_at,
  c.landing_path
FROM public.referral_clicks c
LEFT JOIN public.profiles p ON p.id = c.referrer_profile_id
ORDER BY c.clicked_at DESC
LIMIT 50;

-- 5. Check referral rollups (aggregated stats)
SELECT '=== REFERRAL STATS (ROLLUPS) ===' as section;
SELECT 
  p.username,
  rr.click_count,
  rr.referral_count,
  rr.activation_count,
  rr.last_click_at,
  rr.last_referral_at,
  rr.last_activity_at
FROM public.referral_rollups rr
JOIN public.profiles p ON p.id = rr.referrer_profile_id
ORDER BY rr.referral_count DESC;

-- 6. Check referral activity events
SELECT '=== REFERRAL ACTIVITY EVENTS ===' as section;
SELECT 
  p_referrer.username as referrer_username,
  p_referred.username as referred_username,
  ra.event_type,
  ra.created_at
FROM public.referral_activity ra
LEFT JOIN public.profiles p_referrer ON p_referrer.id = ra.referrer_profile_id
LEFT JOIN public.profiles p_referred ON p_referred.id = ra.referred_profile_id
ORDER BY ra.created_at DESC
LIMIT 50;

-- 7. Summary statistics
SELECT '=== SUMMARY STATISTICS ===' as section;
SELECT
  (SELECT COUNT(*) FROM public.referral_codes) as total_referral_codes,
  (SELECT COUNT(*) FROM public.referrals) as total_referrals_claimed,
  (SELECT COUNT(*) FROM public.referrals WHERE activated_at IS NOT NULL) as total_activated,
  (SELECT COUNT(*) FROM public.referral_clicks) as total_clicks,
  (SELECT COUNT(*) FROM public.referral_rollups) as users_with_stats;

-- 8. Find who is getting all the stats
SELECT '=== WHO IS COLLECTING ALL STATS? ===' as section;
SELECT 
  p.username,
  p.id,
  rc.code as their_code,
  rr.click_count,
  rr.referral_count,
  rr.activation_count
FROM public.profiles p
LEFT JOIN public.referral_codes rc ON rc.profile_id = p.id
LEFT JOIN public.referral_rollups rr ON rr.referrer_profile_id = p.id
WHERE rr.referral_count > 0
   OR rr.click_count > 0
ORDER BY rr.referral_count DESC, rr.click_count DESC;

-- 9. Check for orphaned referrals (referrals without matching codes)
SELECT '=== POTENTIAL ISSUES ===' as section;
SELECT 
  COUNT(*) as orphaned_referrals,
  'Referrals claimed with codes that don''t exist in referral_codes table' as description
FROM public.referrals r
WHERE NOT EXISTS (
  SELECT 1 FROM public.referral_codes rc 
  WHERE lower(rc.code) = lower(r.code_used)
);

-- 10. Check for users without referral codes
SELECT 
  COUNT(*) as users_without_codes,
  'Users who have been referred but don''t have their own code yet' as description
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.referral_codes rc WHERE rc.profile_id = p.id
);

