-- ============================================================================
-- Chat Join/Leave Notifications Migration
-- ============================================================================
-- Purpose: Add system messages to chat when viewers join or leave a live stream
-- 
-- Behavior:
-- - When a viewer joins (INSERT into active_viewers): Add "username joined" message
-- - When a viewer leaves (DELETE from active_viewers): Add "username left" message
-- - Messages are scoped to the live_stream_id (solo streams)
-- - Uses message_type = 'system' for styling
-- ============================================================================

-- Function to insert join notification
CREATE OR REPLACE FUNCTION public.notify_viewer_joined()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_live_stream_id INTEGER;
BEGIN
  -- Get the username of the viewer who joined
  SELECT COALESCE(display_name, username, 'Someone') INTO v_username
  FROM public.profiles
  WHERE id = NEW.viewer_id;
  
  v_live_stream_id := NEW.live_stream_id;
  
  -- Only insert if we have a valid live_stream_id and username
  IF v_live_stream_id IS NOT NULL AND v_username IS NOT NULL THEN
    INSERT INTO public.chat_messages (
      profile_id,
      message_type,
      content,
      live_stream_id,
      room_id
    ) VALUES (
      NEW.viewer_id,
      'system',
      v_username || ' joined',
      v_live_stream_id,
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to insert leave notification
CREATE OR REPLACE FUNCTION public.notify_viewer_left()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_live_stream_id INTEGER;
  v_stream_active BOOLEAN;
BEGIN
  -- Get the username of the viewer who left
  SELECT COALESCE(display_name, username, 'Someone') INTO v_username
  FROM public.profiles
  WHERE id = OLD.viewer_id;
  
  v_live_stream_id := OLD.live_stream_id;
  
  -- Check if the stream is still active (don't spam "left" messages when stream ends)
  SELECT live_available INTO v_stream_active
  FROM public.live_streams
  WHERE id = v_live_stream_id;
  
  -- Only insert if stream is still active and we have valid data
  IF v_live_stream_id IS NOT NULL AND v_username IS NOT NULL AND v_stream_active = TRUE THEN
    INSERT INTO public.chat_messages (
      profile_id,
      message_type,
      content,
      live_stream_id,
      room_id
    ) VALUES (
      OLD.viewer_id,
      'system',
      v_username || ' left',
      v_live_stream_id,
      NULL
    );
  END IF;
  
  RETURN OLD;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_notify_viewer_joined ON public.active_viewers;
DROP TRIGGER IF EXISTS trg_notify_viewer_left ON public.active_viewers;

-- Create trigger for viewer join
CREATE TRIGGER trg_notify_viewer_joined
  AFTER INSERT ON public.active_viewers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_viewer_joined();

-- Create trigger for viewer leave
CREATE TRIGGER trg_notify_viewer_left
  AFTER DELETE ON public.active_viewers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_viewer_left();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.notify_viewer_joined() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_viewer_left() TO authenticated;

-- ============================================================================
-- Validation
-- ============================================================================
DO $$
DECLARE
  v_join_trigger_exists BOOLEAN;
  v_leave_trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_notify_viewer_joined'
  ) INTO v_join_trigger_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_notify_viewer_left'
  ) INTO v_leave_trigger_exists;
  
  IF NOT v_join_trigger_exists THEN
    RAISE EXCEPTION 'Migration failed: join trigger not created';
  END IF;
  
  IF NOT v_leave_trigger_exists THEN
    RAISE EXCEPTION 'Migration failed: leave trigger not created';
  END IF;
  
  RAISE NOTICE 'Chat join/leave notifications migration completed successfully!';
END $$;
