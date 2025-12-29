BEGIN;

-- Roles tables
CREATE TABLE IF NOT EXISTS public.app_roles (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','app_admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  PRIMARY KEY (profile_id, role)
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_app_roles_single_owner ON public.app_roles(role) WHERE role = 'owner';

CREATE TABLE IF NOT EXISTS public.room_roles (
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('room_admin','room_moderator')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  PRIMARY KEY (room_id, profile_id, role)
);

CREATE INDEX IF NOT EXISTS idx_room_roles_room_role ON public.room_roles(room_id, role);
CREATE INDEX IF NOT EXISTS idx_room_roles_profile_id ON public.room_roles(profile_id);

-- Ensure legacy flags exist on profiles (used as fallback/bootstrapping)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_owner boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Track who assigned roles
CREATE OR REPLACE FUNCTION public.set_role_created_by()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_roles_created_by ON public.app_roles;
CREATE TRIGGER trg_app_roles_created_by
BEFORE INSERT ON public.app_roles
FOR EACH ROW
EXECUTE FUNCTION public.set_role_created_by();

DROP TRIGGER IF EXISTS trg_room_roles_created_by ON public.room_roles;
CREATE TRIGGER trg_room_roles_created_by
BEFORE INSERT ON public.room_roles
FOR EACH ROW
EXECUTE FUNCTION public.set_role_created_by();

-- RBAC helpers
CREATE OR REPLACE FUNCTION public.is_owner(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.profile_id = p_profile_id AND ar.role = 'owner')
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_profile_id AND COALESCE(p.is_owner,false) = true);
$$;

CREATE OR REPLACE FUNCTION public.is_app_admin(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    public.is_owner(p_profile_id)
    OR EXISTS (SELECT 1 FROM public.app_roles ar WHERE ar.profile_id = p_profile_id AND ar.role = 'app_admin')
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_profile_id AND COALESCE(p.is_admin,false) = true);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.is_app_admin(uid);
$$;

