-- ============================================================================
-- TEAM PRESENCE COMPATIBILITY LAYER
-- ============================================================================
-- Creates wrapper functions needed by the presence system that map to the
-- existing canonical teams backend functions.
-- ============================================================================

BEGIN;

-- team_schema_ready: Always returns true since we know the schema exists
CREATE OR REPLACE FUNCTION public.team_schema_ready()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT true;
$$;

-- team_is_approved_member: Wrapper for is_team_approved_member
CREATE OR REPLACE FUNCTION public.team_is_approved_member(p_team_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.is_team_approved_member(p_team_id, p_profile_id);
$$;

-- team_role_rank: Map role names to numeric ranks
CREATE OR REPLACE FUNCTION public.team_role_rank(p_role text)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_role,''))
    WHEN 'team_admin' THEN 40
    WHEN 'owner' THEN 40
    WHEN 'admin' THEN 30
    WHEN 'team_moderator' THEN 20
    WHEN 'moderator' THEN 20
    WHEN 'team_member' THEN 10
    WHEN 'member' THEN 10
    ELSE 0
  END;
$$;

-- team_member_role: Get a member's role in a team
CREATE OR REPLACE FUNCTION public.team_member_role(p_team_id uuid, p_profile_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT m.role::text
  FROM public.team_memberships m
  WHERE m.team_id = p_team_id
    AND m.profile_id = p_profile_id
    AND m.status = 'approved';
$$;

-- team_has_min_role: Check if user has at least a certain role level
CREATE OR REPLACE FUNCTION public.team_has_min_role(p_team_id uuid, p_profile_id uuid, p_min_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.team_role_rank(public.team_member_role(p_team_id, p_profile_id)) >= public.team_role_rank(p_min_role);
$$;

-- team_members_has_column: Check if team_memberships has a column (used for optional features)
CREATE OR REPLACE FUNCTION public.team_members_has_column(p_column_name text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'team_memberships'
      AND column_name = p_column_name
  );
$$;

-- Grants
REVOKE ALL ON FUNCTION public.team_schema_ready() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.team_is_approved_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.team_role_rank(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.team_member_role(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.team_has_min_role(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.team_members_has_column(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.team_schema_ready() TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_is_approved_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_role_rank(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_member_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_has_min_role(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_members_has_column(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Compatibility table for team_live_sessions
-- ---------------------------------------------------------------------------
-- Multiple migrations expect a team_live_sessions table to exist.
-- Create a stub table with the expected columns that will work for now.
-- It starts empty and can be populated when team live streaming is implemented.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.team_live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid,  -- Would reference team_live_rooms.id if that had uuid PK
  live_stream_id int REFERENCES public.live_streams(id) ON DELETE CASCADE,
  host_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('scheduled','live','ended','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_live_sessions_live_stream
  ON public.team_live_sessions(live_stream_id);

CREATE INDEX IF NOT EXISTS idx_team_live_sessions_status
  ON public.team_live_sessions(status) WHERE status = 'live';

ALTER TABLE public.team_live_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_live_sessions_select_all ON public.team_live_sessions;
CREATE POLICY team_live_sessions_select_all
ON public.team_live_sessions
FOR SELECT
USING (true);

GRANT SELECT ON public.team_live_sessions TO authenticated;

COMMIT;

SELECT 'Team presence compatibility layer created' AS result;
