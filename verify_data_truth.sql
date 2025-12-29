-- ============================================
-- REFERRALS + STATS DATA-TRUTH VERIFICATION
-- ============================================
-- Owner/Brad credentials: wcba.mo@gmail.com
-- Owner ID: 2b4a1178-3c39-4179-94ea-314dd824a818

-- 1. FIND BRAD'S PROFILE
SELECT 
  id,
  username,
  email,
  display_name,
  created_at,
  follower_count,
  coin_balance,
  earnings_balance
FROM profiles
WHERE id = '2b4a1178-3c39-4179-94ea-314dd824a818';

-- 2. CHECK REFERRAL CONVERSIONS (attributed to Brad)
SELECT 
  rc.id,
  rc.referrer_id,
  rc.referee_id,
  rc.created_at,
  rc.referral_code,
  p.username as referee_username,
  p.email as referee_email
FROM referral_conversions rc
LEFT JOIN profiles p ON p.id = rc.referee_id
WHERE rc.referrer_id = '2b4a1178-3c39-4179-94ea-314dd824a818'
ORDER BY rc.created_at DESC;

-- 3. COUNT TOTAL REFERRALS
SELECT COUNT(*) as total_referrals
FROM referral_conversions
WHERE referrer_id = '2b4a1178-3c39-4179-94ea-314dd824a818';

-- 4. CHECK POSTS BY BRAD
SELECT 
  id,
  author_id,
  caption,
  media_url,
  media_type,
  created_at,
  like_count,
  comment_count
FROM posts
WHERE author_id = '2b4a1178-3c39-4179-94ea-314dd824a818'
ORDER BY created_at DESC
LIMIT 20;

-- 5. COUNT TOTAL POSTS
SELECT COUNT(*) as total_posts
FROM posts
WHERE author_id = '2b4a1178-3c39-4179-94ea-314dd824a818';

-- 6. CHECK GIFTS SENT BY BRAD
SELECT 
  g.id,
  g.sender_id,
  g.recipient_id,
  g.coin_amount,
  g.sent_at,
  p.username as recipient_username
FROM gifts g
LEFT JOIN profiles p ON p.id = g.recipient_id
WHERE g.sender_id = '2b4a1178-3c39-4179-94ea-314dd824a818'
ORDER BY g.sent_at DESC
LIMIT 10;

-- 7. COUNT TOTAL GIFTS SENT
SELECT 
  COUNT(*) as total_gifts_sent,
  COALESCE(SUM(coin_amount), 0) as total_coins_spent
FROM gifts
WHERE sender_id = '2b4a1178-3c39-4179-94ea-314dd824a818';

-- 8. CHECK GIFTS RECEIVED BY BRAD
SELECT 
  g.id,
  g.sender_id,
  g.recipient_id,
  g.coin_amount,
  g.sent_at,
  p.username as sender_username
FROM gifts g
LEFT JOIN profiles p ON p.id = g.sender_id
WHERE g.recipient_id = '2b4a1178-3c39-4179-94ea-314dd824a818'
ORDER BY g.sent_at DESC
LIMIT 10;

-- 9. COUNT TOTAL GIFTS RECEIVED
SELECT 
  COUNT(*) as total_gifts_received,
  COALESCE(SUM(coin_amount), 0) as total_diamonds_earned
FROM gifts
WHERE recipient_id = '2b4a1178-3c39-4179-94ea-314dd824a818';

-- 10. CHECK FOLLOWERS
SELECT COUNT(*) as follower_count
FROM follows
WHERE followee_id = '2b4a1178-3c39-4179-94ea-314dd824a818';

-- 11. CHECK FOLLOWING
SELECT COUNT(*) as following_count
FROM follows
WHERE follower_id = '2b4a1178-3c39-4179-94ea-314dd824a818';

-- 12. CHECK LIVE STREAMS
SELECT 
  id,
  profile_id,
  created_at,
  started_at,
  ended_at,
  is_live
FROM live_streams
WHERE profile_id = '2b4a1178-3c39-4179-94ea-314dd824a818'
ORDER BY created_at DESC
LIMIT 10;

-- 13. CHECK IF REFERRAL_CONVERSIONS TABLE EXISTS
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'referral_conversions'
) as referral_table_exists;

-- 14. CHECK IF POSTS TABLE EXISTS
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'posts'
) as posts_table_exists;

-- 15. LIST ALL TABLES (to identify what exists)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

