ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_owner boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = uid
      AND (COALESCE(p.is_owner, false) OR COALESCE(p.is_admin, false))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_users bigint;
  v_live_streams_active bigint;
  v_gifts_sent_24h bigint;
  v_pending_reports bigint;
  v_live_now jsonb;
  v_recent_reports jsonb;
  v_reports_table text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*) INTO v_users FROM public.profiles;
  SELECT COUNT(*) INTO v_live_streams_active FROM public.live_streams WHERE live_available = true;
  SELECT COUNT(*) INTO v_gifts_sent_24h FROM public.gifts WHERE sent_at >= (now() - interval '24 hours');

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content_reports') THEN
    v_reports_table := 'content_reports';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reports') THEN
    v_reports_table := 'reports';
  ELSE
    v_reports_table := NULL;
  END IF;

  IF v_reports_table IS NULL THEN
    v_pending_reports := 0;
  ELSE
    EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE status = $1', v_reports_table)
      INTO v_pending_reports
      USING 'pending';
  END IF;

  v_live_now := (
    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    FROM (
      SELECT
        ls.id::text AS stream_id,
        ls.profile_id::text AS host_user_id,
        p.username AS host_name,
        NULL::text AS title,
        COALESCE(
          (
            SELECT COUNT(*)
            FROM public.active_viewers av
            WHERE av.live_stream_id = ls.id
              AND av.is_active = true
              AND av.is_unmuted = true
              AND av.is_visible = true
              AND av.is_subscribed = true
              AND av.last_active_at > (now() - interval '60 seconds')
          ),
          0
        )::int AS viewer_count,
        ls.started_at
      FROM public.live_streams ls
      JOIN public.profiles p ON p.id = ls.profile_id
      WHERE ls.live_available = true
      ORDER BY ls.started_at DESC NULLS LAST
      LIMIT 20
    ) t
  );

  IF v_reports_table = 'content_reports' THEN
    v_recent_reports := (
      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb), '[]'::jsonb)
      FROM (
        SELECT
          cr.id::text AS report_id,
          cr.created_at,
          reporter.username AS reporter_name,
          target.username AS target_name,
          cr.report_reason AS reason,
          cr.status
        FROM public.content_reports cr
        LEFT JOIN public.profiles reporter ON reporter.id = cr.reporter_id
        LEFT JOIN public.profiles target ON target.id = cr.reported_user_id
        ORDER BY cr.created_at DESC
        LIMIT 20
      ) r
    );
  ELSIF v_reports_table = 'reports' THEN
    v_recent_reports := (
      SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb), '[]'::jsonb)
      FROM (
        SELECT
          rp.id::text AS report_id,
          rp.created_at,
          reporter.username AS reporter_name,
          target.username AS target_name,
          COALESCE(rp.reason, rp.report_reason, rp.report_type, 'unknown')::text AS reason,
          rp.status
        FROM public.reports rp
        LEFT JOIN public.profiles reporter ON reporter.id = COALESCE(rp.reporter_id, rp.reporter_user_id)
        LEFT JOIN public.profiles target ON target.id = COALESCE(rp.reported_user_id, rp.target_user_id)
        ORDER BY rp.created_at DESC
        LIMIT 20
      ) r
    );
  ELSE
    v_recent_reports := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'totals', jsonb_build_object(
      'users', v_users,
      'live_streams_active', v_live_streams_active,
      'gifts_sent_24h', v_gifts_sent_24h,
      'pending_reports', v_pending_reports
    ),
    'live_now', v_live_now,
    'recent_reports', v_recent_reports
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_end_stream(p_stream_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.live_streams
  SET
    live_available = false,
    is_published = false,
    ended_at = now(),
    unpublished_at = now(),
    updated_at = now()
  WHERE id = p_stream_id;

  DELETE FROM public.active_viewers WHERE live_stream_id = p_stream_id;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_publish_state_from_viewers' AND pg_function_is_visible(oid)) THEN
    PERFORM public.update_publish_state_from_viewers();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_end_all_streams()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ended int;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.live_streams
  SET
    live_available = false,
    is_published = false,
    ended_at = now(),
    unpublished_at = now(),
    updated_at = now()
  WHERE live_available = true;

  GET DIAGNOSTICS v_ended = ROW_COUNT;

  DELETE FROM public.active_viewers;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_publish_state_from_viewers' AND pg_function_is_visible(oid)) THEN
    PERFORM public.update_publish_state_from_viewers();
  END IF;

  RETURN v_ended;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_resolve_report(
  p_report_id bigint,
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
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_status := CASE WHEN p_resolution = 'dismissed' THEN 'dismissed' ELSE 'resolved' END;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content_reports') THEN
    UPDATE public.content_reports
    SET
      status = v_status,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      admin_notes = COALESCE(p_note, admin_notes),
      updated_at = now()
    WHERE id = p_report_id;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reports') THEN
    UPDATE public.reports
    SET status = v_status
    WHERE id = p_report_id;
    RETURN;
  END IF;

  RAISE EXCEPTION 'reports table not found';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_decide_application(
  p_application_id bigint,
  p_decision text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table text;
  v_profile_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'room_applications') THEN
    v_table := 'room_applications';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'applications') THEN
    v_table := 'applications';
  ELSE
    RAISE EXCEPTION 'applications table not found';
  END IF;

  IF v_table = 'room_applications' THEN
    UPDATE public.room_applications
    SET
      status = p_decision,
      reviewed_at = now(),
      reviewed_by = auth.uid()
    WHERE id = p_application_id
    RETURNING profile_id INTO v_profile_id;
  ELSE
    UPDATE public.applications
    SET
      status = p_decision,
      reviewed_at = now(),
      reviewed_by = auth.uid()
    WHERE id = p_application_id
    RETURNING COALESCE(profile_id, user_id) INTO v_profile_id;
  END IF;

  IF p_decision = 'approved' AND v_profile_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'can_stream'
    ) THEN
      EXECUTE 'UPDATE public.profiles SET can_stream = true WHERE id = $1'
      USING v_profile_id;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'room_approved'
    ) THEN
      EXECUTE 'UPDATE public.profiles SET room_approved = true WHERE id = $1'
      USING v_profile_id;
    END IF;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='profiles' AND policyname='Admins can select all profiles'
    ) THEN
      EXECUTE 'CREATE POLICY "Admins can select all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()))';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='profiles' AND policyname='Admins can update all profiles'
    ) THEN
      EXECUTE 'CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='live_streams') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='live_streams' AND policyname='Admins can update all live streams'
    ) THEN
      EXECUTE 'CREATE POLICY "Admins can update all live streams" ON public.live_streams FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='content_reports') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='content_reports' AND policyname='Admins can view all reports'
    ) THEN
      EXECUTE 'CREATE POLICY "Admins can view all reports" ON public.content_reports FOR SELECT USING (public.is_admin(auth.uid()))';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='content_reports' AND policyname='Admins can update reports'
    ) THEN
      EXECUTE 'CREATE POLICY "Admins can update reports" ON public.content_reports FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='room_applications') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='room_applications' AND policyname='Admins can view all applications'
    ) THEN
      EXECUTE 'CREATE POLICY "Admins can view all applications" ON public.room_applications FOR SELECT USING (public.is_admin(auth.uid()))';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='room_applications' AND policyname='Admins can update applications'
    ) THEN
      EXECUTE 'CREATE POLICY "Admins can update applications" ON public.room_applications FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))';
    END IF;
  END IF;
END $$;
