BEGIN;

-- ============================================================================
-- TEAM PRESENCE MODEL (Simplified)
-- ============================================================================
-- Tracks when team members are actively viewing the team.
-- Simplified version without live_session dependencies.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Base table: team_presence_events
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.team_presence_events (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('web','mobile')),
  heartbeat_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_presence_events_pk PRIMARY KEY (team_id, member_id, source),
  CONSTRAINT team_presence_events_expiry_check CHECK (expires_at >= heartbeat_at)
);

CREATE INDEX IF NOT EXISTS idx_team_presence_events_team_expires
  ON public.team_presence_events(team_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_presence_events_member
  ON public.team_presence_events(member_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_team_presence_events_updated_at ON public.team_presence_events;
CREATE TRIGGER trg_team_presence_events_updated_at
BEFORE UPDATE ON public.team_presence_events
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.team_presence_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_presence_events_select_scoped ON public.team_presence_events;
CREATE POLICY team_presence_events_select_scoped
ON public.team_presence_events
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    member_id = auth.uid()
    OR public.team_can_moderate(team_id, auth.uid())
    OR public.is_admin(auth.uid())
  )
);

DROP POLICY IF EXISTS team_presence_events_insert_self ON public.team_presence_events;
CREATE POLICY team_presence_events_insert_self
ON public.team_presence_events
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND member_id = auth.uid()
  AND public.is_team_approved_member(team_id, auth.uid())
);

DROP POLICY IF EXISTS team_presence_events_update_self ON public.team_presence_events;
CREATE POLICY team_presence_events_update_self
ON public.team_presence_events
FOR UPDATE
USING (auth.uid() IS NOT NULL AND member_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND member_id = auth.uid());

DROP POLICY IF EXISTS team_presence_events_delete_admin ON public.team_presence_events;
CREATE POLICY team_presence_events_delete_admin
ON public.team_presence_events
FOR DELETE
USING (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- RPC: rpc_upsert_team_presence
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.rpc_upsert_team_presence(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.rpc_upsert_team_presence(
  p_team_id uuid,
  p_member_id uuid,
  p_source text
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_source text := lower(trim(coalesce(p_source, 'web')));
  v_heartbeat timestamptz := transaction_timestamp();
  v_expires timestamptz := v_heartbeat + interval '60 seconds';
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_team_id IS NULL OR p_member_id IS NULL THEN
    RAISE EXCEPTION 'team_id_and_member_id_required';
  END IF;

  IF v_source NOT IN ('web','mobile') THEN
    v_source := 'web';
  END IF;

  -- Only allow updating your own presence (or admin)
  IF v_actor != p_member_id AND NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Must be a team member
  IF NOT public.is_team_approved_member(p_team_id, p_member_id) THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;

  INSERT INTO public.team_presence_events(
    team_id,
    member_id,
    source,
    heartbeat_at,
    expires_at
  )
  VALUES (
    p_team_id,
    p_member_id,
    v_source,
    v_heartbeat,
    v_expires
  )
  ON CONFLICT ON CONSTRAINT team_presence_events_pk
  DO UPDATE SET
    heartbeat_at = EXCLUDED.heartbeat_at,
    expires_at = EXCLUDED.expires_at,
    updated_at = transaction_timestamp();

  RETURN v_expires;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: rpc_get_presence_summary
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.rpc_get_presence_summary(uuid);
CREATE OR REPLACE FUNCTION public.rpc_get_presence_summary(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_now timestamptz := transaction_timestamp();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_team_id IS NULL THEN
    RAISE EXCEPTION 'team_id_required';
  END IF;

  -- Must be a team member or admin
  IF NOT public.is_team_approved_member(p_team_id, v_actor) AND NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN (
    WITH fresh AS (
      SELECT *
      FROM public.team_presence_events
      WHERE team_id = p_team_id
        AND expires_at >= v_now
    ),
    per_source AS (
      SELECT source, COUNT(DISTINCT member_id) AS ct
      FROM fresh
      GROUP BY source
    ),
    -- Also count members who are currently live streaming
    live_streamers AS (
      SELECT COUNT(DISTINCT ls.profile_id) AS ct
      FROM public.live_streams ls
      JOIN public.team_live_rooms tlr ON tlr.live_stream_id = ls.id
      WHERE tlr.team_id = p_team_id
        AND ls.status = 'live'
        AND ls.live_available = true
    )
    SELECT jsonb_build_object(
      'team_id', p_team_id,
      'present_total', COALESCE((SELECT COUNT(DISTINCT member_id) FROM fresh), 0),
      'sources', COALESCE(
        (SELECT jsonb_object_agg(source, ct) FROM per_source),
        '{}'::jsonb
      ) || jsonb_build_object('live_session', COALESCE((SELECT ct FROM live_streamers), 0)),
      'generated_at', v_now
    )
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.rpc_upsert_team_presence(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_presence_summary(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rpc_upsert_team_presence(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_presence_summary(uuid) TO authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.team_presence_events TO authenticated;

COMMIT;

SELECT 'Team presence model created successfully' AS result;
