-- Check if there's any referral data in the database
SELECT 
  COUNT(*) as total_referred_users,
  COUNT(DISTINCT referred_by) as unique_referrers
FROM profiles 
WHERE referred_by IS NOT NULL;

-- Get top referrers
SELECT 
  r.username as referrer,
  COUNT(p.id) as referral_count,
  COUNT(CASE WHEN p.email_verified THEN 1 END) as verified_count
FROM profiles p
INNER JOIN profiles r ON p.referred_by = r.id
GROUP BY r.id, r.username
ORDER BY referral_count DESC
LIMIT 10;
