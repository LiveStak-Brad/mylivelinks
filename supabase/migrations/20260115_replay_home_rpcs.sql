BEGIN;

-- =============================================================================
-- REPLAY HOME RPCs: Global feed and PRP dedupe functions
-- =============================================================================
-- Adds RPCs for the /replay global home page:
-- - get_replay_feed_popular: Popular content sorted by views
-- - get_replay_feed_new: New uploads sorted by created_at
-- - get_prp_feed_deduped: PRP feed with first-curator-credit dedupe
-- - get_public_replay_playlists: Public playlists listing
--
-- Depends on: 20260115_curator_playlists.sql (tables already exist)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Add views_count to creator_studio_items if not exists
-- -----------------------------------------------------------------------------
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS views_count int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_creator_studio_items_views_count
  ON public.creator_studio_items(views_count DESC);

-- -----------------------------------------------------------------------------
-- Add index on youtube_video_id for PRP dedupe queries
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_replay_playlist_items_youtube_video_id
  ON public.replay_playlist_items(youtube_video_id);

CREATE INDEX IF NOT EXISTS idx_replay_playlist_items_created_at
  ON public.replay_playlist_items(created_at DESC);

-- -----------------------------------------------------------------------------
-- RPC: Get global replay feed (Popular section)
-- Returns public creator_studio_items sorted by views_count (if exists) or created_at
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_replay_feed_popular(text, int, int);
CREATE OR REPLACE FUNCTION public.get_replay_feed_popular(
  p_category text DEFAULT NULL,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  item_type text,
  media_url text,
  thumb_url text,
  artwork_url text,
  duration_seconds int,
  views_count int,
  created_at timestamptz,
  owner_profile_id uuid,
  owner_username text,
  owner_display_name text,
  owner_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.id,
    i.title,
    i.description,
    i.item_type::text,
    i.media_url,
    i.thumb_url,
    i.artwork_url,
    i.duration_seconds,
    COALESCE(i.views_count, 0) as views_count,
    i.created_at,
    p.id as owner_profile_id,
    p.username as owner_username,
    p.display_name as owner_display_name,
    p.avatar_url as owner_avatar_url
  FROM creator_studio_items i
  JOIN profiles p ON p.id = i.owner_profile_id
  WHERE i.status = 'ready'
    AND i.visibility = 'public'
    AND (p_category IS NULL OR i.item_type::text = p_category)
  ORDER BY COALESCE(i.views_count, 0) DESC, i.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_replay_feed_popular(text, int, int) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC: Get global replay feed (New uploads section)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_replay_feed_new(text, int, int);
CREATE OR REPLACE FUNCTION public.get_replay_feed_new(
  p_category text DEFAULT NULL,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  item_type text,
  media_url text,
  thumb_url text,
  artwork_url text,
  duration_seconds int,
  views_count int,
  created_at timestamptz,
  owner_profile_id uuid,
  owner_username text,
  owner_display_name text,
  owner_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.id,
    i.title,
    i.description,
    i.item_type::text,
    i.media_url,
    i.thumb_url,
    i.artwork_url,
    i.duration_seconds,
    COALESCE(i.views_count, 0) as views_count,
    i.created_at,
    p.id as owner_profile_id,
    p.username as owner_username,
    p.display_name as owner_display_name,
    p.avatar_url as owner_avatar_url
  FROM creator_studio_items i
  JOIN profiles p ON p.id = i.owner_profile_id
  WHERE i.status = 'ready'
    AND i.visibility = 'public'
    AND (p_category IS NULL OR i.item_type::text = p_category)
  ORDER BY i.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_replay_feed_new(text, int, int) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC: Get PRP feed with dedupe (first curator credit)
-- Same youtube_video_id appears only once, credited to first curator
-- Uses replay_playlist_items from curator_playlists migration
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_prp_feed_deduped(int, int);
CREATE OR REPLACE FUNCTION public.get_prp_feed_deduped(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  item_id uuid,
  youtube_video_id text,
  title text,
  description text,
  thumb_url text,
  media_url text,
  duration_seconds int,
  views_count int,
  created_at timestamptz,
  playlist_id uuid,
  playlist_title text,
  curator_profile_id uuid,
  curator_username text,
  curator_display_name text,
  curator_avatar_url text,
  first_added_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH first_curators AS (
    -- For each youtube_video_id, find the first curator (earliest created_at)
    SELECT DISTINCT ON (rpi.youtube_video_id)
      rpi.id as item_id,
      rpi.youtube_video_id,
      rpi.playlist_id,
      rp.profile_id as curator_profile_id,
      rpi.created_at as first_added_at,
      rpi.title as item_title,
      rpi.thumbnail_url as item_thumbnail,
      rpi.duration_seconds as item_duration,
      rpi.youtube_url
    FROM replay_playlist_items rpi
    JOIN replay_playlists rp ON rp.id = rpi.playlist_id
    WHERE rp.visibility = 'public'
      AND rpi.youtube_video_id IS NOT NULL
    ORDER BY rpi.youtube_video_id, rpi.created_at ASC
  )
  SELECT 
    fc.item_id,
    fc.youtube_video_id,
    fc.item_title as title,
    NULL::text as description,
    COALESCE(fc.item_thumbnail, 'https://img.youtube.com/vi/' || fc.youtube_video_id || '/hqdefault.jpg') as thumb_url,
    fc.youtube_url as media_url,
    COALESCE(fc.item_duration, 0) as duration_seconds,
    0 as views_count,
    fc.first_added_at as created_at,
    fc.playlist_id,
    rp.title as playlist_title,
    p.id as curator_profile_id,
    p.username as curator_username,
    p.display_name as curator_display_name,
    p.avatar_url as curator_avatar_url,
    fc.first_added_at
  FROM first_curators fc
  JOIN replay_playlists rp ON rp.id = fc.playlist_id
  JOIN profiles p ON p.id = fc.curator_profile_id
  ORDER BY fc.first_added_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_prp_feed_deduped(int, int) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC: Get public playlists for PRP listing
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_public_replay_playlists(int, int);
CREATE OR REPLACE FUNCTION public.get_public_replay_playlists(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  thumbnail_url text,
  item_count bigint,
  created_at timestamptz,
  owner_profile_id uuid,
  owner_username text,
  owner_display_name text,
  owner_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    rp.id,
    rp.title,
    rp.description,
    rp.thumbnail_url,
    (SELECT COUNT(*) FROM replay_playlist_items rpi WHERE rpi.playlist_id = rp.id) as item_count,
    rp.created_at,
    p.id as owner_profile_id,
    p.username as owner_username,
    p.display_name as owner_display_name,
    p.avatar_url as owner_avatar_url
  FROM replay_playlists rp
  JOIN profiles p ON p.id = rp.profile_id
  WHERE rp.visibility = 'public'
  ORDER BY rp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_replay_playlists(int, int) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC: Get single video by ID for replay player
-- Fetches from creator_studio_items OR profile_music_videos
-- Accepts TEXT id to handle both UUIDs and YouTube video IDs
-- Returns NULL if not found or not public
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_replay_video_by_id(uuid, text);
DROP FUNCTION IF EXISTS public.get_replay_video_by_id(text, text);
CREATE OR REPLACE FUNCTION public.get_replay_video_by_id(
  p_video_id text,
  p_username text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  title text,
  description text,
  item_type text,
  media_url text,
  thumb_url text,
  artwork_url text,
  duration_seconds int,
  views_count int,
  created_at timestamptz,
  owner_profile_id uuid,
  owner_username text,
  owner_display_name text,
  owner_avatar_url text,
  source_table text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_uuid uuid;
  v_is_uuid boolean := false;
BEGIN
  -- If username provided, get profile_id for additional validation
  IF p_username IS NOT NULL THEN
    SELECT p.id INTO v_profile_id
    FROM profiles p
    WHERE p.username = p_username;
  END IF;

  -- Check if p_video_id is a valid UUID
  BEGIN
    v_uuid := p_video_id::uuid;
    v_is_uuid := true;
  EXCEPTION WHEN invalid_text_representation THEN
    v_is_uuid := false;
  END;

  -- If it's a UUID, try creator_studio_items first
  IF v_is_uuid THEN
    RETURN QUERY
    SELECT 
      i.id::text,
      i.title,
      i.description,
      i.item_type::text,
      i.media_url,
      i.thumb_url,
      i.artwork_url,
      i.duration_seconds,
      COALESCE(i.views_count, 0) as views_count,
      i.created_at,
      p.id as owner_profile_id,
      p.username as owner_username,
      p.display_name as owner_display_name,
      p.avatar_url as owner_avatar_url,
      'creator_studio_items'::text as source_table
    FROM creator_studio_items i
    JOIN profiles p ON p.id = i.owner_profile_id
    WHERE i.id = v_uuid
      AND i.status = 'ready'
      AND i.visibility = 'public'
      AND (v_profile_id IS NULL OR i.owner_profile_id = v_profile_id);

    IF FOUND THEN
      RETURN;
    END IF;

    -- Also try profile_music_videos with UUID
    RETURN QUERY
    SELECT 
      mv.id::text,
      mv.title,
      mv.description,
      'music_video'::text as item_type,
      COALESCE(mv.video_url, 'https://www.youtube.com/embed/' || mv.youtube_id) as media_url,
      COALESCE(mv.thumbnail_url, 'https://img.youtube.com/vi/' || mv.youtube_id || '/hqdefault.jpg') as thumb_url,
      NULL::text as artwork_url,
      0 as duration_seconds,
      COALESCE(mv.views_count, 0) as views_count,
      mv.created_at,
      p.id as owner_profile_id,
      p.username as owner_username,
      p.display_name as owner_display_name,
      p.avatar_url as owner_avatar_url,
      'profile_music_videos'::text as source_table
    FROM profile_music_videos mv
    JOIN profiles p ON p.id = mv.profile_id
    WHERE mv.id = v_uuid
      AND (v_profile_id IS NULL OR mv.profile_id = v_profile_id);
  ELSE
    -- Not a UUID - try profile_music_videos by youtube_id
    RETURN QUERY
    SELECT 
      mv.id::text,
      mv.title,
      mv.description,
      'music_video'::text as item_type,
      COALESCE(mv.video_url, 'https://www.youtube.com/embed/' || mv.youtube_id) as media_url,
      COALESCE(mv.thumbnail_url, 'https://img.youtube.com/vi/' || mv.youtube_id || '/hqdefault.jpg') as thumb_url,
      NULL::text as artwork_url,
      0 as duration_seconds,
      COALESCE(mv.views_count, 0) as views_count,
      mv.created_at,
      p.id as owner_profile_id,
      p.username as owner_username,
      p.display_name as owner_display_name,
      p.avatar_url as owner_avatar_url,
      'profile_music_videos'::text as source_table
    FROM profile_music_videos mv
    JOIN profiles p ON p.id = mv.profile_id
    WHERE mv.youtube_id = p_video_id
      AND (v_profile_id IS NULL OR mv.profile_id = v_profile_id);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_replay_video_by_id(text, text) TO anon, authenticated;

COMMIT;
