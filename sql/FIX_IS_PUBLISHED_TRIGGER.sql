-- FIX: Remove is_published reference from cleanup_viewers_on_stream_end trigger
-- The is_published column no longer exists in live_streams table
-- This fixes the error: record "new" has no field "is_published"

BEGIN;

-- Recreate the function WITHOUT is_published reference
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
    
    -- Set unpublished_at if the column exists
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

-- Verify the trigger still exists (it should, we just updated the function)
-- The trigger was created as:
-- CREATE TRIGGER trigger_cleanup_viewers_on_stream_end
--   BEFORE UPDATE ON public.live_streams
--   FOR EACH ROW
--   WHEN (OLD.live_available IS DISTINCT FROM NEW.live_available)
--   EXECUTE FUNCTION public.cleanup_viewers_on_stream_end();

COMMIT;

-- Verification query (run after applying):
-- SELECT tgname, tgrelid::regclass, tgenabled 
-- FROM pg_trigger 
-- WHERE tgname = 'trigger_cleanup_viewers_on_stream_end';
