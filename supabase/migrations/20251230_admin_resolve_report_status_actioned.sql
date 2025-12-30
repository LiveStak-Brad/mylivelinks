BEGIN;

-- Hotfix: content_reports uses the canonical workflow statuses:
--   pending / reviewed / dismissed / actioned
-- The admin_resolve_report RPC must not write the legacy 'resolved' status.

CREATE OR REPLACE FUNCTION public.admin_resolve_report(
  p_report_id uuid,
  p_resolution text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_status text;
  v_table text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_status := CASE WHEN p_resolution = 'dismissed' THEN 'dismissed' ELSE 'actioned' END;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content_reports') THEN
    v_table := 'content_reports';

    UPDATE public.content_reports
    SET
      status = v_status,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      admin_notes = COALESCE(p_note, admin_notes),
      updated_at = now()
    WHERE id = p_report_id;

    PERFORM public.admin_log_action(
      'report_resolve',
      'content_report',
      p_report_id::text,
      jsonb_build_object(
        'resolution', p_resolution,
        'status', v_status,
        'note', p_note,
        'table', v_table
      )
    );

    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reports') THEN
    v_table := 'reports';

    UPDATE public.reports
    SET status = v_status
    WHERE id = p_report_id;

    PERFORM public.admin_log_action(
      'report_resolve',
      'report',
      p_report_id::text,
      jsonb_build_object(
        'resolution', p_resolution,
        'status', v_status,
        'note', p_note,
        'table', v_table
      )
    );

    RETURN;
  END IF;

  RAISE EXCEPTION 'reports table not found';
END;
$$;

COMMIT;
