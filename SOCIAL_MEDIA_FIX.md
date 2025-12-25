# Social Media Buttons Not Showing - FIX

## Problem
Social media buttons (Instagram, Facebook, Twitter, etc.) are not displaying on profiles even though the component exists.

## Root Cause
The `get_public_profile_with_adult_filtering` RPC function needs to be updated in your Supabase database to include the social media fields.

## Solution

### Step 1: Run the SQL Update
Go to your **Supabase Dashboard** → **SQL Editor** and run this file:

**File:** `update_rpc_with_socials.sql`

Or copy/paste this SQL:

```sql
CREATE OR REPLACE FUNCTION get_public_profile_with_adult_filtering(
    p_username VARCHAR(50),
    p_viewer_id UUID DEFAULT NULL,
    p_platform VARCHAR(20) DEFAULT 'web'
)
RETURNS JSON AS $$
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
    -- Get profile data (now including social media fields)
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
    
    -- Get other data
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
    
    -- Build result with separate adult_links field
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
```

### Step 2: Add Social Media Data to Your Profile
Go to **Settings → Profile** (`/settings/profile`) and add your social media handles:
- Instagram: username (without @)
- Twitter: username (without @)
- YouTube: channel handle
- TikTok: username (without @)
- Facebook: username or page name
- Twitch: username
- Discord: invite code or full URL
- Snapchat: username
- LinkedIn: profile slug
- GitHub: username
- Spotify: user ID
- OnlyFans: username

### Step 3: Verify
1. Go to your profile: `https://mylivelinks.com/yourusername`
2. Scroll down - you should see colorful circular social media buttons
3. Each button opens the corresponding social profile in a new tab

## What the Component Looks Like

The `SocialMediaBar` component displays:
- ✅ Colorful circular buttons (brand colors for each platform)
- ✅ Icons for each platform (Instagram, Twitter, YouTube, etc.)
- ✅ Hover tooltips showing @username
- ✅ Animated hover effects (scale + shadow)
- ✅ Direct links to your social profiles

## Supported Platforms

1. Instagram - Pink circle with Instagram icon
2. Twitter/X - Blue circle with Twitter icon
3. YouTube - Red circle with YouTube icon
4. TikTok - Black circle with TikTok icon
5. Facebook - Blue circle with Facebook icon
6. Twitch - Purple circle with Twitch icon
7. Discord - Indigo circle with Discord icon
8. Snapchat - Yellow circle with Snapchat icon
9. LinkedIn - Blue circle with LinkedIn icon
10. GitHub - Black circle with GitHub icon
11. Spotify - Green circle with Spotify icon
12. OnlyFans - Cyan circle with OnlyFans icon

## Troubleshooting

**Q: I added social media but buttons still don't show**
- Clear your browser cache and refresh
- Check browser console for errors
- Verify the SQL function was updated (run the SQL again)

**Q: Only some buttons show**
- The component only displays platforms you've filled in
- If a field is empty in your profile, that button won't show

**Q: Can I reorder the buttons?**
- Currently displays in default order (Instagram, Twitter, YouTube, TikTok, etc.)
- To change order, edit `components/profile/SocialMediaBar.tsx`

## Component Location
- UI: `components/profile/SocialMediaBar.tsx`
- Used in: `app/[username]/modern-page.tsx` (line 572)
- Edit form: `app/settings/profile/page.tsx`

