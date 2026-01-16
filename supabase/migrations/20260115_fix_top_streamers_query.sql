-- Migration: Fix top_streamers to show who the profile owner has sent the most gifts to
-- Purpose: top_streamers should be the inverse of top_supporters (who I've gifted the most)
-- Date: 2026-01-15

-- ============================================================================
-- Update get_public_profile_with_adult_filtering to fix top_streamers query
-- ============================================================================
CREATE OR REPLACE FUNCTION get_public_profile_with_adult_filtering(
    p_username text,
    p_viewer_id uuid DEFAULT NULL,
    p_platform text DEFAULT 'web'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_profile RECORD;
    v_links JSON;
    v_adult_links JSON;
    v_follower_count INTEGER;
    v_following_count INTEGER;
    v_friends_count INTEGER;
    v_relationship VARCHAR(20);
    v_top_supporters JSON;
    v_top_streamers JSON;
    v_stream_stats JSON;
    v_show_adult_links BOOLEAN;
    v_result JSON;
BEGIN
    -- Get profile data (includes customization fields, gender, is_mll_pro, AND channel_banner_url)
    SELECT 
        p.id,
        p.username,
        p.display_name,
        p.avatar_url,
        p.bio,
        p.created_at,
        p.is_live,
        p.is_mll_pro,
        p.follower_count,
        p.total_gifts_received,
        p.total_gifts_sent,
        p.total_spent,
        p.gifter_level,
        p.profile_type,
        p.enabled_modules,
        p.enabled_tabs,
        p.profile_bg_url,
        p.profile_bg_overlay,
        p.card_color,
        p.card_opacity,
        p.card_border_radius,
        p.font_preset,
        p.accent_color,
        p.button_color,
        p.content_text_color,
        p.ui_text_color,
        p.link_color,
        p.links_section_title,
        p.hide_streaming_stats,
        p.show_top_friends,
        p.top_friends_title,
        p.top_friends_avatar_style,
        p.top_friends_max_count,
        p.gender,
        -- Channel banner for [username]TV
        p.channel_banner_url,
        p.channel_banner_updated_at,
        -- Social media fields
        p.social_instagram,
        p.social_twitter,
        p.social_youtube,
        p.social_tiktok,
        p.social_facebook,
        p.social_twitch,
        p.social_discord,
        p.social_snapchat,
        p.social_linkedin,
        p.social_github,
        p.social_spotify,
        p.social_onlyfans,
        CASE WHEN p_viewer_id = p.id THEN p.coin_balance ELSE NULL END AS coin_balance,
        CASE WHEN p_viewer_id = p.id THEN p.earnings_balance ELSE NULL END AS earnings_balance
    INTO v_profile
    FROM profiles p
    WHERE LOWER(p.username) = LOWER(p_username);
    
    IF v_profile.id IS NULL THEN
        RETURN json_build_object('error', 'Profile not found');
    END IF;
    
    -- Get links (non-adult)
    SELECT COALESCE(json_agg(link_data ORDER BY link_data.sort_order), '[]'::json) INTO v_links
    FROM (
        SELECT l.id, l.title, l.url, l.icon, l.sort_order, l.clicks, l.is_adult
        FROM links l
        WHERE l.profile_id = v_profile.id AND l.is_adult = FALSE
    ) AS link_data;
    
    -- Determine if adult links should be shown
    v_show_adult_links := FALSE;
    IF p_platform = 'web' THEN
        SELECT COALESCE(json_agg(adult_link_data ORDER BY adult_link_data.sort_order), '[]'::json) INTO v_adult_links
        FROM (
            SELECT l.id, l.title, l.url, l.icon, l.sort_order, l.clicks, l.is_adult
            FROM links l
            WHERE l.profile_id = v_profile.id AND l.is_adult = TRUE
        ) AS adult_link_data;
        
        IF v_adult_links IS NOT NULL AND v_adult_links::text != '[]' THEN
            v_show_adult_links := TRUE;
        END IF;
    ELSE
        v_adult_links := '[]'::json;
    END IF;
    
    -- Get counts
    SELECT COUNT(*) INTO v_follower_count FROM follows WHERE followee_id = v_profile.id;
    SELECT COUNT(*) INTO v_following_count FROM follows WHERE follower_id = v_profile.id;
    SELECT COUNT(*) INTO v_friends_count FROM friends WHERE user_id_1 = v_profile.id OR user_id_2 = v_profile.id;
    
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
    
    -- Top Supporters: People who have sent the most gifts TO this profile
    SELECT COALESCE(json_agg(supporter_data), '[]'::json) INTO v_top_supporters
    FROM (
        SELECT p.id, p.username, p.display_name, p.avatar_url, p.gifter_level, SUM(g.coin_amount) AS total_gifted
        FROM gifts g
        JOIN profiles p ON p.id = g.sender_id
        WHERE g.recipient_id = v_profile.id
        GROUP BY p.id, p.username, p.display_name, p.avatar_url, p.gifter_level
        ORDER BY total_gifted DESC LIMIT 3
    ) AS supporter_data;
    
    -- Top Streamers: People this profile has sent the most gifts TO (who I support)
    SELECT COALESCE(json_agg(streamer_data), '[]'::json) INTO v_top_streamers
    FROM (
        SELECT p.id, p.username, p.display_name, p.avatar_url, p.is_live,
               SUM(g.coin_amount) AS total_gifted_to
        FROM gifts g
        JOIN profiles p ON p.id = g.recipient_id
        WHERE g.sender_id = v_profile.id
        GROUP BY p.id, p.username, p.display_name, p.avatar_url, p.is_live
        ORDER BY total_gifted_to DESC LIMIT 3
    ) AS streamer_data;
    
    SELECT json_build_object(
        'total_streams', COALESCE(ss.total_streams, 0),
        'total_minutes_live', COALESCE(ss.total_minutes_live, 0),
        'total_viewers', COALESCE(ss.total_viewers, 0),
        'peak_viewers', COALESCE(ss.peak_viewers, 0),
        'diamonds_earned_lifetime', COALESCE(ss.diamonds_earned_lifetime, 0),
        'diamonds_earned_7d', COALESCE(ss.diamonds_earned_7d, 0),
        'followers_gained_from_streams', COALESCE(ss.followers_gained_from_streams, 0),
        'last_stream_at', ss.last_stream_at
    ) INTO v_stream_stats
    FROM stream_stats ss WHERE ss.profile_id = v_profile.id;
    
    IF v_stream_stats IS NULL THEN
        v_stream_stats := json_build_object(
            'total_streams', 0, 'total_minutes_live', 0, 'total_viewers', 0,
            'peak_viewers', 0, 'diamonds_earned_lifetime', 0, 'diamonds_earned_7d', 0,
            'followers_gained_from_streams', 0, 'last_stream_at', NULL
        );
    END IF;
    
    v_result := json_build_object(
        'profile', row_to_json(v_profile),
        'links', v_links,
        'adult_links', v_adult_links,
        'show_adult_section', v_show_adult_links,
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
$$;
