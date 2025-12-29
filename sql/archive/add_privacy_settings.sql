-- Add privacy settings to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS hide_following BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hide_followers BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hide_friends BOOLEAN DEFAULT false;

-- Add comment explaining the columns
COMMENT ON COLUMN profiles.hide_following IS 'If true, only the user can see who they are following';
COMMENT ON COLUMN profiles.hide_followers IS 'If true, only the user can see who follows them';
COMMENT ON COLUMN profiles.hide_friends IS 'If true, only the user can see their friends list';

-- Update the update_user_profile RPC to handle privacy settings
CREATE OR REPLACE FUNCTION update_user_profile(
  user_id UUID,
  new_username TEXT DEFAULT NULL,
  new_display_name TEXT DEFAULT NULL,
  new_bio TEXT DEFAULT NULL,
  new_avatar_url TEXT DEFAULT NULL,
  new_banner_url TEXT DEFAULT NULL,
  new_location TEXT DEFAULT NULL,
  new_website TEXT DEFAULT NULL,
  new_twitter TEXT DEFAULT NULL,
  new_instagram TEXT DEFAULT NULL,
  new_tiktok TEXT DEFAULT NULL,
  new_youtube TEXT DEFAULT NULL,
  new_onlyfans TEXT DEFAULT NULL,
  new_hide_following BOOLEAN DEFAULT NULL,
  new_hide_followers BOOLEAN DEFAULT NULL,
  new_hide_friends BOOLEAN DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_profile json;
BEGIN
  -- Update profile with provided values (only update non-null params)
  UPDATE profiles
  SET
    username = COALESCE(new_username, username),
    display_name = COALESCE(new_display_name, display_name),
    bio = COALESCE(new_bio, bio),
    avatar_url = COALESCE(new_avatar_url, avatar_url),
    banner_url = COALESCE(new_banner_url, banner_url),
    location = COALESCE(new_location, location),
    website = COALESCE(new_website, website),
    twitter = COALESCE(new_twitter, twitter),
    instagram = COALESCE(new_instagram, instagram),
    tiktok = COALESCE(new_tiktok, tiktok),
    youtube = COALESCE(new_youtube, youtube),
    onlyfans = COALESCE(new_onlyfans, onlyfans),
    hide_following = COALESCE(new_hide_following, hide_following),
    hide_followers = COALESCE(new_hide_followers, hide_followers),
    hide_friends = COALESCE(new_hide_friends, hide_friends),
    updated_at = now()
  WHERE id = user_id;

  -- Return updated profile
  SELECT json_build_object(
    'id', id,
    'username', username,
    'display_name', display_name,
    'bio', bio,
    'avatar_url', avatar_url,
    'banner_url', banner_url,
    'location', location,
    'website', website,
    'twitter', twitter,
    'instagram', instagram,
    'tiktok', tiktok,
    'youtube', youtube,
    'onlyfans', onlyfans,
    'hide_following', hide_following,
    'hide_followers', hide_followers,
    'hide_friends', hide_friends,
    'created_at', created_at,
    'updated_at', updated_at
  )
  INTO result_profile
  FROM profiles
  WHERE id = user_id;

  RETURN result_profile;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_user_profile TO authenticated;

-- Index for privacy queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_profiles_privacy_settings 
ON profiles(hide_following, hide_followers, hide_friends);

