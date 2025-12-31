BEGIN;

CREATE OR REPLACE FUNCTION public.cleanup_viewers_on_stream_end()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
  v_has_is_published boolean;
  v_has_unpublished_at boolean;
BEGIN
  -- If stream is ending (live_available changed from true to false)
  IF OLD.live_available = TRUE AND NEW.live_available = FALSE THEN

    -- Immediately delete all active viewers for this stream
    DELETE FROM public.active_viewers
    WHERE live_stream_id = NEW.id;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- Log the cleanup for monitoring
    RAISE NOTICE 'Stream % ended: cleaned up % active viewers', NEW.id, v_deleted_count;

    -- Schema-safe: only touch publish/unpublish fields if they exist
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'live_streams'
        AND column_name = 'is_published'
    ) INTO v_has_is_published;

    IF v_has_is_published THEN
      NEW.is_published := FALSE;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'live_streams'
        AND column_name = 'unpublished_at'
    ) INTO v_has_unpublished_at;

    IF v_has_unpublished_at THEN
      NEW.unpublished_at := NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists (idempotent)
DROP TRIGGER IF EXISTS trigger_cleanup_viewers_on_stream_end ON public.live_streams;

CREATE TRIGGER trigger_cleanup_viewers_on_stream_end
  BEFORE UPDATE ON public.live_streams
  FOR EACH ROW
  WHEN (OLD.live_available IS DISTINCT FROM NEW.live_available)
  EXECUTE FUNCTION public.cleanup_viewers_on_stream_end();

COMMIT;
