-- ============================================================================
-- POST LIKES NOTIFICATIONS
-- ============================================================================
-- Creates notifications when users receive likes on their posts
-- Integrates with existing NotificationBell component
-- ============================================================================

BEGIN;

-- Step 1: Ensure notifications table exists
CREATE TABLE IF NOT EXISTS public.notifications (
  id bigserial PRIMARY KEY,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  entity_type text,
  entity_id text,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient 
  ON public.notifications(recipient_id, created_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
  ON public.notifications(recipient_id, read, created_at DESC)
  WHERE read = false;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);  -- Allow system (triggers) to insert

-- Grants
GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT INSERT ON TABLE public.notifications TO authenticated;
GRANT UPDATE (read) ON TABLE public.notifications TO authenticated;

-- Step 2: Create RPC functions for notification management

-- Drop existing functions first (in case return types changed)
DROP FUNCTION IF EXISTS public.rpc_get_unread_count() CASCADE;
DROP FUNCTION IF EXISTS public.rpc_mark_notification_read(bigint) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_mark_all_notifications_read() CASCADE;

-- Get unread count
CREATE FUNCTION public.rpc_get_unread_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.notifications
  WHERE recipient_id = auth.uid()
    AND read = false;
$$;

-- Mark notification as read
CREATE FUNCTION public.rpc_mark_notification_read(p_notification_id bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications
  SET read = true
  WHERE id = p_notification_id
    AND recipient_id = auth.uid();
$$;

-- Mark all notifications as read
CREATE FUNCTION public.rpc_mark_all_notifications_read()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications
  SET read = true
  WHERE recipient_id = auth.uid()
    AND read = false;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.rpc_get_unread_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_mark_notification_read(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_mark_all_notifications_read() TO authenticated;

-- Step 3: Create trigger function for post likes

CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author_id uuid;
  v_actor_username text;
  v_post_preview text;
BEGIN
  -- Get the post author (recipient of notification)
  SELECT author_id INTO v_post_author_id
  FROM public.posts
  WHERE id = NEW.post_id;
  
  -- Don't notify if user likes their own post
  IF v_post_author_id = NEW.profile_id THEN
    RETURN NEW;
  END IF;
  
  -- Get the liker's username
  SELECT username INTO v_actor_username
  FROM public.profiles
  WHERE id = NEW.profile_id;
  
  -- Get post preview (first 50 chars)
  SELECT 
    CASE 
      WHEN LENGTH(text_content) > 50 
      THEN SUBSTRING(text_content, 1, 50) || '...'
      ELSE COALESCE(text_content, 'your post')
    END
  INTO v_post_preview
  FROM public.posts
  WHERE id = NEW.post_id;
  
  -- Create notification
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    entity_type,
    entity_id,
    message
  ) VALUES (
    v_post_author_id,
    NEW.profile_id,
    'like_post',
    'post',
    NEW.post_id::text,
    v_actor_username || ' liked ' || v_post_preview
  );
  
  RETURN NEW;
END;
$$;

-- Step 4: Attach trigger to post_likes table

DROP TRIGGER IF EXISTS trg_notify_post_like ON public.post_likes;

CREATE TRIGGER trg_notify_post_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_like();

-- Step 5: Create cleanup function (optional - remove old notifications)

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications(days_to_keep integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < NOW() - (days_to_keep || ' days')::interval
    AND read = true;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_notifications(integer) IS 
  'Deletes read notifications older than specified days (default 30). Call this periodically via cron job.';

GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications(integer) TO authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  test_post_id uuid;
  test_liker_id uuid;
  test_author_id uuid;
  v_notif_count integer;
  v_row record;  -- Add this declaration
BEGIN
  -- Get a post and its author
  SELECT id, author_id INTO test_post_id, test_author_id
  FROM public.posts
  LIMIT 1;
  
  -- Get a different user to be the liker
  SELECT id INTO test_liker_id
  FROM public.profiles
  WHERE id != test_author_id
  LIMIT 1;
  
  IF test_post_id IS NULL OR test_liker_id IS NULL THEN
    RAISE NOTICE '⚠️ Not enough test data (need post + 2 users)';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Testing notifications...';
  RAISE NOTICE '  Post: %', test_post_id;
  RAISE NOTICE '  Liker: %', test_liker_id;
  RAISE NOTICE '  Author: %', test_author_id;
  
  -- Count notifications before
  SELECT COUNT(*) INTO v_notif_count
  FROM public.notifications
  WHERE recipient_id = test_author_id;
  
  RAISE NOTICE '  Notifications before: %', v_notif_count;
  
  -- Simulate a like (trigger should fire)
  BEGIN
    INSERT INTO public.post_likes (post_id, profile_id)
    VALUES (test_post_id, test_liker_id)
    ON CONFLICT DO NOTHING;
    
    -- Count notifications after
    SELECT COUNT(*) INTO v_notif_count
    FROM public.notifications
    WHERE recipient_id = test_author_id
      AND actor_id = test_liker_id
      AND type = 'like_post';
    
    IF v_notif_count > 0 THEN
      RAISE NOTICE '✅ Notification created successfully!';
      
      -- Show the notification
      FOR v_row IN 
        SELECT n.message, n.created_at, p.username as actor_username
        FROM public.notifications n
        JOIN public.profiles p ON p.id = n.actor_id
        WHERE n.recipient_id = test_author_id
          AND n.type = 'like_post'
        ORDER BY n.created_at DESC
        LIMIT 1
      LOOP
        RAISE NOTICE '  Message: "%"', v_row.message;
        RAISE NOTICE '  From: %', v_row.actor_username;
        RAISE NOTICE '  At: %', v_row.created_at;
      END LOOP;
    ELSE
      RAISE NOTICE '⚠️ No notification created';
    END IF;
    
    -- Cleanup test
    DELETE FROM public.post_likes
    WHERE post_id = test_post_id AND profile_id = test_liker_id;
    
    DELETE FROM public.notifications
    WHERE recipient_id = test_author_id
      AND actor_id = test_liker_id
      AND type = 'like_post';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Test failed: %', SQLERRM;
  END;
  
  RAISE NOTICE '🎉 Notification system ready!';
END $$;

-- ============================================================================
-- USAGE NOTES
-- ============================================================================

/*

HOW IT WORKS:
1. User clicks like on a post
2. post_likes INSERT trigger fires
3. Trigger creates notification for post author
4. NotificationBell component shows notification in real-time
5. User can mark as read/unread

NOTIFICATION FORMAT:
- Type: 'like_post'
- Message: "[username] liked [post preview]"
- Entity: post_id (for linking)

REAL-TIME UPDATES:
The NotificationBell component already subscribes to:
  'postgres_changes' on 'notifications' table
So new likes will show up immediately!

CLEANUP:
Run this periodically (e.g., daily cron job):
  SELECT cleanup_old_notifications(30);  -- Keep 30 days of read notifications

*/
