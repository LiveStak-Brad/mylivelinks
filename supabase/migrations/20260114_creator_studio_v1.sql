BEGIN;

-- -----------------------------------------------------------------------------
-- Creator Studio v1: Items, Series, and Series Items
-- -----------------------------------------------------------------------------
-- This migration creates the core tables for Creator Studio, which is the
-- YouTube Studio-style content management interface for creators.
-- 
-- Key features:
-- - creator_studio_items: All uploads (music videos, movies, podcasts, etc.)
-- - creator_studio_series: Container for episodic content
-- - creator_studio_series_items: Episode mapping to series
-- - Rights attestation tracking (mandatory before upload)
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- Enum: creator_studio_item_type
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'creator_studio_item_type') THEN
    CREATE TYPE creator_studio_item_type AS ENUM (
      'music',
      'music_video',
      'movie',
      'podcast',
      'series_episode',
      'education',
      'vlog',
      'comedy_special',
      'other'
    );
  END IF;
END;
$$;

-- Add 'music' to existing enum if it exists but doesn't have it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'creator_studio_item_type') THEN
    BEGIN
      ALTER TYPE creator_studio_item_type ADD VALUE IF NOT EXISTS 'music' BEFORE 'music_video';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- Enum: creator_studio_visibility
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'creator_studio_visibility') THEN
    CREATE TYPE creator_studio_visibility AS ENUM (
      'public',
      'unlisted',
      'private',
      'scheduled'
    );
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- Enum: creator_studio_status
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'creator_studio_status') THEN
    CREATE TYPE creator_studio_status AS ENUM (
      'draft',
      'uploading',
      'processing',
      'ready',
      'failed',
      'removed'
    );
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- Table: public.creator_studio_items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_studio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Content metadata
  title text NOT NULL,
  description text,
  item_type creator_studio_item_type NOT NULL DEFAULT 'other',
  
  -- Media
  media_url text,
  thumb_url text,
  artwork_url text,
  storage_path text,
  duration_seconds int,
  
  -- Status and visibility
  status creator_studio_status NOT NULL DEFAULT 'draft',
  visibility creator_studio_visibility NOT NULL DEFAULT 'private',
  
  -- Rights attestation (MANDATORY)
  rights_attested boolean NOT NULL DEFAULT false,
  rights_attested_at timestamptz,
  
  -- Series/Podcast linking (nullable)
  series_id uuid,
  podcast_id uuid,
  
  -- Publishing
  published_at timestamptz,
  scheduled_publish_at timestamptz,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns if table already exists
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS owner_profile_id uuid;
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS item_type creator_studio_item_type;
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS thumb_url text;
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS duration_seconds int;
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS status creator_studio_status;
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS visibility creator_studio_visibility;
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS rights_attested boolean NOT NULL DEFAULT false;
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS rights_attested_at timestamptz;
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS artwork_url text;
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS series_id uuid;
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS podcast_id uuid;
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz;
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.creator_studio_items
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_studio_items_owner_created
  ON public.creator_studio_items (owner_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creator_studio_items_owner_status
  ON public.creator_studio_items (owner_profile_id, status);

CREATE INDEX IF NOT EXISTS idx_creator_studio_items_visibility_status
  ON public.creator_studio_items (visibility, status);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_creator_studio_items_set_updated_at ON public.creator_studio_items;
CREATE TRIGGER trg_creator_studio_items_set_updated_at
BEFORE UPDATE ON public.creator_studio_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.creator_studio_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Creator studio items are readable by owner" ON public.creator_studio_items;
CREATE POLICY "Creator studio items are readable by owner"
  ON public.creator_studio_items
  FOR SELECT
  USING (auth.uid() = owner_profile_id);

DROP POLICY IF EXISTS "Public ready items are publicly readable" ON public.creator_studio_items;
CREATE POLICY "Public ready items are publicly readable"
  ON public.creator_studio_items
  FOR SELECT
  USING (visibility = 'public' AND status = 'ready');

DROP POLICY IF EXISTS "Creator studio items are insertable by owner" ON public.creator_studio_items;
CREATE POLICY "Creator studio items are insertable by owner"
  ON public.creator_studio_items
  FOR INSERT
  WITH CHECK (auth.uid() = owner_profile_id);

DROP POLICY IF EXISTS "Creator studio items are updatable by owner" ON public.creator_studio_items;
CREATE POLICY "Creator studio items are updatable by owner"
  ON public.creator_studio_items
  FOR UPDATE
  USING (auth.uid() = owner_profile_id)
  WITH CHECK (auth.uid() = owner_profile_id);

DROP POLICY IF EXISTS "Creator studio items are deletable by owner" ON public.creator_studio_items;
CREATE POLICY "Creator studio items are deletable by owner"
  ON public.creator_studio_items
  FOR DELETE
  USING (auth.uid() = owner_profile_id);

GRANT SELECT ON TABLE public.creator_studio_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.creator_studio_items TO authenticated;

-- -----------------------------------------------------------------------------
-- Table: public.creator_studio_podcasts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_studio_podcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  title text NOT NULL,
  description text,
  artwork_url text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns if table already exists
ALTER TABLE public.creator_studio_podcasts
  ADD COLUMN IF NOT EXISTS owner_profile_id uuid;
ALTER TABLE public.creator_studio_podcasts
  ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.creator_studio_podcasts
  ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.creator_studio_podcasts
  ADD COLUMN IF NOT EXISTS artwork_url text;
ALTER TABLE public.creator_studio_podcasts
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.creator_studio_podcasts
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_studio_podcasts_owner_created
  ON public.creator_studio_podcasts (owner_profile_id, created_at DESC);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_creator_studio_podcasts_set_updated_at ON public.creator_studio_podcasts;
CREATE TRIGGER trg_creator_studio_podcasts_set_updated_at
BEFORE UPDATE ON public.creator_studio_podcasts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.creator_studio_podcasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Creator studio podcasts are readable by owner" ON public.creator_studio_podcasts;
CREATE POLICY "Creator studio podcasts are readable by owner"
  ON public.creator_studio_podcasts
  FOR SELECT
  USING (auth.uid() = owner_profile_id);

DROP POLICY IF EXISTS "Creator studio podcasts are insertable by owner" ON public.creator_studio_podcasts;
CREATE POLICY "Creator studio podcasts are insertable by owner"
  ON public.creator_studio_podcasts
  FOR INSERT
  WITH CHECK (auth.uid() = owner_profile_id);

DROP POLICY IF EXISTS "Creator studio podcasts are updatable by owner" ON public.creator_studio_podcasts;
CREATE POLICY "Creator studio podcasts are updatable by owner"
  ON public.creator_studio_podcasts
  FOR UPDATE
  USING (auth.uid() = owner_profile_id)
  WITH CHECK (auth.uid() = owner_profile_id);

DROP POLICY IF EXISTS "Creator studio podcasts are deletable by owner" ON public.creator_studio_podcasts;
CREATE POLICY "Creator studio podcasts are deletable by owner"
  ON public.creator_studio_podcasts
  FOR DELETE
  USING (auth.uid() = owner_profile_id);

GRANT SELECT ON TABLE public.creator_studio_podcasts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.creator_studio_podcasts TO authenticated;

-- -----------------------------------------------------------------------------
-- Table: public.creator_studio_series
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_studio_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  title text NOT NULL,
  description text,
  artwork_url text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns if table already exists
ALTER TABLE public.creator_studio_series
  ADD COLUMN IF NOT EXISTS owner_profile_id uuid;
ALTER TABLE public.creator_studio_series
  ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.creator_studio_series
  ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.creator_studio_series
  ADD COLUMN IF NOT EXISTS artwork_url text;
ALTER TABLE public.creator_studio_series
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.creator_studio_series
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_studio_series_owner_created
  ON public.creator_studio_series (owner_profile_id, created_at DESC);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_creator_studio_series_set_updated_at ON public.creator_studio_series;
CREATE TRIGGER trg_creator_studio_series_set_updated_at
BEFORE UPDATE ON public.creator_studio_series
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.creator_studio_series ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Creator studio series are readable by owner" ON public.creator_studio_series;
CREATE POLICY "Creator studio series are readable by owner"
  ON public.creator_studio_series
  FOR SELECT
  USING (auth.uid() = owner_profile_id);

DROP POLICY IF EXISTS "Creator studio series are insertable by owner" ON public.creator_studio_series;
CREATE POLICY "Creator studio series are insertable by owner"
  ON public.creator_studio_series
  FOR INSERT
  WITH CHECK (auth.uid() = owner_profile_id);

DROP POLICY IF EXISTS "Creator studio series are updatable by owner" ON public.creator_studio_series;
CREATE POLICY "Creator studio series are updatable by owner"
  ON public.creator_studio_series
  FOR UPDATE
  USING (auth.uid() = owner_profile_id)
  WITH CHECK (auth.uid() = owner_profile_id);

DROP POLICY IF EXISTS "Creator studio series are deletable by owner" ON public.creator_studio_series;
CREATE POLICY "Creator studio series are deletable by owner"
  ON public.creator_studio_series
  FOR DELETE
  USING (auth.uid() = owner_profile_id);

GRANT SELECT ON TABLE public.creator_studio_series TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.creator_studio_series TO authenticated;

-- -----------------------------------------------------------------------------
-- Table: public.creator_studio_series_items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_studio_series_items (
  series_id uuid NOT NULL REFERENCES public.creator_studio_series(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.creator_studio_items(id) ON DELETE CASCADE,
  
  episode_number int NOT NULL,
  season_number int,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  
  PRIMARY KEY (series_id, item_id)
);

-- Add columns if table already exists
ALTER TABLE public.creator_studio_series_items
  ADD COLUMN IF NOT EXISTS series_id uuid;
ALTER TABLE public.creator_studio_series_items
  ADD COLUMN IF NOT EXISTS item_id uuid;
ALTER TABLE public.creator_studio_series_items
  ADD COLUMN IF NOT EXISTS episode_number int;
ALTER TABLE public.creator_studio_series_items
  ADD COLUMN IF NOT EXISTS season_number int;
ALTER TABLE public.creator_studio_series_items
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_studio_series_items_series
  ON public.creator_studio_series_items (series_id, season_number, episode_number);

-- Enable RLS
ALTER TABLE public.creator_studio_series_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies (inherit from series ownership)
DROP POLICY IF EXISTS "Series items are readable by series owner" ON public.creator_studio_series_items;
CREATE POLICY "Series items are readable by series owner"
  ON public.creator_studio_series_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_studio_series s
      WHERE s.id = creator_studio_series_items.series_id
        AND s.owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Series items are insertable by series owner" ON public.creator_studio_series_items;
CREATE POLICY "Series items are insertable by series owner"
  ON public.creator_studio_series_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creator_studio_series s
      WHERE s.id = creator_studio_series_items.series_id
        AND s.owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Series items are deletable by series owner" ON public.creator_studio_series_items;
CREATE POLICY "Series items are deletable by series owner"
  ON public.creator_studio_series_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.creator_studio_series s
      WHERE s.id = creator_studio_series_items.series_id
        AND s.owner_profile_id = auth.uid()
    )
  );

