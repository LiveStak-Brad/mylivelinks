BEGIN;

-- Ensure realtime is configured for content_reports inserts.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.content_reports;
  EXCEPTION WHEN others THEN
    NULL;
  END;
END;
$$;

COMMIT;
