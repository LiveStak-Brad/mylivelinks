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
