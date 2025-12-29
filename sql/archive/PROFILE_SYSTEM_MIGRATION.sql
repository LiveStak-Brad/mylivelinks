-- ============================================================================
-- MyLiveLinks Profile System - Complete Migration
-- ============================================================================
-- This migration includes:
-- - Profile customization (backgrounds, cards, fonts, colors)
-- - Profile links enhancements (icons, section title, click tracking)
-- - Stream stats tracking
-- - Friends functionality (mutual follows)
-- - Top supporters/streamers leaderboards
-- - RPC functions for all profile operations
-- ============================================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. EXTEND PROFILES TABLE WITH CUSTOMIZATION FIELDS
-- ============================================================================

DO $$ 
BEGIN
    -- Background customization
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='profile_bg_url') THEN
        ALTER TABLE profiles ADD COLUMN profile_bg_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='profile_bg_overlay') THEN
        ALTER TABLE profiles ADD COLUMN profile_bg_overlay VARCHAR(50) DEFAULT 'dark-medium';
    END IF;
    
    -- Card styling
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='card_color') THEN
        ALTER TABLE profiles ADD COLUMN card_color VARCHAR(20) DEFAULT '#FFFFFF';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='card_opacity') THEN
        ALTER TABLE profiles ADD COLUMN card_opacity DECIMAL(3, 2) DEFAULT 0.95 CHECK (card_opacity >= 0 AND card_opacity <= 1);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='card_border_radius') THEN
        ALTER TABLE profiles ADD COLUMN card_border_radius VARCHAR(20) DEFAULT 'medium';
    END IF;
    
    -- Typography
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='font_preset') THEN
        ALTER TABLE profiles ADD COLUMN font_preset VARCHAR(20) DEFAULT 'modern';
    END IF;
    
    -- Accent color
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='accent_color') THEN
        ALTER TABLE profiles ADD COLUMN accent_color VARCHAR(20) DEFAULT '#3B82F6';
    END IF;
    
    -- Links section title
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='links_section_title') THEN
        ALTER TABLE profiles ADD COLUMN links_section_title VARCHAR(100) DEFAULT 'My Links';
    END IF;
    
    -- Gifter level
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='gifter_level') THEN
        ALTER TABLE profiles ADD COLUMN gifter_level INTEGER DEFAULT 0;
    END IF;
END $$;

COMMENT ON COLUMN profiles.profile_bg_url IS 'Custom background image URL for profile page';
COMMENT ON COLUMN profiles.profile_bg_overlay IS 'Overlay style for background readability';
COMMENT ON COLUMN profiles.card_color IS 'Custom card background color (hex)';
COMMENT ON COLUMN profiles.card_opacity IS 'Card opacity (0-1)';
COMMENT ON COLUMN profiles.card_border_radius IS 'Card corner rounding preset';
COMMENT ON COLUMN profiles.font_preset IS 'Typography preset for profile';
COMMENT ON COLUMN profiles.accent_color IS 'Accent color for buttons/links/badges (hex)';
COMMENT ON COLUMN profiles.links_section_title IS 'Custom title for links section (default: My Links)';

-- ============================================================================
-- 2. EXTEND USER_LINKS TABLE
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_links' AND column_name='icon') THEN
        ALTER TABLE user_links ADD COLUMN icon VARCHAR(100);
    END IF;
END $$;

COMMENT ON COLUMN user_links.icon IS 'Icon identifier (emoji or icon name)';

