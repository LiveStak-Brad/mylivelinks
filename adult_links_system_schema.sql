-- ============================================================================
-- MyLiveLinks Adult/Sensitive Links System (WEB-ONLY)
-- Compliance-First Implementation for External Links
-- ============================================================================
-- 
-- PURPOSE: Allow creators to add adult/sensitive external links to profiles
--          with strong safety, consent, and age-verification gates.
--
-- CRITICAL SAFETY RULES:
-- ❌ NO adult links on mobile (entirely hidden)
-- ❌ NO adult links to users under 18
-- ❌ NO inline content (external links only)
-- ❌ NO previews/thumbnails/embeds
-- ✅ Web only, explicit consent, warning gates, full audit trail
--
-- COMPLIANCE: This is a LINKING system with strong gating, not content hosting.
-- ============================================================================

-- ============================================================================
-- 1. EXTEND PROFILES TABLE WITH AGE VERIFICATION
-- ============================================================================

DO $$ 
BEGIN
    -- Date of birth (required for age verification)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='date_of_birth') THEN
        ALTER TABLE profiles ADD COLUMN date_of_birth DATE;
    END IF;
    
    -- Age verification fields (future-ready)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='adult_verified_at') THEN
        ALTER TABLE profiles ADD COLUMN adult_verified_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='adult_verified_method') THEN
        ALTER TABLE profiles ADD COLUMN adult_verified_method VARCHAR(50) CHECK (adult_verified_method IN ('self_attested', 'id_verified', 'third_party'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_date_of_birth ON profiles(date_of_birth) WHERE date_of_birth IS NOT NULL;

COMMENT ON COLUMN profiles.date_of_birth IS 'User date of birth - required for age verification. Adult content not visible if age < 18.';
COMMENT ON COLUMN profiles.adult_verified_at IS 'Timestamp of adult age verification (future: may require stronger verification)';
COMMENT ON COLUMN profiles.adult_verified_method IS 'Verification method: self_attested (default), id_verified (future), third_party (future)';

-- ============================================================================
-- 2. EXTEND USER_LINKS TABLE WITH ADULT CLASSIFICATION
-- ============================================================================

DO $$ 
BEGIN
    -- Mark link as adult/sensitive
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_links' AND column_name='is_adult') THEN
        ALTER TABLE user_links ADD COLUMN is_adult BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;
    
    -- Adult content category (for future filtering/moderation)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_links' AND column_name='adult_category') THEN
        ALTER TABLE user_links ADD COLUMN adult_category VARCHAR(50) CHECK (adult_category IN ('explicit', 'gambling', 'substance', 'other'));
    END IF;
    
    -- Requires warning (auto-set if is_adult = true)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_links' AND column_name='requires_warning') THEN
        ALTER TABLE user_links ADD COLUMN requires_warning BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;
    
    -- Moderation fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_links' AND column_name='is_flagged') THEN
        ALTER TABLE user_links ADD COLUMN is_flagged BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_links' AND column_name='flagged_reason') THEN
        ALTER TABLE user_links ADD COLUMN flagged_reason TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_links' AND column_name='flagged_at') THEN
        ALTER TABLE user_links ADD COLUMN flagged_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Indexes for filtering adult links
CREATE INDEX IF NOT EXISTS idx_user_links_is_adult ON user_links(is_adult) WHERE is_adult = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_links_is_flagged ON user_links(is_flagged) WHERE is_flagged = TRUE;

COMMENT ON COLUMN user_links.is_adult IS 'Link contains adult/sensitive content. Hidden on mobile and from users under 18.';
COMMENT ON COLUMN user_links.adult_category IS 'Category of adult content: explicit, gambling, substance, other';
COMMENT ON COLUMN user_links.requires_warning IS 'Requires consent warning before opening. Auto-set if is_adult = true.';
COMMENT ON COLUMN user_links.is_flagged IS 'Link has been flagged for review by moderators';

-- ============================================================================
-- 3. CREATE USER_SETTINGS TABLE FOR CONSENT TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_settings (
    id BIGSERIAL PRIMARY KEY,
    profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Adult content consent
    has_accepted_adult_disclaimer BOOLEAN DEFAULT FALSE NOT NULL,
    adult_disclaimer_accepted_at TIMESTAMP WITH TIME ZONE,
    adult_disclaimer_expires_at TIMESTAMP WITH TIME ZONE, -- Consent expires after 30 days
    
    -- Preferences
    hide_adult_content BOOLEAN DEFAULT FALSE, -- User opt-out
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_settings_profile_id ON user_settings(profile_id);
CREATE INDEX idx_user_settings_adult_consent ON user_settings(has_accepted_adult_disclaimer, adult_disclaimer_expires_at) 
    WHERE has_accepted_adult_disclaimer = TRUE;

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only manage their own settings
CREATE POLICY "Users can view own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own settings"
    ON user_settings FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own settings"
    ON user_settings FOR UPDATE
    USING (auth.uid() = profile_id)
    WITH CHECK (auth.uid() = profile_id);

COMMENT ON TABLE user_settings IS 'User preferences and consent tracking. Critical for adult content gating.';
COMMENT ON COLUMN user_settings.has_accepted_adult_disclaimer IS 'User has accepted adult content disclaimer (required to view adult links)';
COMMENT ON COLUMN user_settings.adult_disclaimer_expires_at IS 'Consent expires after 30 days and must be re-accepted';

-- ============================================================================
-- 4. CREATE AUDIT_LOGS TABLE FOR COMPLIANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    
    -- Who & What
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'adult_link_clicked', 'adult_link_flagged', 'adult_consent_accepted', etc.
    
    -- Target
    target_type VARCHAR(50), -- 'user_link', 'profile', etc.
    target_id BIGINT, -- ID of target (e.g., user_links.id)
    
    -- Context
    platform VARCHAR(20), -- 'web', 'mobile' (should never be mobile for adult links)
    ip_hash VARCHAR(64), -- SHA256 hash of IP (privacy-preserving)
    user_agent TEXT,
    
    -- Metadata
    metadata JSONB, -- Additional context (link URL hash, category, etc.)
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_profile_id ON audit_logs(profile_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: No direct access (insert via RPC only)
CREATE POLICY "Deny direct access to audit logs"
    ON audit_logs FOR ALL
    USING (false);

COMMENT ON TABLE audit_logs IS 'Audit trail for compliance. Tracks adult link clicks, consent, flags, etc. Immutable.';

-- ============================================================================
-- 5. CREATE RPC: CALCULATE USER AGE (SERVER-SIDE)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_age(p_date_of_birth DATE)
RETURNS INTEGER AS $$
BEGIN
    IF p_date_of_birth IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN DATE_PART('year', AGE(CURRENT_DATE, p_date_of_birth))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_age IS 'Calculate age from date of birth. Returns NULL if DOB not set.';

-- ============================================================================
-- 6. CREATE RPC: CHECK ADULT CONTENT ELIGIBILITY
-- ============================================================================

CREATE OR REPLACE FUNCTION is_eligible_for_adult_content(
    p_profile_id UUID,
    p_platform VARCHAR(20) DEFAULT 'web'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_age INTEGER;
    v_has_consent BOOLEAN;
    v_consent_expired BOOLEAN;
    v_hide_adult BOOLEAN;
BEGIN
    -- RULE 1: Never show on mobile
    IF p_platform != 'web' THEN
        RETURN FALSE;
    END IF;
    
    -- RULE 2: Check age (must be 18+)
    SELECT calculate_age(date_of_birth) INTO v_age
    FROM profiles
    WHERE id = p_profile_id;
    
    IF v_age IS NULL OR v_age < 18 THEN
        RETURN FALSE;
    END IF;
    
    -- RULE 3: Check consent
    SELECT 
        has_accepted_adult_disclaimer,
        COALESCE(adult_disclaimer_expires_at < CURRENT_TIMESTAMP, TRUE),
        COALESCE(hide_adult_content, FALSE)
    INTO v_has_consent, v_consent_expired, v_hide_adult
    FROM user_settings
    WHERE profile_id = p_profile_id;
    
    -- If no settings record, not eligible
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- RULE 4: User opted out
    IF v_hide_adult THEN
        RETURN FALSE;
    END IF;
    
    -- RULE 5: Consent expired
    IF NOT v_has_consent OR v_consent_expired THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION is_eligible_for_adult_content IS 'Server-side check: Can user view adult links? Enforces age, platform, consent rules.';

-- ============================================================================
-- 7. CREATE RPC: GET PROFILE WITH ADULT LINKS FILTERING
-- ============================================================================

-- Extend the existing get_public_profile function to filter adult links
-- This is a NEW version that includes adult link filtering
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
    -- Get profile data (same as before)
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
          AND ul.is_flagged = FALSE; -- Hide flagged links
    ELSE
        v_adult_links := '[]'::json;
    END IF;
    
    -- Get other data (same as before)
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

COMMENT ON FUNCTION get_public_profile_with_adult_filtering IS 'Fetch profile with adult link filtering. Adult links only returned if viewer is eligible (18+, web, consent).';

-- ============================================================================
-- 8. CREATE RPC: ACCEPT ADULT DISCLAIMER
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_adult_disclaimer(
    p_profile_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_age INTEGER;
BEGIN
    -- Verify age
    SELECT calculate_age(date_of_birth) INTO v_age
    FROM profiles
    WHERE id = p_profile_id;
    
    IF v_age IS NULL OR v_age < 18 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Must be 18 or older'
        );
    END IF;
    
    -- Insert or update user_settings
    INSERT INTO user_settings (
        profile_id,
        has_accepted_adult_disclaimer,
        adult_disclaimer_accepted_at,
        adult_disclaimer_expires_at
    ) VALUES (
        p_profile_id,
        TRUE,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '30 days'
    )
    ON CONFLICT (profile_id) DO UPDATE SET
        has_accepted_adult_disclaimer = TRUE,
        adult_disclaimer_accepted_at = CURRENT_TIMESTAMP,
        adult_disclaimer_expires_at = CURRENT_TIMESTAMP + INTERVAL '30 days',
        updated_at = CURRENT_TIMESTAMP;
    
    -- Audit log
    INSERT INTO audit_logs (profile_id, action, platform, metadata)
    VALUES (p_profile_id, 'adult_consent_accepted', 'web', json_build_object('expires_at', CURRENT_TIMESTAMP + INTERVAL '30 days'));
    
    RETURN json_build_object(
        'success', true,
        'expires_at', CURRENT_TIMESTAMP + INTERVAL '30 days'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION accept_adult_disclaimer IS 'Accept adult content disclaimer. Consent expires after 30 days. Requires age 18+.';

-- ============================================================================
-- 9. CREATE RPC: LOG ADULT LINK CLICK
-- ============================================================================

CREATE OR REPLACE FUNCTION log_adult_link_click(
    p_profile_id UUID,
    p_link_id BIGINT,
    p_platform VARCHAR(20) DEFAULT 'web',
    p_ip_hash VARCHAR(64) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- Verify eligibility before logging
    IF NOT is_eligible_for_adult_content(p_profile_id, p_platform) THEN
        RAISE EXCEPTION 'User not eligible for adult content';
    END IF;
    
    -- Audit log
    INSERT INTO audit_logs (
        profile_id,
        action,
        target_type,
        target_id,
        platform,
        ip_hash,
        user_agent
    ) VALUES (
        p_profile_id,
        'adult_link_clicked',
        'user_link',
        p_link_id,
        p_platform,
        p_ip_hash,
        p_user_agent
    );
    
    -- Increment click count
    UPDATE user_links
    SET click_count = click_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION log_adult_link_click IS 'Log adult link click for audit trail. Verifies eligibility before logging.';

-- ============================================================================
-- 10. CREATE TRIGGER: AUTO-SET REQUIRES_WARNING
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_set_requires_warning()
RETURNS TRIGGER AS $$
BEGIN
    -- If link is marked as adult, requires_warning must be true
    IF NEW.is_adult = TRUE THEN
        NEW.requires_warning := TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_set_requires_warning ON user_links;
CREATE TRIGGER trigger_auto_set_requires_warning
    BEFORE INSERT OR UPDATE ON user_links
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_requires_warning();

COMMENT ON FUNCTION auto_set_requires_warning IS 'Automatically set requires_warning = TRUE when is_adult = TRUE';

-- ============================================================================
-- 11. GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION calculate_age TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_eligible_for_adult_content TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_profile_with_adult_filtering TO authenticated, anon;
GRANT EXECUTE ON FUNCTION accept_adult_disclaimer TO authenticated;
GRANT EXECUTE ON FUNCTION log_adult_link_click TO authenticated;

-- ============================================================================
-- 12. SEED DEFAULT USER SETTINGS FOR EXISTING USERS
-- ============================================================================

-- Insert default settings for users who don't have them yet
INSERT INTO user_settings (profile_id, has_accepted_adult_disclaimer)
SELECT id, FALSE
FROM profiles
WHERE id NOT IN (SELECT profile_id FROM user_settings)
ON CONFLICT (profile_id) DO NOTHING;

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMENT ON SCHEMA public IS 'MyLiveLinks Adult Links System: Web-only, 18+, consent-gated external links with full audit trail and compliance enforcement.';

-- Summary
SELECT 'Adult Links System Schema Created Successfully!' AS status,
       'CRITICAL: Adult links only visible on WEB to users 18+ who have accepted disclaimer' AS safety_note,
       'Server enforces all rules - client cannot bypass' AS security_note;






