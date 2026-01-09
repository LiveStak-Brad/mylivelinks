-- Fix get_top_friends RPC to include is_mll_pro field
-- This prevents all friends from showing PRO badge incorrectly

-- Drop existing function first to allow return type change
DROP FUNCTION IF EXISTS get_top_friends(UUID);

CREATE OR REPLACE FUNCTION get_top_friends(p_profile_id UUID)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  friend_id UUID,
  "position" INTEGER,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_live BOOLEAN,
  is_mll_pro BOOLEAN,
  follower_count INTEGER,
  total_gifts_received BIGINT,
  gifter_level INTEGER,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tf.id,
    tf.profile_id,
    tf.friend_id,
    tf.friend_position,
    p.username::TEXT,
    p.display_name::TEXT,
    p.avatar_url::TEXT,
    p.bio::TEXT,
    p.is_live,
    COALESCE(p.is_mll_pro, false) as is_mll_pro,
    p.follower_count,
    p.total_gifts_received,
    p.gifter_level,
    tf.created_at
  FROM top_friends tf
  JOIN profiles p ON p.id = tf.friend_id
  WHERE tf.profile_id = p_profile_id
  ORDER BY tf.friend_position ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_top_friends IS 'Returns top friends with full profile data including is_mll_pro status';
