BEGIN;

CREATE TABLE IF NOT EXISTS public.live_access_grants (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.live_access_grants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='live_access_grants' AND policyname='Admins can manage live access grants'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can manage live access grants" ON public.live_access_grants FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='live_access_grants' AND policyname='Users can read own live access'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can read own live access" ON public.live_access_grants FOR SELECT USING (auth.uid() = profile_id)';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_live_tester(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_access_grants lag
    WHERE lag.profile_id = p_profile_id
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_set_live_access(
  p_target_profile_id uuid,
  p_enabled boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_enabled THEN
    INSERT INTO public.live_access_grants (profile_id, created_by)
    VALUES (p_target_profile_id, auth.uid())
    ON CONFLICT (profile_id) DO UPDATE SET
      created_by = EXCLUDED.created_by;
  ELSE
    DELETE FROM public.live_access_grants
    WHERE profile_id = p_target_profile_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_set_live_access(
  p_target_profile_id uuid,
  p_enabled boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_enabled THEN
    INSERT INTO public.live_access_grants (profile_id, created_by)
    VALUES (p_target_profile_id, auth.uid())
    ON CONFLICT (profile_id) DO UPDATE SET
      created_by = EXCLUDED.created_by;
  ELSE
    DELETE FROM public.live_access_grants
    WHERE profile_id = p_target_profile_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.is_live_tester(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_live_access(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owner_set_live_access(uuid, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_live_tester(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_live_access(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_set_live_access(uuid, boolean) TO authenticated;

COMMIT;
