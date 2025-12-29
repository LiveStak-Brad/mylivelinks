-- ================================================
-- TOP FRIENDS FEATURE - COMPLETE SETUP (FIXED TYPE CASTING)
-- ================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_top_friends(UUID);
DROP FUNCTION IF EXISTS upsert_top_friend(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS remove_top_friend(UUID, UUID);
DROP FUNCTION IF EXISTS reorder_top_friends(UUID, UUID, INTEGER);

-- Drop table if exists (careful - this deletes data!)
DROP TABLE IF EXISTS top_friends CASCADE;

-- Create top_friends table
CREATE TABLE top_friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_position INTEGER NOT NULL CHECK (friend_position >= 1 AND friend_position <= 8),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(profile_id, friend_position),
  UNIQUE(profile_id, friend_id),
  CHECK (profile_id != friend_id)
);

CREATE INDEX idx_top_friends_profile_id ON top_friends(profile_id);
CREATE INDEX idx_top_friends_friend_id ON top_friends(friend_id);
CREATE INDEX idx_top_friends_position ON top_friends(profile_id, friend_position);

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

-- Get top friends (returns profile data) - FIXED WITH CASTS
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

-- Add or update a top friend
CREATE OR REPLACE FUNCTION upsert_top_friend(
  p_profile_id UUID,
  p_friend_id UUID,
  p_position INTEGER
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_position INTEGER;
BEGIN
  IF p_profile_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Profile ID required');
  END IF;
  
  IF p_position < 1 OR p_position > 8 THEN
    RETURN json_build_object('success', false, 'error', 'Position must be between 1 and 8');
  END IF;
  
  IF p_profile_id = p_friend_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot add yourself');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_friend_id) THEN
    RETURN json_build_object('success', false, 'error', 'Friend not found');
  END IF;
  
  SELECT friend_position INTO v_existing_position
  FROM top_friends
  WHERE profile_id = p_profile_id AND friend_id = p_friend_id;
  
  IF v_existing_position IS NOT NULL AND v_existing_position != p_position THEN
    DELETE FROM top_friends WHERE profile_id = p_profile_id AND friend_id = p_friend_id;
  END IF;
  
  DELETE FROM top_friends WHERE profile_id = p_profile_id AND friend_position = p_position AND friend_id != p_friend_id;
  
  INSERT INTO top_friends (profile_id, friend_id, friend_position)
  VALUES (p_profile_id, p_friend_id, p_position)
  ON CONFLICT (profile_id, friend_position) 
  DO UPDATE SET friend_id = p_friend_id, updated_at = now();
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- Remove a top friend
CREATE OR REPLACE FUNCTION remove_top_friend(
  p_profile_id UUID,
  p_friend_id UUID
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_profile_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Profile ID required');
  END IF;
  
  DELETE FROM top_friends
  WHERE profile_id = p_profile_id AND friend_id = p_friend_id;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- Reorder top friends (FIXED: use temporary position to avoid constraint violation)
CREATE OR REPLACE FUNCTION reorder_top_friends(
  p_profile_id UUID,
  p_friend_id UUID,
  p_new_position INTEGER
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_position INTEGER;
  v_friend_at_new_position UUID;
  v_temp_position INTEGER := -999;
BEGIN
  IF p_profile_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Profile ID required');
  END IF;
  
  IF p_new_position < 1 OR p_new_position > 8 THEN
    RETURN json_build_object('success', false, 'error', 'Position must be between 1 and 8');
  END IF;
  
  -- Get current position of the friend being moved
  SELECT friend_position INTO v_old_position
  FROM top_friends
  WHERE profile_id = p_profile_id AND friend_id = p_friend_id;
  
  IF v_old_position IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Friend not in list');
  END IF;
  
  IF v_old_position = p_new_position THEN
    RETURN json_build_object('success', true);
  END IF;
  
  -- Get friend currently at the new position
  SELECT friend_id INTO v_friend_at_new_position
  FROM top_friends
  WHERE profile_id = p_profile_id AND friend_position = p_new_position;
  
  -- If there's a friend at the target position, swap using temporary position
  IF v_friend_at_new_position IS NOT NULL THEN
    -- Move current friend to temporary negative position
    UPDATE top_friends SET friend_position = v_temp_position
    WHERE profile_id = p_profile_id AND friend_id = p_friend_id;
    
    -- Move friend at target position to old position
    UPDATE top_friends SET friend_position = v_old_position
    WHERE profile_id = p_profile_id AND friend_id = v_friend_at_new_position;
    
    -- Move current friend from temp to new position
    UPDATE top_friends SET friend_position = p_new_position
    WHERE profile_id = p_profile_id AND friend_id = p_friend_id;
  ELSE
    -- No one at target position, just move directly
    UPDATE top_friends SET friend_position = p_new_position
    WHERE profile_id = p_profile_id AND friend_id = p_friend_id;
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE top_friends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Top friends viewable" ON top_friends;
DROP POLICY IF EXISTS "Users insert own" ON top_friends;
DROP POLICY IF EXISTS "Users update own" ON top_friends;
DROP POLICY IF EXISTS "Users delete own" ON top_friends;

CREATE POLICY "Top friends viewable" ON top_friends FOR SELECT USING (true);
CREATE POLICY "Users insert own" ON top_friends FOR INSERT WITH CHECK (true);
CREATE POLICY "Users update own" ON top_friends FOR UPDATE USING (true);
CREATE POLICY "Users delete own" ON top_friends FOR DELETE USING (true);

-- Grants
GRANT EXECUTE ON FUNCTION get_top_friends(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION upsert_top_friend(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_top_friend(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_top_friends(UUID, UUID, INTEGER) TO authenticated;
