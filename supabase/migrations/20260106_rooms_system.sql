-- ============================================================================
-- ROOMS SYSTEM EXTENSION
-- ============================================================================
-- Extends the existing rooms table with team support, voting, and visibility
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Add new columns to existing rooms table
-- ---------------------------------------------------------------------------

-- Add slug column (alias for room_key for API consistency)
DO $$ BEGIN
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS slug text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Update slug from room_key for existing rows
UPDATE public.rooms SET slug = room_key WHERE slug IS NULL;

-- Add type column
DO $$ BEGIN
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS room_type text NOT NULL DEFAULT 'official';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add visibility column
DO $$ BEGIN
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add team_id column
DO $$ BEGIN
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add admin_profile_id column
DO $$ BEGIN
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS admin_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add grid_size column
DO $$ BEGIN
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS grid_size int NOT NULL DEFAULT 12;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add chat_enabled column
DO $$ BEGIN
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS chat_enabled boolean NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add gifting_enabled column
DO $$ BEGIN
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS gifting_enabled boolean NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add vote_count column
DO $$ BEGIN
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS vote_count int NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add voting_ends_at column
DO $$ BEGIN
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS voting_ends_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add scheduled columns
DO $$ BEGIN
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS scheduled_start_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS scheduled_end_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add viewer/streamer counts
DO $$ BEGIN
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS current_viewer_count int NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS current_streamer_count int NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS total_viewer_minutes bigint NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add launch/archive timestamps
DO $$ BEGIN
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS launched_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS archived_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add icon_url (may already exist as image_url)
DO $$ BEGIN
  ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS icon_url text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_rooms_room_type ON public.rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_rooms_team ON public.rooms(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rooms_voting ON public.rooms(vote_count DESC) WHERE status = 'voting';
CREATE INDEX IF NOT EXISTS idx_rooms_visibility ON public.rooms(visibility);

-- ---------------------------------------------------------------------------
-- Room votes table (for future rooms voting)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.room_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_room_votes_room ON public.room_votes(room_id);

-- Trigger to update vote count
CREATE OR REPLACE FUNCTION public.update_room_vote_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.rooms SET vote_count = vote_count + 1, updated_at = now()
    WHERE id = NEW.room_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.rooms SET vote_count = GREATEST(vote_count - 1, 0), updated_at = now()
    WHERE id = OLD.room_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_room_votes_count ON public.room_votes;
CREATE TRIGGER trg_room_votes_count
AFTER INSERT OR DELETE ON public.room_votes
FOR EACH ROW EXECUTE FUNCTION public.update_room_vote_count();

-- ---------------------------------------------------------------------------
-- Room admins table (additional admins beyond owner)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.room_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'moderator' CHECK (role IN ('admin', 'moderator')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, profile_id)
);

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.room_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_admins ENABLE ROW LEVEL SECURITY;

-- Room votes policies
DROP POLICY IF EXISTS room_votes_select ON public.room_votes;
CREATE POLICY room_votes_select ON public.room_votes
FOR SELECT USING (true);

DROP POLICY IF EXISTS room_votes_insert ON public.room_votes;
CREATE POLICY room_votes_insert ON public.room_votes
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  profile_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND status = 'voting')
);

DROP POLICY IF EXISTS room_votes_delete ON public.room_votes;
CREATE POLICY room_votes_delete ON public.room_votes
FOR DELETE USING (profile_id = auth.uid());

-- Room admins policies
DROP POLICY IF EXISTS room_admins_select ON public.room_admins;
CREATE POLICY room_admins_select ON public.room_admins
FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- Helper Functions
-- ---------------------------------------------------------------------------

