-- Migration: Add channel banner fields to profiles
-- Purpose: Support YouTube-style channel banners for [username]TV pages
-- Date: 2025-01-15

-- Add channel_banner_url and channel_banner_updated_at to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS channel_banner_url text NULL,
ADD COLUMN IF NOT EXISTS channel_banner_updated_at timestamptz NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.channel_banner_url IS 'URL to the user''s channel banner image for [username]TV page';
COMMENT ON COLUMN public.profiles.channel_banner_updated_at IS 'Timestamp when channel banner was last updated';

-- ============================================================================
-- Update get_public_profile_with_adult_filtering to include channel_banner_url
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
    
    -- Check if viewer is eligible for adult content
    v_show_adult_links := FALSE;
    IF p_viewer_id IS NOT NULL THEN
        v_show_adult_links := is_eligible_for_adult_content(p_viewer_id, p_platform);
    END IF;
    
    -- Get regular (non-adult) links
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
    WHERE ul.profile_id = v_profile.id 
      AND ul.is_active = TRUE
      AND ul.is_adult = FALSE;
    
    -- Get adult links ONLY if eligible
    IF v_show_adult_links THEN
        SELECT COALESCE(json_agg(
            json_build_object(
                'id', ul.id,
                'title', ul.title,
                'url', ul.url,
                'icon', ul.icon,
                'click_count', ul.click_count,
                'display_order', ul.display_order,
                'adult_category', ul.adult_category,
                'requires_warning', ul.requires_warning
            ) ORDER BY ul.display_order
        ), '[]'::json)
        INTO v_adult_links
        FROM user_links ul
        WHERE ul.profile_id = v_profile.id 
          AND ul.is_active = TRUE
          AND ul.is_adult = TRUE
          AND ul.is_flagged = FALSE;
    ELSE
        v_adult_links := '[]'::json;
    END IF;
    
    -- Relationship + counts
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
    
    SELECT COALESCE(json_agg(supporter_data), '[]'::json) INTO v_top_supporters
    FROM (
        SELECT p.id, p.username, p.display_name, p.avatar_url, p.gifter_level, SUM(g.coin_amount) AS total_gifted
        FROM gifts g
        JOIN profiles p ON p.id = g.sender_id
        WHERE g.recipient_id = v_profile.id
        GROUP BY p.id, p.username, p.display_name, p.avatar_url, p.gifter_level
        ORDER BY total_gifted DESC LIMIT 3
    ) AS supporter_data;
    
    SELECT COALESCE(json_agg(streamer_data), '[]'::json) INTO v_top_streamers
    FROM (
        SELECT p.id, p.username, p.display_name, p.avatar_url, p.is_live, 
               ss.diamonds_earned_lifetime, ss.peak_viewers, ss.total_streams
        FROM stream_stats ss
        JOIN profiles p ON p.id = ss.profile_id
        ORDER BY ss.diamonds_earned_lifetime DESC LIMIT 3
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

-- Create storage bucket for channel banners if it doesn't exist
-- Note: This is handled via Supabase dashboard or separate storage setup
-- Bucket name: channel-banners
-- Path pattern: channel-banners/{userId}/banner.{ext}

-- Storage policies for channel-banners bucket (run separately if bucket exists)
-- These assume the bucket 'channel-banners' exists and is public

-- Policy: Allow authenticated users to upload their own channel banner
DO $$
BEGIN
  -- Check if bucket exists before creating policies
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'channel-banners') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can upload own channel banner" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update own channel banner" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own channel banner" ON storage.objects;
    DROP POLICY IF EXISTS "Channel banners are publicly viewable" ON storage.objects;
    
    -- Create upload policy
    CREATE POLICY "Users can upload own channel banner"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'channel-banners' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
    
    -- Create update policy
    CREATE POLICY "Users can update own channel banner"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'channel-banners' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
    
    -- Create delete policy
    CREATE POLICY "Users can delete own channel banner"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'channel-banners' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
    
    -- Create public read policy
    CREATE POLICY "Channel banners are publicly viewable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'channel-banners');
  END IF;
END $$;
