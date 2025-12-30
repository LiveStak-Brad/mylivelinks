BEGIN;

-- Ensure table exists (no-op if created previously)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  actor_profile_id uuid NULL REFERENCES public.profiles(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NULL,
  ip_address text NULL,
  user_agent text NULL,
  metadata jsonb NULL
);

-- Bring older schema in line with the P0 contract
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_audit_logs' AND column_name = 'target_type'
  ) THEN
    EXECUTE 'ALTER TABLE public.admin_audit_logs RENAME COLUMN target_type TO resource_type';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_audit_logs' AND column_name = 'target_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.admin_audit_logs RENAME COLUMN target_id TO resource_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_audit_logs' AND column_name = 'actor_profile_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.admin_audit_logs ALTER COLUMN actor_profile_id DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_audit_logs' AND column_name = 'resource_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.admin_audit_logs ALTER COLUMN resource_id DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_audit_logs' AND column_name = 'metadata'
  ) THEN
    EXECUTE 'ALTER TABLE public.admin_audit_logs ALTER COLUMN metadata DROP NOT NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_audit_logs' AND column_name = 'ip_address'
  ) THEN
    EXECUTE 'ALTER TABLE public.admin_audit_logs ADD COLUMN ip_address text NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_audit_logs' AND column_name = 'user_agent'
  ) THEN
    EXECUTE 'ALTER TABLE public.admin_audit_logs ADD COLUMN user_agent text NULL';
  END IF;
END $$;

-- RLS: admins/owners only (public.is_admin includes owners)
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- No INSERT policy on purpose: inserts must go through SECURITY DEFINER helper or service_role.
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;

-- SECURITY DEFINER helper (preferred insertion path)
CREATE OR REPLACE FUNCTION public.admin_log_action(
  p_action text,
  p_resource_type text,
  p_resource_id text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_role text;
  v_actor uuid;
  v_ip text;
  v_user_agent text;
  v_claims jsonb;
  v_headers jsonb;
BEGIN
  v_claims := NULL;
  BEGIN
    v_claims := current_setting('request.jwt.claims', true)::jsonb;
  EXCEPTION WHEN others THEN
    v_claims := NULL;
  END;

  v_role := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(current_setting('request.jwt.claims.role', true), ''),
    CASE WHEN v_claims IS NOT NULL THEN NULLIF(v_claims ->> 'role', '') ELSE NULL END
  );

  IF NOT (public.is_admin(auth.uid()) OR v_role = 'service_role') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_actor := auth.uid();

  v_headers := NULL;
  BEGIN
    v_headers := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN others THEN
    v_headers := NULL;
  END;

  IF v_headers IS NOT NULL THEN
    v_ip := NULLIF(v_headers ->> 'x-forwarded-for', '');
    IF v_ip IS NULL THEN
      v_ip := NULLIF(v_headers ->> 'x-real-ip', '');
    END IF;
    v_user_agent := NULLIF(v_headers ->> 'user-agent', '');
  ELSE
    v_ip := NULL;
    v_user_agent := NULL;
  END IF;

  INSERT INTO public.admin_audit_logs (
    actor_profile_id,
    action,
    resource_type,
    resource_id,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    v_actor,
    p_action,
    p_resource_type,
    p_resource_id,
    v_ip,
    v_user_agent,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_log_action(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_log_action(text, text, text, jsonb) TO authenticated;

-- Integrations

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

CREATE OR REPLACE FUNCTION public.update_feature_flag(
  p_key text,
  p_enabled boolean,
  p_changed_by uuid,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS feature_flags
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_old_value boolean;
  v_result feature_flags;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF auth.uid() <> p_changed_by THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT enabled INTO v_old_value
  FROM public.feature_flags
  WHERE key = p_key;

  UPDATE public.feature_flags
  SET
    enabled = p_enabled,
    last_changed_by = p_changed_by,
    last_changed_at = now()
  WHERE key = p_key
  RETURNING * INTO v_result;

  IF v_result.key IS NULL THEN
    RAISE EXCEPTION 'feature_flag_not_found';
  END IF;

  INSERT INTO public.feature_flag_audit_log (
    flag_key,
    old_value,
    new_value,
    changed_by,
    changed_at,
    ip_address,
    user_agent
  ) VALUES (
    p_key,
    v_old_value,
    p_enabled,
    p_changed_by,
    now(),
    p_ip_address,
    p_user_agent
  );

  PERFORM public.admin_log_action(
    'feature_flag_update',
    'feature_flag',
    p_key,
    jsonb_build_object(
      'old_value', v_old_value,
      'new_value', p_enabled,
      'ip_address', p_ip_address,
      'user_agent', p_user_agent
    )
  );

  RETURN v_result;
END;
$$;

COMMIT;
