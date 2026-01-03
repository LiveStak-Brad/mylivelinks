BEGIN;

-- ============================================================================
-- TEAM LIVE ROOM CONFIGS + AUTO-PROVISIONING AT 100 MEMBERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.team_live_room_configs (
  team_id uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private','public')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS trg_team_live_room_configs_set_updated_at ON public.team_live_room_configs;
CREATE TRIGGER trg_team_live_room_configs_set_updated_at
BEFORE UPDATE ON public.team_live_room_configs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.team_live_room_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_live_room_configs_select ON public.team_live_room_configs;
CREATE POLICY team_live_room_configs_select
ON public.team_live_room_configs
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.is_team_approved_member(team_id, auth.uid())
);

DROP POLICY IF EXISTS team_live_room_configs_update ON public.team_live_room_configs;
CREATE POLICY team_live_room_configs_update
ON public.team_live_room_configs
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND public.team_is_admin(team_id, auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.team_is_admin(team_id, auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_live_room_configs TO authenticated;

-- ============================================================================
-- HELPERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.team_is_admin(p_team_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_team_id IS NOT NULL
    AND p_profile_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.teams t
        WHERE t.id = p_team_id
          AND t.created_by = p_profile_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.team_memberships m
        WHERE m.team_id = p_team_id
          AND m.profile_id = p_profile_id
          AND m.status = 'approved'
          AND m.role = 'Team_Admin'
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.ensure_team_live_room_config(
  p_team_id uuid,
  p_actor uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team record;
BEGIN
  IF p_team_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id, created_by, approved_member_count
  INTO v_team
  FROM public.teams
  WHERE id = p_team_id;

  IF NOT FOUND OR v_team.approved_member_count < 100 THEN
    RETURN;
  END IF;

  INSERT INTO public.team_live_room_configs (team_id, visibility, created_by)
  VALUES (v_team.id, 'private', COALESCE(p_actor, v_team.created_by))
  ON CONFLICT (team_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_teams_auto_create_live_room()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NEW.approved_member_count >= 100 THEN
    PERFORM public.ensure_team_live_room_config(NEW.id, NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_teams_auto_create_live_room ON public.teams;
CREATE TRIGGER trigger_teams_auto_create_live_room
AFTER UPDATE OF approved_member_count ON public.teams
FOR EACH ROW
WHEN (NEW.approved_member_count >= 100 AND COALESCE(OLD.approved_member_count, 0) <> NEW.approved_member_count)
EXECUTE FUNCTION public.trg_teams_auto_create_live_room();

-- ============================================================================
-- RPCs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_team_live_room_config(p_team_slug text)
RETURNS TABLE(
  team_id uuid,
  team_slug text,
  team_name text,
  team_owner_id uuid,
  approved_member_count int,
  unlock_threshold int,
  visibility text,
  has_config boolean,
  is_unlocked boolean,
  created_at timestamptz,
  updated_at timestamptz,
  is_member boolean,
  viewer_is_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team record;
  v_config record;
  v_viewer uuid := auth.uid();
  v_slug text := lower(trim(p_team_slug));
  v_is_member boolean := false;
  v_is_admin boolean := false;
BEGIN
  IF v_slug IS NULL OR v_slug = '' THEN
    RAISE EXCEPTION 'team_slug_required';
  END IF;

  SELECT *
  INTO v_team
  FROM public.teams
  WHERE slug = v_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  IF v_viewer IS NOT NULL THEN
    v_is_member := public.is_team_approved_member(v_team.id, v_viewer);
    v_is_admin := public.team_is_admin(v_team.id, v_viewer);
  END IF;

  IF v_team.approved_member_count >= 100 THEN
    PERFORM public.ensure_team_live_room_config(v_team.id, v_viewer);
  END IF;

  SELECT *
  INTO v_config
  FROM public.team_live_room_configs
  WHERE team_id = v_team.id;

  team_id := v_team.id;
  team_slug := v_team.slug;
  team_name := v_team.name;
  team_owner_id := v_team.created_by;
  approved_member_count := v_team.approved_member_count;
  unlock_threshold := 100;
  visibility := COALESCE(v_config.visibility, 'private');
  has_config := v_config IS NOT NULL;
  is_unlocked := has_config AND v_team.approved_member_count >= 100;
  created_at := v_config.created_at;
  updated_at := v_config.updated_at;
  is_member := v_is_member;
  viewer_is_admin := v_is_admin;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_update_team_live_visibility(
  p_team_slug text,
  p_visibility text
)
RETURNS TABLE(
  team_id uuid,
  team_slug text,
  team_name text,
  team_owner_id uuid,
  approved_member_count int,
  unlock_threshold int,
  visibility text,
  has_config boolean,
  is_unlocked boolean,
  created_at timestamptz,
  updated_at timestamptz,
  is_member boolean,
  viewer_is_admin boolean
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team record;
  v_actor uuid := auth.uid();
  v_visibility text := lower(trim(p_visibility));
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT *
  INTO v_team
  FROM public.teams
  WHERE slug = lower(trim(p_team_slug));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  IF v_team.approved_member_count < 100 THEN
    RAISE EXCEPTION 'team_live_locked';
  END IF;

  IF v_visibility NOT IN ('private','public') THEN
    RAISE EXCEPTION 'invalid_visibility';
  END IF;

  IF NOT public.team_is_admin(v_team.id, v_actor) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  PERFORM public.ensure_team_live_room_config(v_team.id, v_actor);

  UPDATE public.team_live_room_configs
  SET visibility = v_visibility,
      updated_at = timezone('utc', now())
  WHERE team_id = v_team.id;

  RETURN QUERY SELECT * FROM public.rpc_get_team_live_room_config(v_team.slug);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_get_team_live_room_config(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_update_team_live_visibility(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rpc_get_team_live_room_config(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_update_team_live_visibility(text, text) TO authenticated;

-- ============================================================================
-- BACKFILL
-- ============================================================================

WITH ready AS (
  SELECT id
  FROM public.teams
  WHERE approved_member_count >= 100
)
SELECT public.ensure_team_live_room_config(id, NULL) FROM ready;

COMMIT;