GRANT SELECT ON TABLE public.creator_studio_series_items TO anon, authenticated;
GRANT INSERT, DELETE ON TABLE public.creator_studio_series_items TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC: create_creator_studio_item
-- Creates a new item with rights attestation check
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_creator_studio_item(
  p_title text,
  p_item_type text,
  p_rights_attested boolean,
  p_description text DEFAULT NULL,
  p_visibility text DEFAULT 'private'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Rights attestation is MANDATORY
  IF NOT p_rights_attested THEN
    RAISE EXCEPTION 'Rights attestation is required before creating content';
  END IF;
  
  INSERT INTO public.creator_studio_items (
    owner_profile_id,
    title,
    description,
    item_type,
    visibility,
    status,
    rights_attested,
    rights_attested_at
  ) VALUES (
    v_user_id,
    p_title,
    p_description,
    p_item_type::creator_studio_item_type,
    p_visibility::creator_studio_visibility,
    'draft',
    true,
    now()
  )
  RETURNING id INTO v_item_id;
  
  RETURN v_item_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_creator_studio_item(text, text, boolean, text, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC: list_creator_studio_items
-- Lists all items for the current user
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_creator_studio_items(
  p_status text DEFAULT NULL,
  p_item_type text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  item_type creator_studio_item_type,
  media_url text,
  thumb_url text,
  duration_seconds int,
  status creator_studio_status,
  visibility creator_studio_visibility,
  rights_attested boolean,
  published_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  RETURN QUERY
  SELECT
    i.id,
    i.title,
    i.description,
    i.item_type,
    i.media_url,
    i.thumb_url,
    i.duration_seconds,
    i.status,
    i.visibility,
    i.rights_attested,
    i.published_at,
    i.created_at,
    i.updated_at
  FROM public.creator_studio_items i
  WHERE i.owner_profile_id = v_user_id
    AND (p_status IS NULL OR i.status = p_status::creator_studio_status)
    AND (p_item_type IS NULL OR i.item_type = p_item_type::creator_studio_item_type)
  ORDER BY i.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_creator_studio_items(text, text, int, int) TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC: get_creator_studio_item
-- Gets a single item by ID (owner only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_creator_studio_item(p_item_id uuid)
RETURNS TABLE (
  id uuid,
  owner_profile_id uuid,
  title text,
  description text,
  item_type creator_studio_item_type,
  media_url text,
  thumb_url text,
  storage_path text,
  duration_seconds int,
  status creator_studio_status,
  visibility creator_studio_visibility,
  rights_attested boolean,
  rights_attested_at timestamptz,
  published_at timestamptz,
  scheduled_publish_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  RETURN QUERY
  SELECT
    i.id,
    i.owner_profile_id,
    i.title,
    i.description,
    i.item_type,
    i.media_url,
    i.thumb_url,
    i.storage_path,
    i.duration_seconds,
    i.status,
    i.visibility,
    i.rights_attested,
    i.rights_attested_at,
    i.published_at,
    i.scheduled_publish_at,
    i.created_at,
    i.updated_at
  FROM public.creator_studio_items i
  WHERE i.id = p_item_id
    AND i.owner_profile_id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_creator_studio_item(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC: update_creator_studio_item
-- Updates an item (owner only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_creator_studio_item(
  p_item_id uuid,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_visibility text DEFAULT NULL,
  p_media_url text DEFAULT NULL,
  p_thumb_url text DEFAULT NULL,
  p_duration_seconds int DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_updated boolean := false;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  UPDATE public.creator_studio_items
  SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    visibility = COALESCE(p_visibility::creator_studio_visibility, visibility),
    media_url = COALESCE(p_media_url, media_url),
    thumb_url = COALESCE(p_thumb_url, thumb_url),
    duration_seconds = COALESCE(p_duration_seconds, duration_seconds),
    updated_at = now()
  WHERE id = p_item_id
    AND owner_profile_id = v_user_id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  RETURN v_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_creator_studio_item(uuid, text, text, text, text, text, int) TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC: delete_creator_studio_item
-- Soft-deletes an item by setting status to 'removed'
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_creator_studio_item(p_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_updated boolean := false;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  UPDATE public.creator_studio_items
  SET status = 'removed', updated_at = now()
  WHERE id = p_item_id
    AND owner_profile_id = v_user_id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  RETURN v_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_creator_studio_item(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC: get_creator_studio_stats
-- Gets summary stats for the creator's studio
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_creator_studio_stats()
RETURNS TABLE (
  total_items bigint,
  draft_count bigint,
  published_count bigint,
  processing_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE i.status != 'removed') AS total_items,
    COUNT(*) FILTER (WHERE i.status = 'draft') AS draft_count,
    COUNT(*) FILTER (WHERE i.status = 'ready' AND i.visibility = 'public') AS published_count,
    COUNT(*) FILTER (WHERE i.status IN ('uploading', 'processing')) AS processing_count
  FROM public.creator_studio_items i
  WHERE i.owner_profile_id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_creator_studio_stats() TO authenticated;

-- -----------------------------------------------------------------------------
-- Table: public.creator_studio_item_likes
-- Tracks likes on creator studio items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_studio_item_likes (
  item_id uuid NOT NULL REFERENCES public.creator_studio_items(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, profile_id)
);

ALTER TABLE public.creator_studio_item_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Item likes are readable by anyone" ON public.creator_studio_item_likes;
CREATE POLICY "Item likes are readable by anyone"
  ON public.creator_studio_item_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Item likes are insertable by authenticated" ON public.creator_studio_item_likes;
CREATE POLICY "Item likes are insertable by authenticated"
  ON public.creator_studio_item_likes FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Item likes are deletable by owner" ON public.creator_studio_item_likes;
CREATE POLICY "Item likes are deletable by owner"
  ON public.creator_studio_item_likes FOR DELETE
  USING (auth.uid() = profile_id);

GRANT SELECT ON TABLE public.creator_studio_item_likes TO anon, authenticated;
GRANT INSERT, DELETE ON TABLE public.creator_studio_item_likes TO authenticated;

-- -----------------------------------------------------------------------------
-- Table: public.creator_studio_item_saves
-- Tracks saves/bookmarks on creator studio items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_studio_item_saves (
  item_id uuid NOT NULL REFERENCES public.creator_studio_items(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, profile_id)
);

ALTER TABLE public.creator_studio_item_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Item saves are readable by owner" ON public.creator_studio_item_saves;
CREATE POLICY "Item saves are readable by owner"
  ON public.creator_studio_item_saves FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Item saves are insertable by authenticated" ON public.creator_studio_item_saves;
CREATE POLICY "Item saves are insertable by authenticated"
  ON public.creator_studio_item_saves FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Item saves are deletable by owner" ON public.creator_studio_item_saves;
CREATE POLICY "Item saves are deletable by owner"
  ON public.creator_studio_item_saves FOR DELETE
  USING (auth.uid() = profile_id);

GRANT SELECT, INSERT, DELETE ON TABLE public.creator_studio_item_saves TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC: like_creator_studio_item
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.like_creator_studio_item(p_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.creator_studio_item_likes (item_id, profile_id)
  VALUES (p_item_id, v_user_id)
  ON CONFLICT (item_id, profile_id) DO NOTHING;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.like_creator_studio_item(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC: unlike_creator_studio_item
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlike_creator_studio_item(p_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM public.creator_studio_item_likes
  WHERE item_id = p_item_id AND profile_id = v_user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlike_creator_studio_item(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC: save_creator_studio_item
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_creator_studio_item(p_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.creator_studio_item_saves (item_id, profile_id)
  VALUES (p_item_id, v_user_id)
  ON CONFLICT (item_id, profile_id) DO NOTHING;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_creator_studio_item(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC: unsave_creator_studio_item
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unsave_creator_studio_item(p_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM public.creator_studio_item_saves
  WHERE item_id = p_item_id AND profile_id = v_user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unsave_creator_studio_item(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC: get_public_creator_studio_items
-- Gets public items for a profile (for profile tabs)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_creator_studio_items(
  p_profile_id uuid,
  p_item_type text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  item_type creator_studio_item_type,
  media_url text,
  thumb_url text,
  artwork_url text,
  duration_seconds int,
  likes_count bigint,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.title,
    i.description,
    i.item_type,
    i.media_url,
    i.thumb_url,
    i.artwork_url,
    i.duration_seconds,
    (SELECT COUNT(*) FROM public.creator_studio_item_likes l WHERE l.item_id = i.id) AS likes_count,
    i.created_at
  FROM public.creator_studio_items i
  WHERE i.owner_profile_id = p_profile_id
    AND i.status = 'ready'
    AND i.visibility = 'public'
    AND (p_item_type IS NULL OR i.item_type = p_item_type::creator_studio_item_type)
  ORDER BY i.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_creator_studio_items(uuid, text, int, int) TO anon, authenticated;

COMMIT;