-- Check if team can have a live room (100+ members requirement, bypassed for admins)
CREATE OR REPLACE FUNCTION public.team_can_have_room(p_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Platform admins can bypass the requirement
  IF public.is_admin(auth.uid()) THEN
    RETURN true;
  END IF;
  
  -- Normal check: 100+ members
  RETURN COALESCE(
    (SELECT approved_member_count >= 100 FROM public.teams WHERE id = p_team_id),
    false
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Create a new room
CREATE OR REPLACE FUNCTION public.rpc_create_room(
  p_name text,
  p_room_key text,
  p_room_type text DEFAULT 'official',
  p_visibility text DEFAULT 'public',
  p_status text DEFAULT 'draft',
  p_description text DEFAULT NULL,
  p_team_id uuid DEFAULT NULL,
  p_admin_profile_id uuid DEFAULT NULL,
  p_grid_size int DEFAULT 12,
  p_icon_url text DEFAULT NULL,
  p_banner_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_room_id uuid;
  v_admin_id uuid;
  v_slug text;
BEGIN
  -- Must be platform admin to create rooms
  IF NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'forbidden: only platform admins can create rooms';
  END IF;
  
  -- Validate type
  IF p_room_type NOT IN ('official', 'team', 'community') THEN
    RAISE EXCEPTION 'invalid_room_type';
  END IF;
  
  -- Validate visibility
  IF p_visibility NOT IN ('public', 'private', 'team_only') THEN
    RAISE EXCEPTION 'invalid_visibility';
  END IF;
  
  -- Team rooms require team_id and 100+ members
  IF p_room_type = 'team' THEN
    IF p_team_id IS NULL THEN
      RAISE EXCEPTION 'team_id_required_for_team_rooms';
    END IF;
    IF NOT public.team_can_have_room(p_team_id) THEN
      RAISE EXCEPTION 'team_needs_100_members: Team must have at least 100 members to create a live room';
    END IF;
  END IF;
  
  -- Determine admin
  v_admin_id := COALESCE(p_admin_profile_id, v_actor);
  v_slug := lower(trim(p_room_key));
  
  -- Create the room
  INSERT INTO public.rooms (
    room_key,
    slug,
    name,
    room_type,
    visibility,
    status,
    description,
    team_id,
    admin_profile_id,
    grid_size,
    icon_url,
    banner_url,
    category
  )
  VALUES (
    v_slug,
    v_slug,
    p_name,
    p_room_type,
    p_visibility,
    p_status,
    p_description,
    p_team_id,
    v_admin_id,
    p_grid_size,
    p_icon_url,
    p_banner_url,
    'entertainment'
  )
  RETURNING id INTO v_room_id;
  
  RETURN jsonb_build_object(
    'ok', true,
    'room_id', v_room_id,
    'slug', v_slug
  );
END;
$$;

-- Get all rooms (for admin panel)
CREATE OR REPLACE FUNCTION public.rpc_get_all_rooms()
RETURNS TABLE(
  id uuid,
  room_key text,
  slug text,
  name text,
  description text,
  room_type text,
  visibility text,
  status text,
  team_id uuid,
  team_name text,
  team_slug text,
  admin_profile_id uuid,
  admin_username text,
  grid_size int,
  icon_url text,
  banner_url text,
  vote_count int,
  current_viewer_count int,
  current_streamer_count int,
  created_at timestamptz,
  launched_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  
  RETURN QUERY
  SELECT
    r.id,
    r.room_key,
    COALESCE(r.slug, r.room_key) AS slug,
    r.name,
    r.description,
    COALESCE(r.room_type, 'official') AS room_type,
    COALESCE(r.visibility, 'public') AS visibility,
    r.status,
    r.team_id,
    t.name AS team_name,
    t.slug AS team_slug,
    r.admin_profile_id,
    p.username AS admin_username,
    COALESCE(r.grid_size, 12) AS grid_size,
    COALESCE(r.icon_url, r.image_url) AS icon_url,
    r.banner_url,
    COALESCE(r.vote_count, 0) AS vote_count,
    COALESCE(r.current_viewer_count, 0) AS current_viewer_count,
    COALESCE(r.current_streamer_count, 0) AS current_streamer_count,
    r.created_at,
    r.launched_at
  FROM public.rooms r
  LEFT JOIN public.teams t ON t.id = r.team_id
  LEFT JOIN public.profiles p ON p.id = r.admin_profile_id
  ORDER BY r.created_at DESC;
END;
$$;

-- Get public/live rooms (for LiveTV discovery)
CREATE OR REPLACE FUNCTION public.rpc_get_live_rooms()
RETURNS TABLE(
  id uuid,
  slug text,
  name text,
  description text,
  room_type text,
  icon_url text,
  banner_url text,
  current_viewer_count int,
  current_streamer_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    COALESCE(r.slug, r.room_key) AS slug,
    r.name,
    r.description,
    COALESCE(r.room_type, 'official') AS room_type,
    COALESCE(r.icon_url, r.image_url) AS icon_url,
    r.banner_url,
    COALESCE(r.current_viewer_count, 0) AS current_viewer_count,
    COALESCE(r.current_streamer_count, 0) AS current_streamer_count
  FROM public.rooms r
  WHERE r.status = 'live'
    AND COALESCE(r.visibility, 'public') = 'public'
  ORDER BY COALESCE(r.current_viewer_count, 0) DESC;
$$;

-- Get voting rooms (for home page)
CREATE OR REPLACE FUNCTION public.rpc_get_voting_rooms()
RETURNS TABLE(
  id uuid,
  slug text,
  name text,
  description text,
  icon_url text,
  vote_count int,
  voting_ends_at timestamptz,
  user_has_voted boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    COALESCE(r.slug, r.room_key) AS slug,
    r.name,
    r.description,
    COALESCE(r.icon_url, r.image_url) AS icon_url,
    COALESCE(r.vote_count, 0) AS vote_count,
    r.voting_ends_at,
    EXISTS (
      SELECT 1 FROM public.room_votes rv
      WHERE rv.room_id = r.id AND rv.profile_id = auth.uid()
    ) AS user_has_voted
  FROM public.rooms r
  WHERE r.status = 'voting'
    AND (r.voting_ends_at IS NULL OR r.voting_ends_at > now())
  ORDER BY COALESCE(r.vote_count, 0) DESC;
END;
$$;

-- Vote for a room
CREATE OR REPLACE FUNCTION public.rpc_vote_for_room(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.rooms WHERE id = p_room_id AND status = 'voting') THEN
    RAISE EXCEPTION 'room_not_accepting_votes';
  END IF;
  
  INSERT INTO public.room_votes (room_id, profile_id)
  VALUES (p_room_id, v_actor)
  ON CONFLICT (room_id, profile_id) DO NOTHING;
  
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Launch a room
CREATE OR REPLACE FUNCTION public.rpc_launch_room(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  
  UPDATE public.rooms
  SET status = 'live',
      launched_at = now(),
      updated_at = now()
  WHERE id = p_room_id;
  
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Archive a room
CREATE OR REPLACE FUNCTION public.rpc_archive_room(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  
  UPDATE public.rooms
  SET status = 'archived',
      archived_at = now(),
      updated_at = now()
  WHERE id = p_room_id;
  
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Get room config by slug (for LiveRoom component)
CREATE OR REPLACE FUNCTION public.rpc_get_room_config(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room record;
  v_actor uuid := auth.uid();
  v_can_view boolean := false;
  v_can_publish boolean := false;
  v_can_moderate boolean := false;
  v_team_role text;
  v_room_type text;
  v_visibility text;
BEGIN
  SELECT * INTO v_room
  FROM public.rooms
  WHERE slug = lower(trim(p_slug)) OR room_key = lower(trim(p_slug));
  
  IF v_room IS NULL THEN
    RAISE EXCEPTION 'room_not_found';
  END IF;
  
  v_room_type := COALESCE(v_room.room_type, 'official');
  v_visibility := COALESCE(v_room.visibility, 'public');
  
  -- Determine permissions based on room type
  IF v_visibility = 'public' THEN
    v_can_view := true;
  ELSIF v_room_type = 'team' AND v_room.team_id IS NOT NULL THEN
    v_can_view := public.is_team_approved_member(v_room.team_id, v_actor);
    SELECT role::text INTO v_team_role
    FROM public.team_memberships
    WHERE team_id = v_room.team_id AND profile_id = v_actor AND status = 'approved';
  END IF;
  
  -- Admin always has access
  IF public.is_admin(v_actor) THEN
    v_can_view := true;
    v_can_publish := true;
    v_can_moderate := true;
  END IF;
  
  -- Room admin has full access
  IF v_room.admin_profile_id = v_actor THEN
    v_can_view := true;
    v_can_publish := true;
    v_can_moderate := true;
  END IF;
  
  -- Check room_admins table
  IF EXISTS (SELECT 1 FROM public.room_admins WHERE room_id = v_room.id AND profile_id = v_actor) THEN
    v_can_view := true;
    v_can_publish := true;
    v_can_moderate := true;
  END IF;
  
  -- Team role based publishing
  IF v_room_type = 'team' AND v_team_role IN ('team_admin', 'owner', 'admin', 'moderator') THEN
    v_can_publish := true;
  END IF;
  
  RETURN jsonb_build_object(
    'id', v_room.id,
    'room_key', v_room.room_key,
    'slug', COALESCE(v_room.slug, v_room.room_key),
    'name', v_room.name,
    'description', v_room.description,
    'room_type', v_room_type,
    'visibility', v_visibility,
    'status', v_room.status,
    'team_id', v_room.team_id,
    'team_name', (SELECT t.name FROM public.teams t WHERE t.id = v_room.team_id),
    'team_slug', (SELECT t.slug FROM public.teams t WHERE t.id = v_room.team_id),
    'icon_url', COALESCE(v_room.icon_url, v_room.image_url),
    'banner_url', v_room.banner_url,
    'background_image', v_room.background_image,
    'fallback_gradient', v_room.fallback_gradient,
    'grid_size', COALESCE(v_room.grid_size, 12),
    'chat_enabled', COALESCE(v_room.chat_enabled, true),
    'gifting_enabled', COALESCE(v_room.gifting_enabled, true),
    'permissions', jsonb_build_object(
      'can_view', v_can_view,
      'can_publish', v_can_publish,
      'can_moderate', v_can_moderate
    )
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Update is_room_admin to also check admin_profile_id on rooms table
-- ---------------------------------------------------------------------------

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
    )
    OR EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = p_room_id
        AND r.admin_profile_id = p_profile_id
    );
$$;

-- ---------------------------------------------------------------------------
-- Update Live Central if it exists
-- ---------------------------------------------------------------------------

UPDATE public.rooms
SET 
  slug = room_key,
  room_type = 'official',
  visibility = 'public',
  grid_size = 12,
  chat_enabled = true,
  gifting_enabled = true
WHERE room_key = 'live_central' OR slug = 'live_central';

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.team_can_have_room(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_create_room(text, text, text, text, text, text, uuid, uuid, int, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_all_rooms() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_live_rooms() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_voting_rooms() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_vote_for_room(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_launch_room(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_archive_room(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_room_config(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.team_can_have_room(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_room(text, text, text, text, text, text, uuid, uuid, int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_all_rooms() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_live_rooms() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_voting_rooms() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rpc_vote_for_room(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_launch_room(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_archive_room(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_room_config(text) TO authenticated, anon;

GRANT SELECT, INSERT, DELETE ON public.room_votes TO authenticated;
GRANT SELECT ON public.room_admins TO authenticated;

COMMIT;

SELECT 'Rooms system extension applied successfully' AS result;
