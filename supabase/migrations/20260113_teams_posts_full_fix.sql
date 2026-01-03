-- ============================================================================
-- TEAMS POSTS FULL FIX MIGRATION
-- ============================================================================
-- This migration ensures all Teams posting, feed, presence, and live room
-- functions are correctly deployed and working.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENSURE CORE TABLES EXIST
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.team_feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text_content text NOT NULL,
  media_url text,
  is_pinned boolean NOT NULL DEFAULT false,
  pinned_at timestamptz,
  comment_count int NOT NULL DEFAULT 0,
  reaction_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_feed_posts_team_created
  ON public.team_feed_posts(team_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_team_feed_posts_team_pinned
  ON public.team_feed_posts(team_id, is_pinned DESC, pinned_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_feed_posts_author
  ON public.team_feed_posts(author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.team_feed_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.team_feed_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text_content text NOT NULL,
  parent_comment_id uuid REFERENCES public.team_feed_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_feed_comments_post_created
  ON public.team_feed_comments(post_id, created_at ASC, id ASC);

CREATE TABLE IF NOT EXISTS public.team_feed_reactions (
  post_id uuid NOT NULL REFERENCES public.team_feed_posts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, profile_id, reaction_type)
);

-- ============================================================================
-- 2. PRESENCE TABLE
-- ============================================================================

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

-- ============================================================================
-- 3. TEAM LIVE ROOM CONFIGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.team_live_room_configs (
  team_id uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private','public')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

ALTER TABLE public.team_feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_feed_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_presence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_live_room_configs ENABLE ROW LEVEL SECURITY;

-- team_feed_posts policies
DROP POLICY IF EXISTS team_feed_posts_select ON public.team_feed_posts;
CREATE POLICY team_feed_posts_select
ON public.team_feed_posts FOR SELECT
USING (public.is_team_approved_member(team_id, auth.uid()));

DROP POLICY IF EXISTS team_feed_posts_insert ON public.team_feed_posts;
CREATE POLICY team_feed_posts_insert
ON public.team_feed_posts FOR INSERT
WITH CHECK (
  public.is_team_approved_member(team_id, auth.uid())
  AND author_id = auth.uid()
);

DROP POLICY IF EXISTS team_feed_posts_update_author_or_mod ON public.team_feed_posts;
CREATE POLICY team_feed_posts_update_author_or_mod
ON public.team_feed_posts FOR UPDATE
USING (
  public.is_team_approved_member(team_id, auth.uid())
  AND (author_id = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
)
WITH CHECK (
  public.is_team_approved_member(team_id, auth.uid())
  AND (author_id = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
);

DROP POLICY IF EXISTS team_feed_posts_delete_author_or_mod ON public.team_feed_posts;
CREATE POLICY team_feed_posts_delete_author_or_mod
ON public.team_feed_posts FOR DELETE
USING (
  public.is_team_approved_member(team_id, auth.uid())
  AND (author_id = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
);

-- team_feed_comments policies
DROP POLICY IF EXISTS team_feed_comments_select ON public.team_feed_comments;
CREATE POLICY team_feed_comments_select
ON public.team_feed_comments FOR SELECT
USING (public.is_team_approved_member(team_id, auth.uid()));

DROP POLICY IF EXISTS team_feed_comments_insert ON public.team_feed_comments;
CREATE POLICY team_feed_comments_insert
ON public.team_feed_comments FOR INSERT
WITH CHECK (
  public.is_team_approved_member(team_id, auth.uid())
  AND author_id = auth.uid()
);

-- team_presence_events policies
DROP POLICY IF EXISTS team_presence_events_select_scoped ON public.team_presence_events;
CREATE POLICY team_presence_events_select_scoped
ON public.team_presence_events
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    member_id = auth.uid()
    OR public.team_can_moderate(team_id, auth.uid())
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

-- team_live_room_configs policies
DROP POLICY IF EXISTS team_live_room_configs_select ON public.team_live_room_configs;
CREATE POLICY team_live_room_configs_select
ON public.team_live_room_configs
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.is_team_approved_member(team_id, auth.uid())
);

-- ============================================================================
-- 5. HELPER FUNCTIONS
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

-- ============================================================================
-- 6. CORE RPC FUNCTIONS
-- ============================================================================

-- rpc_get_team_feed
DROP FUNCTION IF EXISTS public.rpc_get_team_feed(text, int, timestamptz, uuid);
CREATE OR REPLACE FUNCTION public.rpc_get_team_feed(
  p_team_slug text,
  p_limit int DEFAULT 20,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL
)
RETURNS TABLE(
  post_id uuid,
  team_id uuid,
  author_id uuid,
  author_username text,
  author_avatar_url text,
  text_content text,
  media_url text,
  is_pinned boolean,
  pinned_at timestamptz,
  comment_count int,
  reaction_count int,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
  v_l int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT t.id INTO v_team_id
  FROM public.teams t
  WHERE t.slug = p_team_slug;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  IF NOT public.is_team_approved_member(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_l := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);

  RETURN QUERY
  SELECT
    p.id,
    p.team_id,
    p.author_id,
    pr.username::text,
    pr.avatar_url::text,
    p.text_content,
    p.media_url,
    p.is_pinned,
    p.pinned_at,
    p.comment_count,
    p.reaction_count,
    p.created_at
  FROM public.team_feed_posts p
  JOIN public.profiles pr ON pr.id = p.author_id
  WHERE p.team_id = v_team_id
    AND (
      p_before_created_at IS NULL
      OR (p.created_at, p.id) < (p_before_created_at, p_before_id)
    )
  ORDER BY p.is_pinned DESC, p.pinned_at DESC NULLS LAST, p.created_at DESC, p.id DESC
  LIMIT v_l;
END;
$$;

-- rpc_create_team_post
DROP FUNCTION IF EXISTS public.rpc_create_team_post(text, text, text);
CREATE OR REPLACE FUNCTION public.rpc_create_team_post(
  p_team_slug text,
  p_text_content text,
  p_media_url text DEFAULT NULL
)
RETURNS public.team_feed_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
  v_post public.team_feed_posts;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT t.id INTO v_team_id
  FROM public.teams t
  WHERE t.slug = p_team_slug;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  IF public.is_team_banned(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'banned';
  END IF;

  IF NOT public.is_team_approved_member(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.team_feed_posts (team_id, author_id, text_content, media_url)
  VALUES (v_team_id, auth.uid(), p_text_content, p_media_url)
  RETURNING * INTO v_post;

  RETURN v_post;
END;
$$;

-- rpc_create_team_comment
DROP FUNCTION IF EXISTS public.rpc_create_team_comment(uuid, text, uuid);
CREATE OR REPLACE FUNCTION public.rpc_create_team_comment(
  p_post_id uuid,
  p_text_content text,
  p_parent_comment_id uuid DEFAULT NULL
)
RETURNS public.team_feed_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_post_team_id uuid;
  v_comment public.team_feed_comments;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT p.team_id INTO v_post_team_id
  FROM public.team_feed_posts p
  WHERE p.id = p_post_id;

  IF v_post_team_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  IF public.is_team_banned(v_post_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'banned';
  END IF;

  IF NOT public.is_team_approved_member(v_post_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.team_feed_comments (team_id, post_id, author_id, text_content, parent_comment_id)
  VALUES (v_post_team_id, p_post_id, auth.uid(), p_text_content, p_parent_comment_id)
  RETURNING * INTO v_comment;

  UPDATE public.team_feed_posts
  SET comment_count = comment_count + 1,
      updated_at = now()
  WHERE id = p_post_id;

  RETURN v_comment;
END;
$$;

-- rpc_react_team_post
DROP FUNCTION IF EXISTS public.rpc_react_team_post(uuid, text);
CREATE OR REPLACE FUNCTION public.rpc_react_team_post(
  p_post_id uuid,
  p_reaction_type text DEFAULT 'like'
)
RETURNS TABLE(reaction_count int, is_reacted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
  v_rowcount int := 0;
  v_inserted boolean := false;
  v_cnt int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_reaction_type IS NULL OR p_reaction_type <> 'like' THEN
    RAISE EXCEPTION 'invalid_reaction_type';
  END IF;

  SELECT p.team_id INTO v_team_id
  FROM public.team_feed_posts p
  WHERE p.id = p_post_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  IF public.is_team_banned(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'banned';
  END IF;

  IF NOT public.is_team_approved_member(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.team_feed_reactions (post_id, profile_id, reaction_type)
  VALUES (p_post_id, auth.uid(), p_reaction_type)
  ON CONFLICT (post_id, profile_id, reaction_type) DO NOTHING;

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  v_inserted := (COALESCE(v_rowcount, 0) > 0);

  IF v_inserted THEN
    UPDATE public.team_feed_posts
    SET reaction_count = reaction_count + 1,
        updated_at = now()
    WHERE id = p_post_id;
  END IF;

  SELECT tfp.reaction_count INTO v_cnt
  FROM public.team_feed_posts tfp
  WHERE tfp.id = p_post_id;

  RETURN QUERY SELECT COALESCE(v_cnt, 0), true;
END;
$$;

-- rpc_delete_team_post
DROP FUNCTION IF EXISTS public.rpc_delete_team_post(uuid);
CREATE OR REPLACE FUNCTION public.rpc_delete_team_post(p_post_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_team_id uuid;
  v_author_id uuid;
  v_can_moderate boolean := false;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT team_id, author_id INTO v_team_id, v_author_id
  FROM public.team_feed_posts
  WHERE id = p_post_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  -- Allow if author OR moderator
  v_can_moderate := public.team_can_moderate(v_team_id, v_actor);
  
  IF v_author_id != v_actor AND NOT v_can_moderate THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.team_feed_posts WHERE id = p_post_id;

  RETURN true;
END;
$$;

-- rpc_pin_team_post
DROP FUNCTION IF EXISTS public.rpc_pin_team_post(uuid, boolean);
CREATE OR REPLACE FUNCTION public.rpc_pin_team_post(p_post_id uuid, p_pin boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_team_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT team_id INTO v_team_id
  FROM public.team_feed_posts
  WHERE id = p_post_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  -- Only moderators can pin/unpin
  IF NOT public.team_can_moderate(v_team_id, v_actor) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.team_feed_posts
  SET 
    is_pinned = p_pin,
    pinned_at = CASE WHEN p_pin THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_post_id;

  RETURN true;
END;
$$;

-- rpc_get_team_members
DROP FUNCTION IF EXISTS public.rpc_get_team_members(text, text, text, text, int);
CREATE OR REPLACE FUNCTION public.rpc_get_team_members(
  p_team_slug text,
  p_status text DEFAULT 'approved',
  p_role text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS TABLE(
  profile_id uuid,
  username text,
  avatar_url text,
  status public.team_membership_status,
  role public.team_member_role,
  requested_at timestamptz,
  approved_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
  v_can_moderate boolean := false;
  v_limit int;
  v_status public.team_membership_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT t.id INTO v_team_id
  FROM public.teams t
  WHERE t.slug = p_team_slug;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  v_can_moderate := public.team_can_moderate(v_team_id, auth.uid());

  IF NOT v_can_moderate THEN
    v_status := 'approved';
  ELSE
    BEGIN
      v_status := p_status::public.team_membership_status;
    EXCEPTION WHEN others THEN
      v_status := 'approved';
    END;
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 50);

  RETURN QUERY
  SELECT
    m.profile_id,
    pr.username::text,
    pr.avatar_url::text,
    m.status,
    m.role,
    m.requested_at,
    m.approved_at
  FROM public.team_memberships m
  JOIN public.profiles pr ON pr.id = m.profile_id
  WHERE m.team_id = v_team_id
    AND m.status = v_status
    AND (p_role IS NULL OR m.role::text = p_role)
    AND (p_search IS NULL OR pr.username ILIKE ('%' || p_search || '%'))
  ORDER BY pr.username ASC
  LIMIT v_limit;
END;
$$;

-- rpc_get_team_live_rooms
DROP FUNCTION IF EXISTS public.rpc_get_team_live_rooms(text);
CREATE OR REPLACE FUNCTION public.rpc_get_team_live_rooms(p_team_slug text)
RETURNS TABLE(
  live_stream_id int,
  host_profile_id uuid,
  host_username text,
  host_avatar_url text,
  started_at timestamptz,
  status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT t.id INTO v_team_id
  FROM public.teams t
  WHERE t.slug = p_team_slug;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;

  IF NOT public.is_team_approved_member(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    ls.id::int,
    ls.profile_id,
    pr.username::text,
    pr.avatar_url::text,
    ls.started_at,
    CASE
      WHEN ls.ended_at IS NULL AND ls.live_available = true THEN 'live'::text
      ELSE 'ended'::text
    END AS status
  FROM public.team_live_rooms tlr
  JOIN public.live_streams ls ON ls.id = tlr.live_stream_id
  JOIN public.profiles pr ON pr.id = ls.profile_id
  WHERE tlr.team_id = v_team_id
  ORDER BY ls.started_at DESC;
END;
$$;

-- ============================================================================
-- 7. PRESENCE RPCs
-- ============================================================================

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

  -- Only allow updating your own presence
  IF v_actor != p_member_id THEN
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

  -- Must be a team member
  IF NOT public.is_team_approved_member(p_team_id, v_actor) THEN
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
    live_streamers AS (
      SELECT COUNT(DISTINCT ls.profile_id) AS ct
      FROM public.live_streams ls
      JOIN public.team_live_rooms tlr ON tlr.live_stream_id = ls.id
      WHERE tlr.team_id = p_team_id
        AND ls.live_available = true
        AND ls.ended_at IS NULL
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

-- ============================================================================
-- 8. TEAM LIVE ROOM CONFIG RPCs
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_get_team_live_room_config(text);
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
  WHERE team_live_room_configs.team_id = v_team.id;

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

DROP FUNCTION IF EXISTS public.rpc_update_team_live_visibility(text, text);
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
  WHERE team_live_room_configs.team_id = v_team.id;

  RETURN QUERY SELECT * FROM public.rpc_get_team_live_room_config(v_team.slug);
END;
$$;

-- ============================================================================
-- 9. GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_feed_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_feed_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_feed_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.team_presence_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_live_room_configs TO authenticated;

REVOKE ALL ON FUNCTION public.rpc_get_team_feed(text, int, timestamptz, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_create_team_post(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_create_team_comment(uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_react_team_post(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_delete_team_post(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_pin_team_post(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_team_members(text, text, text, text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_team_live_rooms(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_upsert_team_presence(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_presence_summary(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_team_live_room_config(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_update_team_live_visibility(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rpc_get_team_feed(text, int, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_team_post(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_team_comment(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_react_team_post(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_delete_team_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_pin_team_post(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_team_members(text, text, text, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_team_live_rooms(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_upsert_team_presence(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_presence_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_team_live_room_config(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_update_team_live_visibility(text, text) TO authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run after applying)
-- ============================================================================
-- SELECT * FROM public.rpc_get_team_feed('your-team-slug', 10, NULL, NULL);
-- SELECT * FROM public.rpc_get_presence_summary('team-uuid-here');
-- SELECT * FROM public.rpc_get_team_live_room_config('your-team-slug');
