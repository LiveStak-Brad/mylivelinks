-- ============================================================================
-- Add Social Media Fields to Profiles Table
-- ============================================================================
-- Add social media username fields for popular platforms
-- These will be displayed as icon links above the user's custom links
-- ============================================================================

DO $$ 
BEGIN
    -- Instagram
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='social_instagram') THEN
        ALTER TABLE profiles ADD COLUMN social_instagram VARCHAR(100);
    END IF;
    
    -- Twitter/X
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='social_twitter') THEN
        ALTER TABLE profiles ADD COLUMN social_twitter VARCHAR(100);
    END IF;
    
    -- YouTube
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='social_youtube') THEN
        ALTER TABLE profiles ADD COLUMN social_youtube VARCHAR(100);
    END IF;
    
    -- TikTok
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='social_tiktok') THEN
        ALTER TABLE profiles ADD COLUMN social_tiktok VARCHAR(100);
    END IF;
    
    -- Facebook
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='social_facebook') THEN
        ALTER TABLE profiles ADD COLUMN social_facebook VARCHAR(100);
    END IF;
    
    -- Twitch
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='social_twitch') THEN
        ALTER TABLE profiles ADD COLUMN social_twitch VARCHAR(100);
    END IF;
    
    -- Discord
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='social_discord') THEN
        ALTER TABLE profiles ADD COLUMN social_discord VARCHAR(100);
    END IF;
    
    -- Snapchat
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='social_snapchat') THEN
        ALTER TABLE profiles ADD COLUMN social_snapchat VARCHAR(100);
    END IF;
    
    -- LinkedIn
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='social_linkedin') THEN
        ALTER TABLE profiles ADD COLUMN social_linkedin VARCHAR(100);
    END IF;
    
    -- GitHub
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='social_github') THEN
        ALTER TABLE profiles ADD COLUMN social_github VARCHAR(100);
    END IF;
    
    -- Spotify
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='social_spotify') THEN
        ALTER TABLE profiles ADD COLUMN social_spotify VARCHAR(100);
    END IF;
    
    -- OnlyFans
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='social_onlyfans') THEN
        ALTER TABLE profiles ADD COLUMN social_onlyfans VARCHAR(100);
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN profiles.social_instagram IS 'Instagram username (without @)';
COMMENT ON COLUMN profiles.social_twitter IS 'Twitter/X username (without @)';
COMMENT ON COLUMN profiles.social_youtube IS 'YouTube channel username or ID';
COMMENT ON COLUMN profiles.social_tiktok IS 'TikTok username (without @)';
COMMENT ON COLUMN profiles.social_facebook IS 'Facebook username or page name';
COMMENT ON COLUMN profiles.social_twitch IS 'Twitch username';
COMMENT ON COLUMN profiles.social_discord IS 'Discord server invite code or username';
COMMENT ON COLUMN profiles.social_snapchat IS 'Snapchat username';
COMMENT ON COLUMN profiles.social_linkedin IS 'LinkedIn profile username';
COMMENT ON COLUMN profiles.social_github IS 'GitHub username';
COMMENT ON COLUMN profiles.social_spotify IS 'Spotify artist/profile ID';
COMMENT ON COLUMN profiles.social_onlyfans IS 'OnlyFans username';

-- Success message
SELECT 'Social media fields added to profiles table!' AS status;

