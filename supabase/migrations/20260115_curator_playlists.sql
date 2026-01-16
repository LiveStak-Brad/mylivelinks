-- =============================================================================
-- Curator Playlists System
-- Tables: replay_playlists, replay_playlist_items
-- RPCs for CRUD operations with RLS
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- ENUM: Playlist visibility
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'playlist_visibility') THEN
    CREATE TYPE playlist_visibility AS ENUM ('public', 'unlisted', 'private');
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- ENUM: Playlist category
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'playlist_category') THEN
    CREATE TYPE playlist_category AS ENUM ('music', 'movies', 'education', 'comedy', 'podcasts', 'series', 'mixed');
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- TABLE: replay_playlists
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.replay_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  visibility playlist_visibility NOT NULL DEFAULT 'public',
  category playlist_category NOT NULL DEFAULT 'mixed',
  subcategory text, -- genre or subcategory (e.g., "hip-hop", "action", "web development")
  thumbnail_url text, -- optional override, otherwise auto from first video
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fetching user's playlists
CREATE INDEX IF NOT EXISTS idx_replay_playlists_profile_id 
  ON public.replay_playlists(profile_id);

-- Index for public playlist discovery
CREATE INDEX IF NOT EXISTS idx_replay_playlists_visibility 
  ON public.replay_playlists(visibility) WHERE visibility = 'public';

-- -----------------------------------------------------------------------------
-- TABLE: replay_playlist_items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.replay_playlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.replay_playlists(id) ON DELETE CASCADE,
  youtube_url text NOT NULL,
  youtube_video_id text NOT NULL,
  title text, -- fetched metadata or user-provided
  author text, -- channel name
  thumbnail_url text, -- auto-generated from youtube_video_id if not provided
  duration_seconds int, -- video duration if available
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fetching playlist items in order
CREATE INDEX IF NOT EXISTS idx_replay_playlist_items_playlist_position 
  ON public.replay_playlist_items(playlist_id, position);

-- -----------------------------------------------------------------------------
-- RLS: replay_playlists
-- -----------------------------------------------------------------------------
ALTER TABLE public.replay_playlists ENABLE ROW LEVEL SECURITY;

-- Public can read public playlists
DROP POLICY IF EXISTS "Public playlists are viewable by everyone" ON public.replay_playlists;
CREATE POLICY "Public playlists are viewable by everyone" 
  ON public.replay_playlists FOR SELECT 
  USING (visibility = 'public');

-- Owners can read all their own playlists (including private/unlisted)
DROP POLICY IF EXISTS "Users can view own playlists" ON public.replay_playlists;
CREATE POLICY "Users can view own playlists" 
  ON public.replay_playlists FOR SELECT 
  USING (auth.uid() = profile_id);

-- Owners can insert their own playlists
DROP POLICY IF EXISTS "Users can insert own playlists" ON public.replay_playlists;
CREATE POLICY "Users can insert own playlists" 
  ON public.replay_playlists FOR INSERT 
  WITH CHECK (auth.uid() = profile_id);

-- Owners can update their own playlists
DROP POLICY IF EXISTS "Users can update own playlists" ON public.replay_playlists;
CREATE POLICY "Users can update own playlists" 
  ON public.replay_playlists FOR UPDATE 
  USING (auth.uid() = profile_id) 
  WITH CHECK (auth.uid() = profile_id);

-- Owners can delete their own playlists
DROP POLICY IF EXISTS "Users can delete own playlists" ON public.replay_playlists;
CREATE POLICY "Users can delete own playlists" 
  ON public.replay_playlists FOR DELETE 
  USING (auth.uid() = profile_id);

-- -----------------------------------------------------------------------------
-- RLS: replay_playlist_items
-- -----------------------------------------------------------------------------
ALTER TABLE public.replay_playlist_items ENABLE ROW LEVEL SECURITY;

-- Public can read items from public playlists
DROP POLICY IF EXISTS "Public playlist items are viewable" ON public.replay_playlist_items;
CREATE POLICY "Public playlist items are viewable" 
  ON public.replay_playlist_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.replay_playlists p 
      WHERE p.id = playlist_id AND p.visibility = 'public'
    )
  );

