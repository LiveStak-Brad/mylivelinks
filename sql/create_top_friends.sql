-- ================================================
-- TOP FRIENDS FEATURE (MySpace-style)
-- ================================================
-- Allows users to curate up to 8 "top friends" on their profile
-- Similar to classic MySpace top friends functionality
-- ================================================

-- Create top_friends table
CREATE TABLE IF NOT EXISTS top_friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 8),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure unique positions per profile
  UNIQUE(profile_id, position),
  
  -- Ensure no duplicate friends per profile
  UNIQUE(profile_id, friend_id),
  
  -- Can't add yourself as a top friend
  CHECK (profile_id != friend_id)
);

-- Indexes for performance
CREATE INDEX idx_top_friends_profile_id ON top_friends(profile_id);
CREATE INDEX idx_top_friends_friend_id ON top_friends(friend_id);
CREATE INDEX idx_top_friends_position ON top_friends(profile_id, position);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_top_friends_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER top_friends_updated_at
  BEFORE UPDATE ON top_friends
  FOR EACH ROW
  EXECUTE FUNCTION update_top_friends_updated_at();

-- ================================================
-- RPC FUNCTIONS FOR TOP FRIENDS MANAGEMENT
-- ================================================

-- Get top friends for a profile (with full profile data)
CREATE OR REPLACE FUNCTION get_top_friends(p_profile_id UUID)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  friend_id UUID,
  position INTEGER,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_live BOOLEAN,
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
    tf.position,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.is_live,
    p.follower_count,
    p.total_gifts_received,
    p.gifter_level,
    tf.created_at
  FROM top_friends tf
  JOIN profiles p ON p.id = tf.friend_id
  WHERE tf.profile_id = p_profile_id
  ORDER BY tf.position ASC;
END;
$$ LANGUAGE plpgsql;

-- Add or update a top friend
CREATE OR REPLACE FUNCTION upsert_top_friend(
  p_friend_id UUID,
  p_position INTEGER
)
RETURNS JSON
SECURITY INVOKER
AS $$
DECLARE
  v_profile_id UUID;
  v_existing_position INTEGER;
  v_result JSON;
BEGIN
  -- Get current user
  v_profile_id := auth.uid();
  
  IF v_profile_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Validate position
  IF p_position < 1 OR p_position > 8 THEN
    RETURN json_build_object('success', false, 'error', 'Position must be between 1 and 8');
  END IF;
  
  -- Can't add yourself
  IF v_profile_id = p_friend_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot add yourself as a top friend');
  END IF;
  
  -- Check if friend exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_friend_id) THEN
    RETURN json_build_object('success', false, 'error', 'Friend profile not found');
  END IF;
  
  -- Check if this friend is already in a different position
  SELECT position INTO v_existing_position
  FROM top_friends
  WHERE profile_id = v_profile_id AND friend_id = p_friend_id;
  
  -- If friend exists in a different position, remove the old one
  IF v_existing_position IS NOT NULL AND v_existing_position != p_position THEN
    DELETE FROM top_friends
    WHERE profile_id = v_profile_id AND friend_id = p_friend_id;
  END IF;
  
  -- If the target position is occupied, shift everything down
  IF EXISTS (SELECT 1 FROM top_friends WHERE profile_id = v_profile_id AND position = p_position AND friend_id != p_friend_id) THEN
    -- Remove the friend at this position
    DELETE FROM top_friends
    WHERE profile_id = v_profile_id AND position = p_position;
  END IF;
  
  -- Insert or update the top friend
  INSERT INTO top_friends (profile_id, friend_id, position)
  VALUES (v_profile_id, p_friend_id, p_position)
  ON CONFLICT (profile_id, position) 
  DO UPDATE SET friend_id = p_friend_id, updated_at = now();
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- Remove a top friend
CREATE OR REPLACE FUNCTION remove_top_friend(p_friend_id UUID)
RETURNS JSON
SECURITY INVOKER
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Get current user
  v_profile_id := auth.uid();
  
  IF v_profile_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Delete the top friend
  DELETE FROM top_friends
  WHERE profile_id = v_profile_id AND friend_id = p_friend_id;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- Reorder top friends (swap positions)
CREATE OR REPLACE FUNCTION reorder_top_friends(
  p_friend_id UUID,
  p_new_position INTEGER
)
RETURNS JSON
SECURITY INVOKER
AS $$
DECLARE
  v_profile_id UUID;
  v_old_position INTEGER;
  v_friend_at_new_position UUID;
BEGIN
  -- Get current user
  v_profile_id := auth.uid();
  
  IF v_profile_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Validate position
  IF p_new_position < 1 OR p_new_position > 8 THEN
    RETURN json_build_object('success', false, 'error', 'Position must be between 1 and 8');
  END IF;
  
  -- Get current position of the friend
  SELECT position INTO v_old_position
  FROM top_friends
  WHERE profile_id = v_profile_id AND friend_id = p_friend_id;
  
  IF v_old_position IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Friend not in top friends list');
  END IF;
  
  -- Get friend at the new position (if any)
  SELECT friend_id INTO v_friend_at_new_position
  FROM top_friends
  WHERE profile_id = v_profile_id AND position = p_new_position;
  
  -- If there's a friend at the new position, swap them
  IF v_friend_at_new_position IS NOT NULL THEN
    UPDATE top_friends
    SET position = v_old_position
    WHERE profile_id = v_profile_id AND friend_id = v_friend_at_new_position;
  END IF;
  
  -- Move the friend to the new position
  UPDATE top_friends
  SET position = p_new_position
  WHERE profile_id = v_profile_id AND friend_id = p_friend_id;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE top_friends ENABLE ROW LEVEL SECURITY;

-- Anyone can view top friends
CREATE POLICY "Top friends are publicly viewable"
  ON top_friends FOR SELECT
  USING (true);

-- Only profile owner can insert their own top friends
CREATE POLICY "Users can insert their own top friends"
  ON top_friends FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Only profile owner can update their own top friends
CREATE POLICY "Users can update their own top friends"
  ON top_friends FOR UPDATE
  USING (auth.uid() = profile_id);

-- Only profile owner can delete their own top friends
CREATE POLICY "Users can delete their own top friends"
  ON top_friends FOR DELETE
  USING (auth.uid() = profile_id);

-- Grant execute on RPC functions
GRANT EXECUTE ON FUNCTION get_top_friends(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION upsert_top_friend(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_top_friend(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_top_friends(UUID, INTEGER) TO authenticated;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Top Friends feature created successfully!';
  RAISE NOTICE '   - Table: top_friends (max 8 friends per profile)';
  RAISE NOTICE '   - RPC Functions: get_top_friends, upsert_top_friend, remove_top_friend, reorder_top_friends';
  RAISE NOTICE '   - RLS Policies: Public view, owner edit';
END $$;