-- ============================================================================
-- 3. CREATE STREAM STATS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stream_stats (
    id BIGSERIAL PRIMARY KEY,
    profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Lifetime stats
    total_streams INTEGER DEFAULT 0,
    total_minutes_live BIGINT DEFAULT 0,
    total_viewers BIGINT DEFAULT 0,
    peak_viewers INTEGER DEFAULT 0,
    
    -- Engagement metrics
    diamonds_earned_lifetime BIGINT DEFAULT 0,
    diamonds_earned_7d BIGINT DEFAULT 0,
    followers_gained_from_streams INTEGER DEFAULT 0,
    
    -- Timestamps
    last_stream_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stream_stats_profile_id ON stream_stats(profile_id);
CREATE INDEX IF NOT EXISTS idx_stream_stats_diamonds_earned ON stream_stats(diamonds_earned_lifetime DESC);
CREATE INDEX IF NOT EXISTS idx_stream_stats_peak_viewers ON stream_stats(peak_viewers DESC);
CREATE INDEX IF NOT EXISTS idx_stream_stats_diamonds_7d ON stream_stats(diamonds_earned_7d DESC);

-- Enable RLS
ALTER TABLE stream_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stream stats are viewable by everyone" ON stream_stats;
CREATE POLICY "Stream stats are viewable by everyone"
    ON stream_stats FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can manage own stream stats" ON stream_stats;
CREATE POLICY "Users can manage own stream stats"
    ON stream_stats FOR ALL
    USING (auth.uid() = profile_id)
    WITH CHECK (auth.uid() = profile_id);

COMMENT ON TABLE stream_stats IS 'Aggregated streaming statistics per user';

-- ============================================================================
-- 4. CREATE VIEW: FRIENDS (MUTUAL FOLLOWS)
-- ============================================================================

CREATE OR REPLACE VIEW friends AS
SELECT DISTINCT
    LEAST(f1.follower_id, f1.followee_id) AS user_id_1,
    GREATEST(f1.follower_id, f1.followee_id) AS user_id_2,
    LEAST(f1.followed_at, f2.followed_at) AS friends_since
FROM follows f1
JOIN follows f2 ON f1.follower_id = f2.followee_id AND f1.followee_id = f2.follower_id
WHERE f1.follower_id < f1.followee_id;

COMMENT ON VIEW friends IS 'Mutual follow relationships (friends)';

-- ============================================================================
-- 5. RPC: GET PUBLIC PROFILE DATA
-- ============================================================================

CREATE OR REPLACE FUNCTION get_public_profile(
    p_username VARCHAR(50),
    p_viewer_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_profile RECORD;
    v_links JSON;
    v_follower_count INTEGER;
    v_following_count INTEGER;
    v_friends_count INTEGER;
    v_relationship VARCHAR(20);
    v_top_supporters JSON;
    v_top_streamers JSON;
    v_stream_stats JSON;
    v_result JSON;
BEGIN
    -- Get profile data
    SELECT 
        p.id,
        p.username,
        p.display_name,
        p.avatar_url,
        p.bio,
        p.created_at,
        p.is_live,
        p.follower_count,
        p.total_gifts_received,
        p.total_gifts_sent,
        p.gifter_level,
        p.profile_bg_url,
        p.profile_bg_overlay,
        p.card_color,
        p.card_opacity,
        p.card_border_radius,
        p.font_preset,
        p.accent_color,
        p.links_section_title,
        CASE WHEN p_viewer_id = p.id THEN p.coin_balance ELSE NULL END AS coin_balance,
        CASE WHEN p_viewer_id = p.id THEN p.earnings_balance ELSE NULL END AS earnings_balance
    INTO v_profile
    FROM profiles p
    WHERE LOWER(p.username) = LOWER(p_username);
    
    IF v_profile.id IS NULL THEN
        RETURN json_build_object('error', 'Profile not found');
    END IF;
    
    -- Get links (ordered)
    SELECT COALESCE(json_agg(
        json_build_object(
            'id', ul.id,
            'title', ul.title,
            'url', ul.url,
            'icon', ul.icon,
            'click_count', ul.click_count,
            'display_order', ul.display_order
        ) ORDER BY ul.display_order
    ), '[]'::json)
    INTO v_links
    FROM user_links ul
    WHERE ul.profile_id = v_profile.id AND ul.is_active = TRUE;
    
    -- Get follower count
    SELECT COUNT(*) INTO v_follower_count
    FROM follows WHERE followee_id = v_profile.id;
    
    -- Get following count
    SELECT COUNT(*) INTO v_following_count
    FROM follows WHERE follower_id = v_profile.id;
    
    -- Get friends count
    SELECT COUNT(*) INTO v_friends_count
    FROM friends
    WHERE user_id_1 = v_profile.id OR user_id_2 = v_profile.id;
    
    -- Determine relationship
    v_relationship := 'none';
    IF p_viewer_id IS NOT NULL AND p_viewer_id != v_profile.id THEN
        IF EXISTS (SELECT 1 FROM follows WHERE follower_id = p_viewer_id AND followee_id = v_profile.id) THEN
            IF EXISTS (SELECT 1 FROM follows WHERE follower_id = v_profile.id AND followee_id = p_viewer_id) THEN
                v_relationship := 'friends';
            ELSE
                v_relationship := 'following';
            END IF;
        ELSIF EXISTS (SELECT 1 FROM follows WHERE follower_id = v_profile.id AND followee_id = p_viewer_id) THEN
            v_relationship := 'followed_by';
        END IF;
    END IF;
    
    -- Get Top 3 Supporters
    SELECT COALESCE(json_agg(supporter_data), '[]'::json)
    INTO v_top_supporters
    FROM (
        SELECT 
            p.id,
            p.username,
            p.display_name,
            p.avatar_url,
            p.gifter_level,
            SUM(g.coin_amount) AS total_gifted
        FROM gifts g
        JOIN profiles p ON p.id = g.sender_id
        WHERE g.recipient_id = v_profile.id
        GROUP BY p.id, p.username, p.display_name, p.avatar_url, p.gifter_level
        ORDER BY total_gifted DESC
        LIMIT 3
    ) AS supporter_data;
    
    -- Get Top 3 Streamers
    SELECT COALESCE(json_agg(streamer_data), '[]'::json)
    INTO v_top_streamers
    FROM (
        SELECT 
            p.id,
            p.username,
            p.display_name,
            p.avatar_url,
            p.is_live,
            ss.diamonds_earned_lifetime,
            ss.peak_viewers,
            ss.total_streams
        FROM stream_stats ss
        JOIN profiles p ON p.id = ss.profile_id
        ORDER BY ss.diamonds_earned_lifetime DESC
        LIMIT 3
    ) AS streamer_data;
    
    -- Get stream stats
    SELECT json_build_object(
        'total_streams', COALESCE(ss.total_streams, 0),
        'total_minutes_live', COALESCE(ss.total_minutes_live, 0),
        'total_viewers', COALESCE(ss.total_viewers, 0),
        'peak_viewers', COALESCE(ss.peak_viewers, 0),
        'diamonds_earned_lifetime', COALESCE(ss.diamonds_earned_lifetime, 0),
        'diamonds_earned_7d', COALESCE(ss.diamonds_earned_7d, 0),
        'followers_gained_from_streams', COALESCE(ss.followers_gained_from_streams, 0),
        'last_stream_at', ss.last_stream_at
    )
    INTO v_stream_stats
    FROM stream_stats ss
    WHERE ss.profile_id = v_profile.id;
    
    IF v_stream_stats IS NULL THEN
        v_stream_stats := json_build_object(
            'total_streams', 0,
            'total_minutes_live', 0,
            'total_viewers', 0,
            'peak_viewers', 0,
            'diamonds_earned_lifetime', 0,
            'diamonds_earned_7d', 0,
            'followers_gained_from_streams', 0,
            'last_stream_at', NULL
        );
    END IF;
    
    -- Build response
    v_result := json_build_object(
        'profile', row_to_json(v_profile),
        'links', v_links,
        'follower_count', v_follower_count,
        'following_count', v_following_count,
        'friends_count', v_friends_count,
        'relationship', v_relationship,
        'top_supporters', v_top_supporters,
        'top_streamers', v_top_streamers,
        'stream_stats', v_stream_stats
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- 6. RPC: TOGGLE FOLLOW
-- ============================================================================

CREATE OR REPLACE FUNCTION toggle_follow(
    p_follower_id UUID,
    p_followee_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_is_following BOOLEAN;
    v_is_mutual BOOLEAN;
    v_new_status VARCHAR(20);
BEGIN
    IF p_follower_id = p_followee_id THEN
        RETURN json_build_object('error', 'Cannot follow yourself');
    END IF;
    
    SELECT EXISTS (
        SELECT 1 FROM follows 
        WHERE follower_id = p_follower_id AND followee_id = p_followee_id
    ) INTO v_is_following;
    
    IF v_is_following THEN
        DELETE FROM follows 
        WHERE follower_id = p_follower_id AND followee_id = p_followee_id;
        v_new_status := 'none';
    ELSE
        INSERT INTO follows (follower_id, followee_id)
        VALUES (p_follower_id, p_followee_id)
        ON CONFLICT (follower_id, followee_id) DO NOTHING;
        
        SELECT EXISTS (
            SELECT 1 FROM follows 
            WHERE follower_id = p_followee_id AND followee_id = p_follower_id
        ) INTO v_is_mutual;
        
        v_new_status := CASE WHEN v_is_mutual THEN 'friends' ELSE 'following' END;
    END IF;
    
    RETURN json_build_object('success', true, 'status', v_new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- 7. RPC: GET FOLLOWERS LIST
-- ============================================================================

CREATE OR REPLACE FUNCTION get_followers_list(
    p_profile_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'followers', COALESCE(json_agg(follower_data), '[]'::json),
            'total', (SELECT COUNT(*) FROM follows WHERE followee_id = p_profile_id)
        )
        FROM (
            SELECT 
                p.id,
                p.username,
                p.display_name,
                p.avatar_url,
                p.bio,
                p.follower_count,
                p.is_live,
                f.followed_at
            FROM follows f
            JOIN profiles p ON p.id = f.follower_id
            WHERE f.followee_id = p_profile_id
            ORDER BY f.followed_at DESC
            LIMIT p_limit OFFSET p_offset
        ) AS follower_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- 8. RPC: GET FOLLOWING LIST
-- ============================================================================

CREATE OR REPLACE FUNCTION get_following_list(
    p_profile_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'following', COALESCE(json_agg(following_data), '[]'::json),
            'total', (SELECT COUNT(*) FROM follows WHERE follower_id = p_profile_id)
        )
        FROM (
            SELECT 
                p.id,
                p.username,
                p.display_name,
                p.avatar_url,
                p.bio,
                p.follower_count,
                p.is_live,
                f.followed_at
            FROM follows f
            JOIN profiles p ON p.id = f.followee_id
            WHERE f.follower_id = p_profile_id
            ORDER BY f.followed_at DESC
            LIMIT p_limit OFFSET p_offset
        ) AS following_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- 9. RPC: GET FRIENDS LIST
-- ============================================================================

CREATE OR REPLACE FUNCTION get_friends_list(
    p_profile_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'friends', COALESCE(json_agg(friend_data), '[]'::json),
            'total', (
                SELECT COUNT(*) FROM friends 
                WHERE user_id_1 = p_profile_id OR user_id_2 = p_profile_id
            )
        )
        FROM (
            SELECT 
                p.id,
                p.username,
                p.display_name,
                p.avatar_url,
                p.bio,
                p.follower_count,
                p.is_live,
                fr.friends_since
            FROM friends fr
            JOIN profiles p ON (
                CASE 
                    WHEN fr.user_id_1 = p_profile_id THEN p.id = fr.user_id_2
                    ELSE p.id = fr.user_id_1
                END
            )
            WHERE fr.user_id_1 = p_profile_id OR fr.user_id_2 = p_profile_id
            ORDER BY fr.friends_since DESC
            LIMIT p_limit OFFSET p_offset
        ) AS friend_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- 10. RPC: TRACK LINK CLICK
-- ============================================================================

CREATE OR REPLACE FUNCTION track_link_click(p_link_id BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE user_links
    SET click_count = click_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- 11. GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_public_profile TO authenticated, anon;
GRANT EXECUTE ON FUNCTION toggle_follow TO authenticated;
GRANT EXECUTE ON FUNCTION get_followers_list TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_following_list TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_friends_list TO authenticated, anon;
GRANT EXECUTE ON FUNCTION track_link_click TO authenticated, anon;

-- ============================================================================
-- 12. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_follows_mutual ON follows(follower_id, followee_id);
CREATE INDEX IF NOT EXISTS idx_gifts_recipient_amount ON gifts(recipient_id, coin_amount DESC);
CREATE INDEX IF NOT EXISTS idx_user_links_profile_order ON user_links(profile_id, display_order) WHERE is_active = TRUE;

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE ✅
-- ============================================================================
-- 
-- What was added:
-- ✅ Profile customization fields (backgrounds, cards, fonts, colors)
-- ✅ Stream stats table with RLS
-- ✅ Friends view for mutual follows
-- ✅ 6 RPC functions for profile operations
-- ✅ Performance indexes
-- ✅ Proper security policies
--
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Deploy your Next.js app
-- 3. Test profile customization at /settings/profile
-- 4. View profiles at /:username
-- ============================================================================

