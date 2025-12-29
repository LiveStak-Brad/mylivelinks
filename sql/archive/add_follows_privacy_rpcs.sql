-- RPC: Get user's following list (with privacy check)
CREATE OR REPLACE FUNCTION get_user_following(
  target_user_id UUID,
  requesting_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  followed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_hidden BOOLEAN;
BEGIN
  -- Check if the target user has hidden their following list
  SELECT hide_following INTO is_hidden
  FROM profiles
  WHERE profiles.id = target_user_id;

  -- If hidden and not the owner, return empty result
  IF is_hidden AND (requesting_user_id IS NULL OR requesting_user_id != target_user_id) THEN
    RETURN;
  END IF;

  -- Return following list
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    f.followed_at
  FROM follows f
  JOIN profiles p ON f.followee_id = p.id
  WHERE f.follower_id = target_user_id
  ORDER BY f.followed_at DESC;
END;
$$;

-- RPC: Get user's followers list (with privacy check)
CREATE OR REPLACE FUNCTION get_user_followers(
  target_user_id UUID,
  requesting_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  followed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_hidden BOOLEAN;
BEGIN
  -- Check if the target user has hidden their followers list
  SELECT hide_followers INTO is_hidden
  FROM profiles
  WHERE profiles.id = target_user_id;

  -- If hidden and not the owner, return empty result
  IF is_hidden AND (requesting_user_id IS NULL OR requesting_user_id != target_user_id) THEN
    RETURN;
  END IF;

  -- Return followers list
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    f.followed_at
  FROM follows f
  JOIN profiles p ON f.follower_id = p.id
  WHERE f.followee_id = target_user_id
  ORDER BY f.followed_at DESC;
END;
$$;

-- RPC: Get user's friends list (mutual follows with privacy check)
CREATE OR REPLACE FUNCTION get_user_friends(
  target_user_id UUID,
  requesting_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  friends_since TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_hidden BOOLEAN;
BEGIN
  -- Check if the target user has hidden their friends list
  SELECT hide_friends INTO is_hidden
  FROM profiles
  WHERE profiles.id = target_user_id;

  -- If hidden and not the owner, return empty result
  IF is_hidden AND (requesting_user_id IS NULL OR requesting_user_id != target_user_id) THEN
    RETURN;
  END IF;

  -- Return friends list (mutual follows)
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    GREATEST(f1.followed_at, f2.followed_at) as friends_since
  FROM follows f1
  JOIN follows f2 ON f1.followee_id = f2.follower_id AND f1.follower_id = f2.followee_id
  JOIN profiles p ON f1.followee_id = p.id
  WHERE f1.follower_id = target_user_id
  ORDER BY friends_since DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_following TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_following TO anon;

GRANT EXECUTE ON FUNCTION get_user_followers TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_followers TO anon;

GRANT EXECUTE ON FUNCTION get_user_friends TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_friends TO anon;

-- Add helper function to check if lists are visible to a user
CREATE OR REPLACE FUNCTION can_view_user_lists(
  target_user_id UUID,
  requesting_user_id UUID DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Check privacy settings
  SELECT json_build_object(
    'can_view_following', NOT hide_following OR requesting_user_id = target_user_id,
    'can_view_followers', NOT hide_followers OR requesting_user_id = target_user_id,
    'can_view_friends', NOT hide_friends OR requesting_user_id = target_user_id
  )
  INTO result
  FROM profiles
  WHERE id = target_user_id;

  RETURN COALESCE(result, json_build_object(
    'can_view_following', true,
    'can_view_followers', true,
    'can_view_friends', true
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION can_view_user_lists TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_user_lists TO anon;

