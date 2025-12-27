-- ============================================================================
-- INSTANT MESSAGES SCHEMA
-- Private 1-to-1 messaging between users
-- ============================================================================

-- Create instant_messages table
CREATE TABLE IF NOT EXISTS instant_messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ DEFAULT NULL,
  
  -- Prevent self-messaging
  CONSTRAINT no_self_messages CHECK (sender_id != recipient_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_im_sender ON instant_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_im_recipient ON instant_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_im_conversation ON instant_messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_im_unread ON instant_messages(recipient_id, read_at) WHERE read_at IS NULL;

-- RLS Policies
ALTER TABLE instant_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages they sent or received
CREATE POLICY "Users can read own messages"
  ON instant_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can send messages (insert)
CREATE POLICY "Users can send messages"
  ON instant_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can mark messages as read (update read_at only)
CREATE POLICY "Recipients can mark messages read"
  ON instant_messages FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Users can delete their own sent messages
CREATE POLICY "Senders can delete own messages"
  ON instant_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- ============================================================================
-- REALTIME SUBSCRIPTION
-- ============================================================================

-- Enable realtime for instant_messages
ALTER PUBLICATION supabase_realtime ADD TABLE instant_messages;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get conversation between two users
CREATE OR REPLACE FUNCTION get_conversation(
  p_user_id UUID,
  p_other_user_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  sender_id UUID,
  recipient_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT im.id, im.sender_id, im.recipient_id, im.content, im.created_at, im.read_at
  FROM instant_messages im
  WHERE 
    (im.sender_id = p_user_id AND im.recipient_id = p_other_user_id)
    OR (im.sender_id = p_other_user_id AND im.recipient_id = p_user_id)
  ORDER BY im.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Mark all messages from a user as read
CREATE OR REPLACE FUNCTION mark_messages_read(
  p_user_id UUID,
  p_sender_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INT;
BEGIN
  UPDATE instant_messages
  SET read_at = NOW()
  WHERE recipient_id = p_user_id
    AND sender_id = p_sender_id
    AND read_at IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Get unread message count
CREATE OR REPLACE FUNCTION get_unread_im_count(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_val INT;
BEGIN
  SELECT COUNT(*)::INT INTO count_val
  FROM instant_messages
  WHERE recipient_id = p_user_id AND read_at IS NULL;
  
  RETURN count_val;
END;
$$;

-- Get list of conversations with last message
CREATE OR REPLACE FUNCTION get_im_conversations(p_user_id UUID)
RETURNS TABLE (
  other_user_id UUID,
  other_username TEXT,
  other_avatar_url TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT,
  is_sender BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH conversations AS (
    SELECT DISTINCT ON (
      CASE WHEN sender_id = p_user_id THEN recipient_id ELSE sender_id END
    )
      CASE WHEN sender_id = p_user_id THEN recipient_id ELSE sender_id END as other_id,
      content as last_msg,
      created_at as last_at,
      sender_id = p_user_id as sent_by_me
    FROM instant_messages
    WHERE sender_id = p_user_id OR recipient_id = p_user_id
    ORDER BY 
      CASE WHEN sender_id = p_user_id THEN recipient_id ELSE sender_id END,
      created_at DESC
  ),
  unread_counts AS (
    SELECT sender_id, COUNT(*) as cnt
    FROM instant_messages
    WHERE recipient_id = p_user_id AND read_at IS NULL
    GROUP BY sender_id
  )
  SELECT 
    c.other_id,
    p.username::text,
    p.avatar_url::text,
    c.last_msg::text,
    c.last_at,
    COALESCE(u.cnt, 0),
    c.sent_by_me
  FROM conversations c
  JOIN profiles p ON p.id = c.other_id
  LEFT JOIN unread_counts u ON u.sender_id = c.other_id
  ORDER BY c.last_at DESC;
END;
$$;

