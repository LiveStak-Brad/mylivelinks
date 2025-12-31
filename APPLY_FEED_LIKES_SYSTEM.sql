-- Apply Feed Post Likes System
-- Run this on Supabase SQL Editor

BEGIN;

-- Add likes_count column to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

-- Add likes_count column to post_comments table
ALTER TABLE public.post_comments 
ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

-- Create post_likes table (dedupe: one like per user per post)
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id 
ON public.post_likes(post_id);

CREATE INDEX IF NOT EXISTS idx_post_likes_profile_id 
ON public.post_likes(profile_id);

-- Create post_comment_likes table (dedupe: one like per user per comment)
CREATE TABLE IF NOT EXISTS public.post_comment_likes (
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_post_comment_likes_comment_id 
ON public.post_comment_likes(comment_id);

CREATE INDEX IF NOT EXISTS idx_post_comment_likes_profile_id 
ON public.post_comment_likes(profile_id);

-- Enable RLS
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can view likes
DROP POLICY IF EXISTS "Anyone can view post likes" ON public.post_likes;
CREATE POLICY "Anyone can view post likes"
ON public.post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.post_comment_likes;
CREATE POLICY "Anyone can view comment likes"
ON public.post_comment_likes FOR SELECT USING (true);

-- RLS: Authenticated users can insert own likes
DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
CREATE POLICY "Users can like posts"
ON public.post_likes FOR INSERT
WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can like comments" ON public.post_comment_likes;
CREATE POLICY "Users can like comments"
ON public.post_comment_likes FOR INSERT
WITH CHECK (auth.uid() = profile_id);

GRANT SELECT ON TABLE public.post_likes TO anon, authenticated;
GRANT INSERT ON TABLE public.post_likes TO authenticated;

GRANT SELECT ON TABLE public.post_comment_likes TO anon, authenticated;
GRANT INSERT ON TABLE public.post_comment_likes TO authenticated;

-- ============================================================================
-- RPC: Like a post (insert-only, no unlike)
-- ============================================================================
DROP FUNCTION IF EXISTS rpc_like_post(UUID, UUID);

CREATE OR REPLACE FUNCTION rpc_like_post(
  p_post_id UUID,
  p_profile_id UUID
)
RETURNS TABLE(is_liked BOOLEAN, likes_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_liked BOOLEAN;
  v_new_count INTEGER;
BEGIN
  -- Check if already liked
  SELECT EXISTS(
    SELECT 1 FROM post_likes 
    WHERE post_id = p_post_id AND profile_id = p_profile_id
  ) INTO v_already_liked;

  IF NOT v_already_liked THEN
    -- Insert like
    INSERT INTO post_likes (post_id, profile_id)
    VALUES (p_post_id, p_profile_id)
    ON CONFLICT (post_id, profile_id) DO NOTHING;

    -- Increment counter
    UPDATE posts 
    SET likes_count = likes_count + 1
    WHERE id = p_post_id;
  END IF;

  -- Return current state
  SELECT posts.likes_count INTO v_new_count
  FROM posts
  WHERE id = p_post_id;

  RETURN QUERY SELECT true::BOOLEAN, COALESCE(v_new_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_like_post(UUID, UUID) TO authenticated;

-- ============================================================================
-- RPC: Like a comment (insert-only, no unlike)
-- ============================================================================
DROP FUNCTION IF EXISTS rpc_like_comment(UUID, UUID);

CREATE OR REPLACE FUNCTION rpc_like_comment(
  p_comment_id UUID,
  p_profile_id UUID
)
RETURNS TABLE(is_liked BOOLEAN, likes_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_liked BOOLEAN;
  v_new_count INTEGER;
BEGIN
  -- Check if already liked
  SELECT EXISTS(
    SELECT 1 FROM post_comment_likes 
    WHERE comment_id = p_comment_id AND profile_id = p_profile_id
  ) INTO v_already_liked;

  IF NOT v_already_liked THEN
    -- Insert like
    INSERT INTO post_comment_likes (comment_id, profile_id)
    VALUES (p_comment_id, p_profile_id)
    ON CONFLICT (comment_id, profile_id) DO NOTHING;

    -- Increment counter
    UPDATE post_comments 
    SET likes_count = likes_count + 1
    WHERE id = p_comment_id;
  END IF;

  -- Return current state
  SELECT post_comments.likes_count INTO v_new_count
  FROM post_comments
  WHERE id = p_comment_id;

  RETURN QUERY SELECT true::BOOLEAN, COALESCE(v_new_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_like_comment(UUID, UUID) TO authenticated;

-- ============================================================================
-- RPC: Get user's liked posts
-- ============================================================================
DROP FUNCTION IF EXISTS rpc_get_user_post_likes(UUID, UUID[]);

CREATE OR REPLACE FUNCTION rpc_get_user_post_likes(
  p_profile_id UUID,
  p_post_ids UUID[]
)
RETURNS TABLE(post_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pl.post_id
  FROM post_likes pl
  WHERE pl.profile_id = p_profile_id
    AND pl.post_id = ANY(p_post_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_get_user_post_likes(UUID, UUID[]) TO authenticated;

-- ============================================================================
-- RPC: Get user's liked comments
-- ============================================================================
DROP FUNCTION IF EXISTS rpc_get_user_comment_likes(UUID, UUID[]);

CREATE OR REPLACE FUNCTION rpc_get_user_comment_likes(
  p_profile_id UUID,
  p_comment_ids UUID[]
)
RETURNS TABLE(comment_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT cl.comment_id
  FROM post_comment_likes cl
  WHERE cl.profile_id = p_profile_id
    AND cl.comment_id = ANY(p_comment_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_get_user_comment_likes(UUID, UUID[]) TO authenticated;

-- ============================================================================
-- Notifications System
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGSERIAL PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notifications_type_check CHECK (type IN ('like_post', 'like_comment', 'comment', 'follow', 'gift', 'system'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created 
ON public.notifications(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read 
ON public.notifications(recipient_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = recipient_id);

-- RLS: Users can mark their own notifications as read
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

GRANT SELECT, UPDATE ON TABLE public.notifications TO authenticated;

-- ============================================================================
-- Trigger: Create notification when someone likes a post
-- ============================================================================
DROP FUNCTION IF EXISTS notify_post_like() CASCADE;

CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author_id UUID;
  v_actor_username TEXT;
BEGIN
  -- Get post author
  SELECT author_id INTO v_post_author_id
  FROM posts WHERE id = NEW.post_id;

  -- Don't notify if user liked their own post
  IF v_post_author_id = NEW.profile_id THEN
    RETURN NEW;
  END IF;

  -- Get actor username
  SELECT username INTO v_actor_username
  FROM profiles WHERE id = NEW.profile_id;

  -- Create notification
  INSERT INTO notifications (recipient_id, actor_id, type, entity_type, entity_id, message)
  VALUES (
    v_post_author_id,
    NEW.profile_id,
    'like_post',
    'post',
    NEW.post_id::TEXT,
    v_actor_username || ' liked your post'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_like ON public.post_likes;
CREATE TRIGGER trg_notify_post_like
AFTER INSERT ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION notify_post_like();

-- ============================================================================
-- Trigger: Create notification when someone likes a comment
-- ============================================================================
DROP FUNCTION IF EXISTS notify_comment_like() CASCADE;

CREATE OR REPLACE FUNCTION notify_comment_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment_author_id UUID;
  v_actor_username TEXT;
BEGIN
  -- Get comment author
  SELECT author_id INTO v_comment_author_id
  FROM post_comments WHERE id = NEW.comment_id;

  -- Don't notify if user liked their own comment
  IF v_comment_author_id = NEW.profile_id THEN
    RETURN NEW;
  END IF;

  -- Get actor username
  SELECT username INTO v_actor_username
  FROM profiles WHERE id = NEW.profile_id;

  -- Create notification
  INSERT INTO notifications (recipient_id, actor_id, type, entity_type, entity_id, message)
  VALUES (
    v_comment_author_id,
    NEW.profile_id,
    'like_comment',
    'comment',
    NEW.comment_id::TEXT,
    v_actor_username || ' liked your comment'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comment_like ON public.post_comment_likes;
CREATE TRIGGER trg_notify_comment_like
AFTER INSERT ON public.post_comment_likes
FOR EACH ROW
EXECUTE FUNCTION notify_comment_like();

-- ============================================================================
-- Trigger: Create notification when someone comments on a post
-- ============================================================================
DROP FUNCTION IF EXISTS notify_post_comment() CASCADE;

CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author_id UUID;
  v_actor_username TEXT;
BEGIN
  -- Get post author
  SELECT author_id INTO v_post_author_id
  FROM posts WHERE id = NEW.post_id;

  -- Don't notify if user commented on their own post
  IF v_post_author_id = NEW.author_id THEN
    RETURN NEW;
  END IF;

  -- Get actor username
  SELECT username INTO v_actor_username
  FROM profiles WHERE id = NEW.author_id;

  -- Create notification
  INSERT INTO notifications (recipient_id, actor_id, type, entity_type, entity_id, message)
  VALUES (
    v_post_author_id,
    NEW.author_id,
    'comment',
    'post',
    NEW.post_id::TEXT,
    v_actor_username || ' commented on your post'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_comment ON public.post_comments;
CREATE TRIGGER trg_notify_post_comment
AFTER INSERT ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION notify_post_comment();

-- ============================================================================
-- RPC: Mark notification as read
-- ============================================================================
DROP FUNCTION IF EXISTS rpc_mark_notification_read(BIGINT);

CREATE OR REPLACE FUNCTION rpc_mark_notification_read(
  p_notification_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE id = p_notification_id
    AND recipient_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_mark_notification_read(BIGINT) TO authenticated;

-- ============================================================================
-- RPC: Mark all notifications as read
-- ============================================================================
DROP FUNCTION IF EXISTS rpc_mark_all_notifications_read();

CREATE OR REPLACE FUNCTION rpc_mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET read = true
  WHERE recipient_id = auth.uid()
    AND read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_mark_all_notifications_read() TO authenticated;

-- ============================================================================
-- RPC: Get unread notification count
-- ============================================================================
DROP FUNCTION IF EXISTS rpc_get_unread_count();

CREATE OR REPLACE FUNCTION rpc_get_unread_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM notifications
  WHERE recipient_id = auth.uid()
    AND read = false;
  
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_get_unread_count() TO authenticated;

COMMIT;