-- Owners can read items from their own playlists
DROP POLICY IF EXISTS "Users can view own playlist items" ON public.replay_playlist_items;
CREATE POLICY "Users can view own playlist items" 
  ON public.replay_playlist_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.replay_playlists p 
      WHERE p.id = playlist_id AND p.profile_id = auth.uid()
    )
  );

-- Owners can insert items into their own playlists
DROP POLICY IF EXISTS "Users can insert own playlist items" ON public.replay_playlist_items;
CREATE POLICY "Users can insert own playlist items" 
  ON public.replay_playlist_items FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.replay_playlists p 
      WHERE p.id = playlist_id AND p.profile_id = auth.uid()
    )
  );

-- Owners can update items in their own playlists
DROP POLICY IF EXISTS "Users can update own playlist items" ON public.replay_playlist_items;
CREATE POLICY "Users can update own playlist items" 
  ON public.replay_playlist_items FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.replay_playlists p 
      WHERE p.id = playlist_id AND p.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.replay_playlists p 
      WHERE p.id = playlist_id AND p.profile_id = auth.uid()
    )
  );

-- Owners can delete items from their own playlists
DROP POLICY IF EXISTS "Users can delete own playlist items" ON public.replay_playlist_items;
CREATE POLICY "Users can delete own playlist items" 
  ON public.replay_playlist_items FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.replay_playlists p 
      WHERE p.id = playlist_id AND p.profile_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- TRIGGER: updated_at for replay_playlists
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_replay_playlists_set_updated_at ON public.replay_playlists;
CREATE TRIGGER trg_replay_playlists_set_updated_at
BEFORE UPDATE ON public.replay_playlists
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RPC: get_user_playlists - Get all playlists for a profile
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_user_playlists(uuid);
CREATE OR REPLACE FUNCTION public.get_user_playlists(
  p_profile_id uuid
)
RETURNS TABLE (
  id uuid,
  profile_id uuid,
  title text,
  description text,
  visibility playlist_visibility,
  category playlist_category,
  subcategory text,
  thumbnail_url text,
  created_at timestamptz,
  updated_at timestamptz,
  item_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.profile_id,
    p.title,
    p.description,
    p.visibility,
    p.category,
    p.subcategory,
    p.thumbnail_url,
    p.created_at,
    p.updated_at,
    COALESCE(
      (SELECT COUNT(*) FROM public.replay_playlist_items i WHERE i.playlist_id = p.id),
      0
    ) as item_count
  FROM public.replay_playlists p
  WHERE p.profile_id = p_profile_id
    AND (
      p.visibility = 'public' 
      OR p.profile_id = auth.uid()
    )
  ORDER BY p.updated_at DESC;
$$;

-- -----------------------------------------------------------------------------
-- RPC: get_playlist_with_items - Get a playlist with all its items
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_playlist_with_items(uuid);
CREATE OR REPLACE FUNCTION public.get_playlist_with_items(
  p_playlist_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_playlist jsonb;
  v_items jsonb;
  v_owner_id uuid;
  v_visibility playlist_visibility;
BEGIN
  -- Get playlist info
  SELECT profile_id, visibility INTO v_owner_id, v_visibility
  FROM public.replay_playlists
  WHERE id = p_playlist_id;
  
  IF v_owner_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check access
  IF v_visibility != 'public' AND v_owner_id != auth.uid() THEN
    RETURN NULL;
  END IF;
  
  -- Build playlist object
  SELECT jsonb_build_object(
    'id', p.id,
    'profile_id', p.profile_id,
    'title', p.title,
    'description', p.description,
    'visibility', p.visibility,
    'category', p.category,
    'subcategory', p.subcategory,
    'thumbnail_url', p.thumbnail_url,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  ) INTO v_playlist
  FROM public.replay_playlists p
  WHERE p.id = p_playlist_id;
  
  -- Build items array
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'youtube_url', i.youtube_url,
      'youtube_video_id', i.youtube_video_id,
      'title', i.title,
      'author', i.author,
      'thumbnail_url', COALESCE(i.thumbnail_url, 'https://img.youtube.com/vi/' || i.youtube_video_id || '/hqdefault.jpg'),
      'duration_seconds', i.duration_seconds,
      'position', i.position,
      'created_at', i.created_at
    ) ORDER BY i.position
  ), '[]'::jsonb) INTO v_items
  FROM public.replay_playlist_items i
  WHERE i.playlist_id = p_playlist_id;
  
  RETURN v_playlist || jsonb_build_object('items', v_items);
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: create_playlist - Create a new playlist
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_playlist(text, text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.create_playlist(
  p_title text,
  p_description text DEFAULT NULL,
  p_visibility text DEFAULT 'public',
  p_category text DEFAULT 'mixed',
  p_subcategory text DEFAULT NULL,
  p_thumbnail_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_playlist_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  IF NULLIF(TRIM(p_title), '') IS NULL THEN
    RAISE EXCEPTION 'title is required';
  END IF;
  
  INSERT INTO public.replay_playlists (
    profile_id,
    title,
    description,
    visibility,
    category,
    subcategory,
    thumbnail_url
  ) VALUES (
    v_uid,
    TRIM(p_title),
    NULLIF(TRIM(COALESCE(p_description, '')), ''),
    p_visibility::playlist_visibility,
    p_category::playlist_category,
    NULLIF(TRIM(COALESCE(p_subcategory, '')), ''),
    NULLIF(TRIM(COALESCE(p_thumbnail_url, '')), '')
  )
  RETURNING id INTO v_playlist_id;
  
  RETURN v_playlist_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: update_playlist - Update playlist metadata
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.update_playlist(uuid, text, text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.update_playlist(
  p_playlist_id uuid,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_visibility text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_subcategory text DEFAULT NULL,
  p_thumbnail_url text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_updated int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  UPDATE public.replay_playlists
  SET
    title = COALESCE(NULLIF(TRIM(p_title), ''), title),
    description = CASE WHEN p_description IS NOT NULL THEN NULLIF(TRIM(p_description), '') ELSE description END,
    visibility = CASE WHEN p_visibility IS NOT NULL THEN p_visibility::playlist_visibility ELSE visibility END,
    category = CASE WHEN p_category IS NOT NULL THEN p_category::playlist_category ELSE category END,
    subcategory = CASE WHEN p_subcategory IS NOT NULL THEN NULLIF(TRIM(p_subcategory), '') ELSE subcategory END,
    thumbnail_url = CASE WHEN p_thumbnail_url IS NOT NULL THEN NULLIF(TRIM(p_thumbnail_url), '') ELSE thumbnail_url END
  WHERE id = p_playlist_id
    AND profile_id = v_uid;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: delete_playlist - Delete a playlist and all its items
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.delete_playlist(uuid);
CREATE OR REPLACE FUNCTION public.delete_playlist(
  p_playlist_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_deleted int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  DELETE FROM public.replay_playlists
  WHERE id = p_playlist_id
    AND profile_id = v_uid;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: add_playlist_item - Add a YouTube video to a playlist
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.add_playlist_item(uuid, text, text, text, text, int);
CREATE OR REPLACE FUNCTION public.add_playlist_item(
  p_playlist_id uuid,
  p_youtube_url text,
  p_title text DEFAULT NULL,
  p_author text DEFAULT NULL,
  p_thumbnail_url text DEFAULT NULL,
  p_duration_seconds int DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_owner_id uuid;
  v_youtube_video_id text;
  v_next_position int;
  v_item_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  -- Check ownership
  SELECT profile_id INTO v_owner_id
  FROM public.replay_playlists
  WHERE id = p_playlist_id;
  
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'playlist not found';
  END IF;
  
  IF v_owner_id != v_uid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  
  -- Extract YouTube video ID
  v_youtube_video_id := (
    SELECT COALESCE(
      -- youtu.be/{id}
      (regexp_match(p_youtube_url, 'youtu\.be/([A-Za-z0-9_-]{11})'))[1],
      -- youtube.com/watch?v={id}
      (regexp_match(p_youtube_url, '[?&]v=([A-Za-z0-9_-]{11})'))[1],
      -- youtube.com/embed/{id} or youtube.com/shorts/{id}
      (regexp_match(p_youtube_url, 'youtube\.com/(?:embed|shorts)/([A-Za-z0-9_-]{11})'))[1],
      -- Raw 11-char ID
      CASE WHEN p_youtube_url ~ '^[A-Za-z0-9_-]{11}$' THEN p_youtube_url ELSE NULL END
    )
  );
  
  IF v_youtube_video_id IS NULL THEN
    RAISE EXCEPTION 'invalid YouTube URL';
  END IF;
  
  -- Check for duplicate youtube_video_id in this playlist
  IF EXISTS (
    SELECT 1 FROM public.replay_playlist_items
    WHERE playlist_id = p_playlist_id
      AND youtube_video_id = v_youtube_video_id
  ) THEN
    RAISE EXCEPTION 'video already exists in playlist';
  END IF;
  
  -- Get next position
  SELECT COALESCE(MAX(position) + 1, 0) INTO v_next_position
  FROM public.replay_playlist_items
  WHERE playlist_id = p_playlist_id;
  
  -- Insert item
  INSERT INTO public.replay_playlist_items (
    playlist_id,
    youtube_url,
    youtube_video_id,
    title,
    author,
    thumbnail_url,
    duration_seconds,
    position
  ) VALUES (
    p_playlist_id,
    TRIM(p_youtube_url),
    v_youtube_video_id,
    NULLIF(TRIM(COALESCE(p_title, '')), ''),
    NULLIF(TRIM(COALESCE(p_author, '')), ''),
    NULLIF(TRIM(COALESCE(p_thumbnail_url, '')), ''),
    p_duration_seconds,
    v_next_position
  )
  RETURNING id INTO v_item_id;
  
  RETURN v_item_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: remove_playlist_item - Remove an item from a playlist
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.remove_playlist_item(uuid);
CREATE OR REPLACE FUNCTION public.remove_playlist_item(
  p_item_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_playlist_id uuid;
  v_owner_id uuid;
  v_deleted int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  -- Get playlist ID and check ownership
  SELECT i.playlist_id, p.profile_id INTO v_playlist_id, v_owner_id
  FROM public.replay_playlist_items i
  JOIN public.replay_playlists p ON p.id = i.playlist_id
  WHERE i.id = p_item_id;
  
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'item not found';
  END IF;
  
  IF v_owner_id != v_uid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  
  DELETE FROM public.replay_playlist_items
  WHERE id = p_item_id;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: reorder_playlist_items - Reorder items in a playlist
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.reorder_playlist_items(uuid, uuid[]);
CREATE OR REPLACE FUNCTION public.reorder_playlist_items(
  p_playlist_id uuid,
  p_ordered_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_owner_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  -- Check ownership
  SELECT profile_id INTO v_owner_id
  FROM public.replay_playlists
  WHERE id = p_playlist_id;
  
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'playlist not found';
  END IF;
  
  IF v_owner_id != v_uid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  
  -- Update positions
  WITH input AS (
    SELECT x.id, (x.ord - 1) as new_position
    FROM unnest(p_ordered_ids) WITH ORDINALITY AS x(id, ord)
  )
  UPDATE public.replay_playlist_items t
  SET position = input.new_position
  FROM input
  WHERE t.id = input.id
    AND t.playlist_id = p_playlist_id;
  
  RETURN TRUE;
END;
$$;

-- -----------------------------------------------------------------------------
-- GRANTS
-- -----------------------------------------------------------------------------
GRANT SELECT ON TABLE public.replay_playlists TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.replay_playlists TO authenticated;

GRANT SELECT ON TABLE public.replay_playlist_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.replay_playlist_items TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_playlists(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_playlist_with_items(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_playlist(text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_playlist(uuid, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_playlist(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_playlist_item(uuid, text, text, text, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_playlist_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_playlist_items(uuid, uuid[]) TO authenticated;

COMMIT;