CREATE OR REPLACE FUNCTION public.is_room_admin(p_profile_id uuid, p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    public.is_app_admin(p_profile_id)
    OR EXISTS (
      SELECT 1 FROM public.room_roles rr
      WHERE rr.room_id = p_room_id
        AND rr.profile_id = p_profile_id
        AND rr.role = 'room_admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_room_moderator(p_profile_id uuid, p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    public.is_room_admin(p_profile_id, p_room_id)
    OR EXISTS (
      SELECT 1 FROM public.room_roles rr
      WHERE rr.room_id = p_room_id
        AND rr.profile_id = p_profile_id
        AND rr.role = 'room_moderator'
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_room_roles(p_profile_id uuid, p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.is_room_admin(p_profile_id, p_room_id);
$$;

CREATE OR REPLACE FUNCTION public.can_assign_room_moderator(p_grantor uuid, p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.is_room_admin(p_grantor, p_room_id);
$$;

-- Role mutation RPCs
CREATE OR REPLACE FUNCTION public.grant_app_admin(p_target_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF auth.uid() = p_target_profile_id THEN
    RAISE EXCEPTION 'cannot_self_assign';
  END IF;

  INSERT INTO public.app_roles (profile_id, role, created_by)
  VALUES (p_target_profile_id, 'app_admin', auth.uid())
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_app_admin(p_target_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.app_roles
  WHERE profile_id = p_target_profile_id
    AND role = 'app_admin';
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_room_admin(p_room_id uuid, p_target_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_manage_room_roles(auth.uid(), p_room_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF auth.uid() = p_target_profile_id THEN
    RAISE EXCEPTION 'cannot_self_assign';
  END IF;

  INSERT INTO public.room_roles (room_id, profile_id, role, created_by)
  VALUES (p_room_id, p_target_profile_id, 'room_admin', auth.uid())
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_room_admin(p_room_id uuid, p_target_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_manage_room_roles(auth.uid(), p_room_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.room_roles
  WHERE room_id = p_room_id
    AND profile_id = p_target_profile_id
    AND role = 'room_admin';
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_room_moderator(p_room_id uuid, p_target_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_assign_room_moderator(auth.uid(), p_room_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF auth.uid() = p_target_profile_id THEN
    RAISE EXCEPTION 'cannot_self_assign';
  END IF;

  INSERT INTO public.room_roles (room_id, profile_id, role, created_by)
  VALUES (p_room_id, p_target_profile_id, 'room_moderator', auth.uid())
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_room_moderator(p_room_id uuid, p_target_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_manage_room_roles(auth.uid(), p_room_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.room_roles
  WHERE room_id = p_room_id
    AND profile_id = p_target_profile_id
    AND role = 'room_moderator';
END;
$$;

-- RLS
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rooms') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='rooms' AND policyname='App admins can manage rooms'
    ) THEN
      EXECUTE 'CREATE POLICY "App admins can manage rooms" ON public.rooms FOR ALL USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()))';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='app_roles' AND policyname='App roles readable by admins'
  ) THEN
    EXECUTE 'CREATE POLICY "App roles readable by admins" ON public.app_roles FOR SELECT USING (public.is_app_admin(auth.uid()) OR auth.uid() = profile_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='app_roles' AND policyname='Owner can manage app admins'
  ) THEN
    EXECUTE 'CREATE POLICY "Owner can manage app admins" ON public.app_roles FOR INSERT WITH CHECK (public.is_owner(auth.uid()) AND role = ''app_admin'' AND auth.uid() <> profile_id)';
    EXECUTE 'CREATE POLICY "Owner can revoke app admins" ON public.app_roles FOR DELETE USING (public.is_owner(auth.uid()) AND role = ''app_admin'')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='room_roles' AND policyname='Room roles readable'
  ) THEN
    EXECUTE 'CREATE POLICY "Room roles readable" ON public.room_roles FOR SELECT USING (public.is_app_admin(auth.uid()) OR auth.uid() = profile_id OR EXISTS (SELECT 1 FROM public.room_roles rr2 WHERE rr2.room_id = room_roles.room_id AND rr2.profile_id = auth.uid() AND rr2.role IN (''room_admin'',''room_moderator'')))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='room_roles' AND policyname='Room admins can manage room roles'
  ) THEN
    EXECUTE 'CREATE POLICY "Room admins can manage room roles" ON public.room_roles FOR INSERT WITH CHECK (public.can_manage_room_roles(auth.uid(), room_id) AND auth.uid() <> profile_id AND (role <> ''room_moderator'' OR public.can_assign_room_moderator(auth.uid(), room_id)))';
    EXECUTE 'CREATE POLICY "Room admins can revoke room roles" ON public.room_roles FOR DELETE USING (public.can_manage_room_roles(auth.uid(), room_id))';
  END IF;
END $$;

-- Bootstrap roles from legacy profile flags
INSERT INTO public.app_roles (profile_id, role, created_by)
SELECT p.id, 'owner', p.id
FROM public.profiles p
WHERE COALESCE(p.is_owner,false) = true
ON CONFLICT DO NOTHING;

INSERT INTO public.app_roles (profile_id, role, created_by)
SELECT p.id, 'app_admin', p.id
FROM public.profiles p
WHERE COALESCE(p.is_admin,false) = true
ON CONFLICT DO NOTHING;

-- Admin action RPCs used by UI (uuid-safe)
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
  p_application_id uuid,
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

-- Policies needed for web-admin pages that query tables directly
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';
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

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='room_applications') THEN
    EXECUTE 'ALTER TABLE public.room_applications ENABLE ROW LEVEL SECURITY';
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

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='gift_types') THEN
    EXECUTE 'ALTER TABLE public.gift_types ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='gift_types' AND policyname='Admins can manage gift types'
    ) THEN
      EXECUTE 'CREATE POLICY "Admins can manage gift types" ON public.gift_types FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='coin_packs') THEN
    EXECUTE 'ALTER TABLE public.coin_packs ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='coin_packs' AND policyname='Admins can manage coin packs'
    ) THEN
      EXECUTE 'CREATE POLICY "Admins can manage coin packs" ON public.coin_packs FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))';
    END IF;
  END IF;
END $$;

-- admin_overview is used by /api/admin/overview (preferred path, with JS fallback)
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

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'live_streams') THEN
    EXECUTE 'SELECT COUNT(*) FROM public.live_streams WHERE live_available = true' INTO v_live_streams_active;
  ELSE
    v_live_streams_active := 0;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gifts') THEN
    EXECUTE 'SELECT COUNT(*) FROM public.gifts WHERE sent_at >= (now() - interval ''24 hours'')' INTO v_gifts_sent_24h;
  ELSE
    v_gifts_sent_24h := 0;
  END IF;

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

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'live_streams')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='live_streams' AND column_name='live_available') THEN
    v_live_now := (
      SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      FROM (
        SELECT
          ls.id::text AS stream_id,
          ls.profile_id::text AS host_user_id,
          p.username AS host_name,
          NULL::text AS title,
          0::int AS viewer_count,
          ls.started_at
        FROM public.live_streams ls
        LEFT JOIN public.profiles p ON p.id = ls.profile_id
        WHERE ls.live_available = true
        ORDER BY ls.started_at DESC NULLS LAST
        LIMIT 20
      ) t
    );
  ELSE
    v_live_now := '[]'::jsonb;
  END IF;

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
    -- The repo has multiple historical report schemas. The canonical uuid-based public.reports
    -- (20251228_reports_phase1) targets clips/posts (target_type/target_id), not users.
    -- To avoid brittle joins, return an empty list here and let /api/admin/overview fall back
    -- to its JS query path for the per-row usernames.
    v_recent_reports := '[]'::jsonb;
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

-- Stream admin actions are used by /api/admin/live-streams/end and end-all
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

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='live_streams') THEN
    RAISE EXCEPTION 'live_streams table not found';
  END IF;

  UPDATE public.live_streams
  SET
    live_available = false,
    is_published = false,
    ended_at = now(),
    unpublished_at = now(),
    updated_at = now()
  WHERE id = p_stream_id;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='active_viewers') THEN
    DELETE FROM public.active_viewers WHERE live_stream_id = p_stream_id;
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

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='live_streams') THEN
    RETURN 0;
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

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='active_viewers') THEN
    DELETE FROM public.active_viewers;
  END IF;

  RETURN v_ended;
END;
$$;

-- Explicit grants (avoid exposing SECURITY DEFINER RPCs to anonymous callers)
REVOKE ALL ON FUNCTION public.is_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_app_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_room_admin(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_room_moderator(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_room_roles(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_assign_room_moderator(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_app_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_app_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_room_admin(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_room_admin(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_room_moderator(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_room_moderator(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_overview() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_end_stream(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_end_all_streams() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_resolve_report(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_decide_application(uuid, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_moderator(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_room_roles(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_assign_room_moderator(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_app_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_app_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_room_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_room_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_room_moderator(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_room_moderator(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_end_stream(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_end_all_streams() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_decide_application(uuid, text, text) TO authenticated;

COMMIT;
