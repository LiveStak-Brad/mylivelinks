BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id),
  reported_user_id uuid NULL REFERENCES public.profiles(id),
  report_type text NOT NULL,
  report_reason text NOT NULL,
  report_details text NULL,
  context_details text NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz NULL,
  reviewed_by uuid NULL REFERENCES public.profiles(id),
  admin_notes text NULL
);

DO $$
DECLARE
  v_con record;
BEGIN
  -- Older migrations in this repo created public.content_reports with different schemas
  -- and restrictive CHECK constraints. Drop any CHECK constraints on this table so
  -- we can normalize into the canonical (pending/reviewed/dismissed/actioned) workflow.
  FOR v_con IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.content_reports'::regclass
      AND c.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS %I', v_con.conname);
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'reporter_profile_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'reporter_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.content_reports RENAME COLUMN reporter_profile_id TO reporter_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'target_profile_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'reported_user_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.content_reports RENAME COLUMN target_profile_id TO reported_user_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'report_type'
  ) THEN
    EXECUTE 'ALTER TABLE public.content_reports RENAME COLUMN type TO report_type';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'reason'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'report_reason'
  ) THEN
    EXECUTE 'ALTER TABLE public.content_reports RENAME COLUMN reason TO report_reason';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'admin_note'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'admin_notes'
  ) THEN
    EXECUTE 'ALTER TABLE public.content_reports RENAME COLUMN admin_note TO admin_notes';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'report_details'
  ) THEN
    EXECUTE 'ALTER TABLE public.content_reports ADD COLUMN report_details text NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'context_details'
  ) THEN
    EXECUTE 'ALTER TABLE public.content_reports ADD COLUMN context_details text NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.content_reports ADD COLUMN created_at timestamptz NOT NULL DEFAULT now()';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'status'
  ) THEN
    EXECUTE 'ALTER TABLE public.content_reports ADD COLUMN status text NOT NULL DEFAULT ''pending''';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'reviewed_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.content_reports ADD COLUMN reviewed_at timestamptz NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'reviewed_by'
  ) THEN
    EXECUTE 'ALTER TABLE public.content_reports ADD COLUMN reviewed_by uuid NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'admin_notes'
  ) THEN
    EXECUTE 'ALTER TABLE public.content_reports ADD COLUMN admin_notes text NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'status'
  ) THEN
    UPDATE public.content_reports
    SET status = CASE
      WHEN lower(status) IN ('open') THEN 'pending'
      WHEN lower(status) IN ('under_review','reviewing','in_review') THEN 'reviewed'
      WHEN lower(status) IN ('resolved') THEN 'actioned'
      WHEN lower(status) IN ('dismissed') THEN 'dismissed'
      ELSE status
    END
    WHERE status IS NOT NULL;
  END IF;

  -- Canonical status constraint (matches API expectations)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'status'
  ) THEN
    EXECUTE 'ALTER TABLE public.content_reports ADD CONSTRAINT content_reports_status_check_v2 CHECK (status IN (''pending'',''reviewed'',''dismissed'',''actioned''))';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'report_type'
  ) THEN
    UPDATE public.content_reports SET report_type = 'other' WHERE report_type IS NULL;
    EXECUTE 'ALTER TABLE public.content_reports ALTER COLUMN report_type SET NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'report_reason'
  ) THEN
    UPDATE public.content_reports SET report_reason = 'unknown' WHERE report_reason IS NULL;
    EXECUTE 'ALTER TABLE public.content_reports ALTER COLUMN report_reason SET NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'reporter_id'
  ) THEN
    DELETE FROM public.content_reports WHERE reporter_id IS NULL;
    EXECUTE 'ALTER TABLE public.content_reports ALTER COLUMN reporter_id SET NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'reporter_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_reporter_profile_id_fkey';
    EXECUTE 'ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_reporter_id_fkey';
    EXECUTE 'ALTER TABLE public.content_reports ADD CONSTRAINT content_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'reported_user_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_target_profile_id_fkey';
    EXECUTE 'ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_reported_user_id_fkey';
    EXECUTE 'ALTER TABLE public.content_reports ADD CONSTRAINT content_reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.profiles(id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'content_reports' AND column_name = 'reviewed_by'
  ) THEN
    EXECUTE 'ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_reviewed_by_fkey';
    EXECUTE 'ALTER TABLE public.content_reports ADD CONSTRAINT content_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_created_at ON public.content_reports(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_status_created_at ON public.content_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_reported_user_id ON public.content_reports(reported_user_id);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create content reports" ON public.content_reports;
CREATE POLICY "Users can create content reports" ON public.content_reports
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND reporter_id = auth.uid());

DROP POLICY IF EXISTS "Reporters can read own content reports" ON public.content_reports;
CREATE POLICY "Reporters can read own content reports" ON public.content_reports
FOR SELECT
USING (auth.uid() IS NOT NULL AND reporter_id = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'content_reports' AND policyname = 'Admins can read all content reports'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can read all content reports" ON public.content_reports FOR SELECT USING (public.is_admin(auth.uid()))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'content_reports' AND policyname = 'Admins can update content reports'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update content reports" ON public.content_reports FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.check_report_rate_limit(p_reporter_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT public.is_admin(auth.uid()) AND p_reporter_id <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*)::int
  INTO v_count
  FROM public.content_reports cr
  WHERE cr.reporter_id = p_reporter_id
    AND cr.created_at >= (now() - interval '1 hour');

  RETURN v_count < 10;
END;
$$;

REVOKE ALL ON FUNCTION public.check_report_rate_limit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_report_rate_limit(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_resolve_report(
  p_report_id uuid,
  p_resolution text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_has_audit_table boolean;
  v_has_audit_rpc boolean;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_status := CASE
    WHEN lower(p_resolution) = 'dismissed' THEN 'dismissed'
    WHEN lower(p_resolution) = 'actioned' THEN 'actioned'
    ELSE 'actioned'
  END;

  UPDATE public.content_reports
  SET
    status = v_status,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    admin_notes = COALESCE(p_note, admin_notes)
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'report_not_found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'admin_audit_logs'
  ) INTO v_has_audit_table;

  SELECT EXISTS (
    SELECT 1
    WHERE to_regprocedure('public.admin_log_action(text,text,text,jsonb)') IS NOT NULL
  ) INTO v_has_audit_rpc;

  IF v_has_audit_rpc THEN
    PERFORM public.admin_log_action(
      'report_resolved',
      'content_report',
      p_report_id::text,
      jsonb_build_object('status', v_status, 'note', p_note)
    );
  ELSIF v_has_audit_table THEN
    INSERT INTO public.admin_audit_logs (actor_profile_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'report_resolved', 'content_report', p_report_id::text, jsonb_build_object('status', v_status, 'note', p_note));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_report(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text, text) TO authenticated;

COMMIT;
