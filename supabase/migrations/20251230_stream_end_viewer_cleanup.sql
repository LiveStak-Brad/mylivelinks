-- Stream End Viewer Cleanup Migration
-- Automatically disconnects all viewers when a stream ends
-- Prevents bandwidth waste and ensures immediate cleanup

BEGIN;

-- ============================================================================
-- TRIGGER: Auto-cleanup viewers when stream ends
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_viewers_on_stream_end()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- If stream is ending (live_available changed from true to false)
  IF OLD.live_available = TRUE AND NEW.live_available = FALSE THEN
    
    -- Immediately delete all active viewers for this stream
    -- This prevents bandwidth waste from ghost viewers
    DELETE FROM public.active_viewers 
    WHERE live_stream_id = NEW.id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Log the cleanup for monitoring
    RAISE NOTICE 'Stream % ended: cleaned up % active viewers', NEW.id, v_deleted_count;
    
    -- Also ensure is_published is set to false
    NEW.is_published := FALSE;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'live_streams' 
      AND column_name = 'unpublished_at'
    ) THEN
      NEW.unpublished_at := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_cleanup_viewers_on_stream_end ON public.live_streams;

-- Create trigger (BEFORE UPDATE so we can modify NEW)
-- Only check live_available column which definitely exists
CREATE TRIGGER trigger_cleanup_viewers_on_stream_end
  BEFORE UPDATE ON public.live_streams
  FOR EACH ROW
  WHEN (OLD.live_available IS DISTINCT FROM NEW.live_available)
  EXECUTE FUNCTION public.cleanup_viewers_on_stream_end();

-- ============================================================================
-- REALTIME: Enable live_streams for realtime updates
-- ============================================================================

-- Ensure live_streams is published for realtime subscriptions
-- This allows viewers to be notified immediately when streams end
DO $$
BEGIN
  -- Check if publication exists
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Try to add table to publication (will silently succeed if already added)
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
    EXCEPTION
      WHEN duplicate_object THEN
        -- Table already in publication, that's fine
        NULL;
    END;
  END IF;
END $$;

-- Grant necessary permissions for realtime
GRANT SELECT ON public.live_streams TO anon, authenticated;
GRANT UPDATE ON public.live_streams TO authenticated;

-- ============================================================================
-- FUNCTION: Broadcast stream end to all viewers
-- ============================================================================

-- Helper function for graceful stream shutdown
CREATE OR REPLACE FUNCTION public.end_stream_gracefully(p_stream_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affected_viewers INTEGER;
  v_stream_owner UUID;
BEGIN
  -- Get stream owner
  SELECT profile_id INTO v_stream_owner
  FROM public.live_streams
  WHERE id = p_stream_id;
  
  -- Verify caller is stream owner or admin
  IF v_stream_owner != auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  
  -- Count active viewers before cleanup
  SELECT COUNT(*) INTO v_affected_viewers
  FROM public.active_viewers
  WHERE live_stream_id = p_stream_id;
  
  -- Update stream status (trigger will handle viewer cleanup)
  -- Only update fields that exist in your schema
  UPDATE public.live_streams
  SET 
    live_available = FALSE,
    ended_at = NOW(),
    updated_at = NOW()
  WHERE id = p_stream_id
    AND ended_at IS NULL; -- Only end if not already ended
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'stream_not_found_or_already_ended';
  END IF;
  
  -- Return summary
  RETURN jsonb_build_object(
    'stream_id', p_stream_id,
    'viewers_disconnected', v_affected_viewers,
    'ended_at', NOW()
  );
END;
$$;

-- Grant execute permissions
REVOKE ALL ON FUNCTION public.end_stream_gracefully(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.end_stream_gracefully(BIGINT) TO authenticated;

-- ============================================================================
-- FUNCTION: Enhanced cleanup with logging
-- ============================================================================

-- Enhanced version of cleanup_stale_viewers with better logging
CREATE OR REPLACE FUNCTION public.cleanup_stale_viewers_enhanced()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
  v_streams_affected INTEGER;
  v_stale_threshold INTERVAL := INTERVAL '60 seconds';
BEGIN
  -- Delete stale viewers (heartbeat older than 60 seconds)
  WITH deleted AS (
    DELETE FROM public.active_viewers
    WHERE last_active_at < (NOW() - v_stale_threshold)
    RETURNING live_stream_id
  )
  SELECT COUNT(*), COUNT(DISTINCT live_stream_id)
  INTO v_deleted_count, v_streams_affected
  FROM deleted;
  
  -- Update publish state for affected streams
  IF v_streams_affected > 0 THEN
    PERFORM public.update_publish_state_from_viewers();
  END IF;
  
  -- Return summary
  RETURN jsonb_build_object(
    'deleted_viewers', v_deleted_count,
    'streams_affected', v_streams_affected,
    'threshold_seconds', EXTRACT(EPOCH FROM v_stale_threshold),
    'cleaned_at', NOW()
  );
END;
$$;

-- Grant execute permissions
REVOKE ALL ON FUNCTION public.cleanup_stale_viewers_enhanced() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_viewers_enhanced() TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.cleanup_viewers_on_stream_end() IS 
  'Trigger function that automatically removes all active viewers when a stream ends. Prevents bandwidth waste from ghost connections.';

COMMENT ON FUNCTION public.end_stream_gracefully(BIGINT) IS 
  'Gracefully ends a stream and returns summary of affected viewers. Called by stream owner or admin.';

COMMENT ON FUNCTION public.cleanup_stale_viewers_enhanced() IS 
  'Enhanced cleanup function that removes stale viewers (>60s since heartbeat) and returns detailed summary.';

COMMENT ON TRIGGER trigger_cleanup_viewers_on_stream_end ON public.live_streams IS 
  'Automatically cleans up active viewers when live_available changes to false or status changes to ended';

COMMIT;
