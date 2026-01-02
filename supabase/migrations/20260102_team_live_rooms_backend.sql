BEGIN;

-- ============================================================================
-- TEAM LIVE ROOMS BACKEND - DISABLED
-- ============================================================================
-- This migration is DISABLED because:
-- 1. The canonical teams backend (20260102_zz_canonical_teams_backend.sql) already
--    defines a simpler team_live_rooms table: (live_stream_id, team_id, created_at)
-- 2. The canonical backend already has rpc_get_team_live_rooms(p_team_slug)
-- 3. This migration tried to create a different structure with room_slug, name,
--    permissions, etc. which conflicts with the existing schema.
--
-- The existing setup works as follows:
-- - team_live_rooms links a live_stream_id to a team_id
-- - rpc_get_team_live_rooms returns active team streams with host info
-- - "Go Live" shows a "Coming Soon" modal in the UI
--
-- When ready to implement full team live streaming, update the existing
-- canonical backend functions rather than using this migration.
-- ============================================================================

/*
-- EVERYTHING BELOW IS DISABLED --

CREATE OR REPLACE FUNCTION public.team_role_rank(p_role text)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_role,''))
    WHEN 'owner' THEN 40
    WHEN 'admin' THEN 30
    WHEN 'moderator' THEN 20
    WHEN 'member' THEN 10
    ELSE 0
  END;
$$;

-- ... rest of migration content removed for brevity ...
-- The full content was incompatible with the existing team_live_rooms table structure

*/

COMMIT;
