-- ============================================================================
-- PROFILE GENDER SAVE + DATING ORIENTATION FILTERS
-- Ensures gender column exists for profiles and adds orientation-aware
-- filtering for rpc_get_dating_candidates.
-- ============================================================================

-- 1. Ensure profiles.gender exists with the correct constraint + index
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_gender_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_gender_check
  CHECK (
    gender IS NULL
    OR gender IN ('male', 'female', 'nonbinary', 'other', 'prefer_not_to_say')
  );

CREATE INDEX IF NOT EXISTS idx_profiles_gender
  ON public.profiles(gender)
  WHERE gender IS NOT NULL;

COMMENT ON COLUMN public.profiles.gender IS
  'Optional gender for dating filters. Values: male, female, nonbinary, other, prefer_not_to_say, or NULL.';

-- ============================================================================
-- 2. Update rpc_get_dating_candidates with orientation-aware filters
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_get_dating_candidates(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_my_prefs jsonb;
  v_show_me text;
  v_result jsonb;
  v_orientation_pref text[];
BEGIN
  v_profile_id := auth.uid();

  IF v_profile_id IS NOT NULL THEN
    SELECT prefs
    INTO v_my_prefs
    FROM dating_profiles
    WHERE profile_id = v_profile_id;

    IF v_my_prefs IS NULL THEN
      v_my_prefs := '{
        "show_me": "everyone",
        "age_min": 18,
        "age_max": 99
      }'::jsonb;
    END IF;

    v_show_me := COALESCE(v_my_prefs->>'show_me', 'everyone');

    -- Orientation preference filter (multi-select + "doesn't matter")
    IF jsonb_typeof(v_my_prefs->'orientation_pref') = 'array' THEN
      SELECT array_agg(value) FILTER (WHERE value IS NOT NULL)
      INTO v_orientation_pref
      FROM jsonb_array_elements_text(v_my_prefs->'orientation_pref') value;

      IF v_orientation_pref IS NULL OR array_length(v_orientation_pref, 1) = 0 THEN
        v_orientation_pref := NULL;
      END IF;
    ELSIF v_my_prefs->>'orientation_pref' = 'doesnt_matter' THEN
      v_orientation_pref := NULL;
    ELSE
      v_orientation_pref := NULL;
    END IF;
  ELSE
    -- Anonymous users: default preferences (no orientation filtering)
    v_my_prefs := '{
      "show_me": "everyone",
      "age_min": 18,
      "age_max": 99
    }'::jsonb;
    v_show_me := 'everyone';
    v_orientation_pref := NULL;
  END IF;

  SELECT jsonb_agg(candidate_data)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'profile_id', dp.profile_id,
      'enabled', dp.enabled,
      'bio', COALESCE(dp.prefs->>'dating_bio', dp.bio),
      'location_text', dp.location_text,
      'photos', dp.photos,
      'prefs', dp.prefs,
      'created_at', dp.created_at,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'gender', p.gender,
      'age', COALESCE(
        calculate_age(p.date_of_birth),
        (dp.prefs->>'age')::int
      ),
      'height', dp.prefs->>'height',
      'build', dp.prefs->>'build',
      'religion', dp.prefs->>'religion',
      'smoker', dp.prefs->>'smoker',
      'drinker', dp.prefs->>'drinker',
      'interests', dp.prefs->'interests'
    ) AS candidate_data
    FROM dating_profiles dp
    JOIN profiles p ON p.id = dp.profile_id
    WHERE dp.enabled = true
      AND (v_profile_id IS NULL OR dp.profile_id != v_profile_id)
      AND (
        v_profile_id IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM dating_decisions dd
          WHERE dd.from_profile_id = v_profile_id
            AND dd.to_profile_id = dp.profile_id
        )
      )
      AND (
        v_profile_id IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM dating_matches dm
          WHERE (dm.profile_a = LEAST(v_profile_id, dp.profile_id)
             AND dm.profile_b = GREATEST(v_profile_id, dp.profile_id))
        )
      )
      AND (
        v_show_me = 'everyone'
        OR (v_show_me = 'men' AND p.gender = 'male')
        OR (v_show_me = 'women' AND p.gender = 'female')
      )
      AND (
        v_orientation_pref IS NULL
        OR (
          COALESCE(dp.prefs, '{}'::jsonb) ? 'orientation'
          AND (dp.prefs->>'orientation') = ANY(v_orientation_pref)
        )
      )
      AND (
        COALESCE(
          calculate_age(p.date_of_birth),
          (dp.prefs->>'age')::int
        ) IS NULL
        OR (
          COALESCE(
            calculate_age(p.date_of_birth),
            (dp.prefs->>'age')::int
          ) >= COALESCE((v_my_prefs->>'age_min')::int, 18)
          AND COALESCE(
            calculate_age(p.date_of_birth),
            (dp.prefs->>'age')::int
          ) <= COALESCE((v_my_prefs->>'age_max')::int, 99)
        )
      )
    ORDER BY dp.updated_at DESC, dp.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) candidates;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ============================================================================
-- 3. Ensure public profile API returns gender for reminder logic
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
    -- Get profile data (includes customization fields AND gender)
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
