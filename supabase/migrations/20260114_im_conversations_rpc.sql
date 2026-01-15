-- Deploy get_im_conversations RPC for mobile messages list
-- This function returns all conversations for a user with last message info

BEGIN;

-- Get list of conversations with last message
CREATE OR REPLACE FUNCTION public.get_im_conversations(p_user_id UUID)
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
SET search_path = public
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

-- Also ensure mark_messages_read exists
CREATE OR REPLACE FUNCTION public.mark_messages_read(
  p_user_id UUID,
  p_sender_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Ensure get_conversation exists for thread loading
CREATE OR REPLACE FUNCTION public.get_conversation(
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
SET search_path = public
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

COMMIT;
