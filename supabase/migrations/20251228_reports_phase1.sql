BEGIN;

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  reason text NOT NULL,
  details text NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS reporter_profile_id uuid;
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS target_type text;
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS target_id uuid;
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS details text;
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'reports'
      AND c.conname = 'reports_target_type_check'
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_target_type_check CHECK (target_type IN ('clip','post')) NOT VALID;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reports'
      AND column_name = 'target_type'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.reports r
    WHERE r.target_type IS NOT NULL
      AND r.target_type NOT IN ('clip','post')
    LIMIT 1
  ) THEN
    BEGIN
      ALTER TABLE public.reports VALIDATE CONSTRAINT reports_target_type_check;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_reports_reporter_created_at_desc
  ON public.reports (reporter_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_target
  ON public.reports (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_reports_status_created_at_desc
  ON public.reports (status, created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can create reports" ON public.reports;
CREATE POLICY "Authenticated can create reports"
  ON public.reports
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND reporter_profile_id = auth.uid()
  );

DROP POLICY IF EXISTS "Reporters can read own reports" ON public.reports;
CREATE POLICY "Reporters can read own reports"
  ON public.reports
  FOR SELECT
  USING (reporter_profile_id = auth.uid());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_admin'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can read all reports" ON public.reports';
    EXECUTE 'CREATE POLICY "Admins can read all reports" ON public.reports FOR SELECT USING (public.is_admin(auth.uid()))';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.report_target(text, uuid, text, text);

CREATE OR REPLACE FUNCTION public.report_target(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_me uuid;
  v_posts_exists boolean;
BEGIN
  v_me := auth.uid();

  IF v_me IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_target_type IS NULL OR length(trim(p_target_type)) = 0 THEN
    RAISE EXCEPTION 'target_type_required';
  END IF;

  IF p_target_id IS NULL THEN
    RAISE EXCEPTION 'target_id_required';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  IF p_target_type = 'clip' THEN
    IF NOT EXISTS (SELECT 1 FROM public.clips c WHERE c.id = p_target_id) THEN
      RAISE EXCEPTION 'target_not_found';
    END IF;
  ELSIF p_target_type = 'post' THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'posts'
    )
    INTO v_posts_exists;

    IF NOT v_posts_exists THEN
      RAISE EXCEPTION 'posts_table_missing';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.posts p WHERE p.id = p_target_id) THEN
      RAISE EXCEPTION 'target_not_found';
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid_target_type';
  END IF;

  INSERT INTO public.reports (
    reporter_profile_id,
    target_type,
    target_id,
    reason,
    details,
    status
  )
  VALUES (
    v_me,
    p_target_type,
    p_target_id,
    p_reason,
    p_details,
    'pending'
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.report_target(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_target(text, uuid, text, text) TO authenticated;

COMMIT;
