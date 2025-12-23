-- ============================================================================
-- Check Your Profile
-- ============================================================================
-- Run this in Supabase SQL Editor to see your profile info
-- ============================================================================

-- Get your profile based on email
SELECT 
    p.id,
    p.username,
    p.display_name,
    p.bio,
    p.avatar_url,
    p.coin_balance,
    p.earnings_balance,
    p.gifter_level,
    p.is_live,
    p.follower_count,
    p.total_gifts_received,
    p.total_gifts_sent,
    p.created_at,
    u.email
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'wcba.mo@gmail.com';

-- Or if you're logged in, use this to see your own profile:
-- SELECT * FROM profiles WHERE id = auth.uid();


