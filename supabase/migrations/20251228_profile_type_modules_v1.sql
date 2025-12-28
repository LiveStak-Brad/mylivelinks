BEGIN;

-- -----------------------------------------------------------------------------
-- Profile Types: Canonical Modules (v1)
--
-- Storage conventions (bucket + path plan; enforced app-side for now):
--
-- Bucket: profile-media
-- - Audio tracks:            profile-media/{profile_id}/music/tracks/{track_id}/audio
-- - Track cover art:         profile-media/{profile_id}/music/tracks/{track_id}/cover
-- - Music videos (uploads):  profile-media/{profile_id}/music/videos/{video_id}/video
-- - Video thumbnails:        profile-media/{profile_id}/music/videos/{video_id}/thumbnail
-- - Comedy specials (uploads): profile-media/{profile_id}/comedy/specials/{special_id}/video
-- - Specials thumbnails:     profile-media/{profile_id}/comedy/specials/{special_id}/thumbnail
-- - VLOG reels (uploads):    profile-media/{profile_id}/vlogs/{vlog_id}/video
-- - VLOG thumbnails:         profile-media/{profile_id}/vlogs/{vlog_id}/thumbnail
--
-- Suggested size caps (app-side):
-- - Audio: 50MB
-- - Video (music/specials/vlogs): 250MB
-- - Images (cover/thumbnail): 5MB
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 0) Helpers
-- -----------------------------------------------------------------------------

-- Updated-at trigger helper (create-or-replace so it's always present)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- YouTube normalization helper.
-- Stores both youtube_id and normalized watch URL (https://www.youtube.com/watch?v={id}).
DROP FUNCTION IF EXISTS public.normalize_youtube_url(text);
CREATE OR REPLACE FUNCTION public.normalize_youtube_url(
  p_url text
)
RETURNS TABLE(youtube_id text, normalized_url text)
LANGUAGE plpgsql
AS $$
DECLARE
  v_url text;
  v_id text;
BEGIN
  v_url := trim(coalesce(p_url, ''));

  IF v_url = '' THEN
    youtube_id := NULL;
    normalized_url := NULL;
    RETURN;
  END IF;

  v_id := NULL;

  IF v_url ~* 'youtu\\.be/' THEN
    v_id := regexp_replace(v_url, '.*youtu\\.be/([^?&/]+).*', '\\1');
  ELSIF v_url ~* 'youtube\\.com/watch' THEN
    v_id := regexp_replace(v_url, '.*[?&]v=([^?&/]+).*', '\\1');
  ELSIF v_url ~* 'youtube\\.com/shorts/' THEN
    v_id := regexp_replace(v_url, '.*youtube\\.com/shorts/([^?&/]+).*', '\\1');
  ELSIF v_url ~* 'youtube\\.com/embed/' THEN
    v_id := regexp_replace(v_url, '.*youtube\\.com/embed/([^?&/]+).*', '\\1');
  END IF;

  v_id := nullif(trim(v_id), '');

  IF v_id IS NULL THEN
    youtube_id := NULL;
    normalized_url := v_url;
    RETURN;
  END IF;

  youtube_id := v_id;
  normalized_url := 'https://www.youtube.com/watch?v=' || v_id;
  RETURN;
END;
$$;

-- -----------------------------------------------------------------------------
-- 1) Profiles: profile_type + profile_opacity + set_profile_type RPC
-- -----------------------------------------------------------------------------

-- Extend existing enum (do not remove values).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'profile_type_enum'
      AND n.nspname = 'public'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = 'profile_type_enum'
        AND e.enumlabel = 'default'
    ) THEN
      ALTER TYPE public.profile_type_enum ADD VALUE 'default';
    END IF;
  END IF;
END;
$$;

-- Ensure profiles.profile_opacity exists (separate from card_opacity).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_opacity numeric NOT NULL DEFAULT 1.0;

DO $$
BEGIN
  -- Add check constraint if missing.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_profile_opacity_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_profile_opacity_check
      CHECK (profile_opacity >= 0 AND profile_opacity <= 1);
  END IF;
END;
$$;

-- Ensure default is "default" (while still allowing existing enum values).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'profile_type'
  ) THEN
    BEGIN
      ALTER TABLE public.profiles
        ALTER COLUMN profile_type SET DEFAULT 'default'::public.profile_type_enum;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
END;
$$;

-- Canonical RPC: set_profile_type(p_type text) returns profiles.profile_type
DROP FUNCTION IF EXISTS public.set_profile_type(public.profile_type_enum);
DROP FUNCTION IF EXISTS public.set_profile_type(text);
CREATE OR REPLACE FUNCTION public.set_profile_type(
  p_type text
)
RETURNS public.profile_type_enum
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_type_text text;
  v_type public.profile_type_enum;
  v_updated public.profile_type_enum;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_type_text := lower(trim(coalesce(p_type, '')));

  IF v_type_text NOT IN ('default','streamer','creator','musician','comedian','business') THEN
    RAISE EXCEPTION 'invalid profile_type: %', p_type;
  END IF;

  v_type := v_type_text::public.profile_type_enum;

  UPDATE public.profiles
  SET profile_type = v_type
  WHERE id = v_uid
  RETURNING profile_type INTO v_updated;

  IF v_updated IS NULL THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_profile_type(text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2) Business module
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_business (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_description text,
  website_url text,
  contact_email text,
  contact_phone text,
  location_or_service_area text,
  hours jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_profile_business_set_updated_at ON public.profile_business;
CREATE TRIGGER trg_profile_business_set_updated_at
BEFORE UPDATE ON public.profile_business
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profile_business ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_business'
      AND policyname='Business is viewable by everyone'
  ) THEN
    EXECUTE 'CREATE POLICY "Business is viewable by everyone" ON public.profile_business FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_business'
      AND policyname='Users can insert own business'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert own business" ON public.profile_business FOR INSERT WITH CHECK (auth.uid() = profile_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_business'
      AND policyname='Users can update own business'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own business" ON public.profile_business FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_business'
      AND policyname='Users can delete own business'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete own business" ON public.profile_business FOR DELETE USING (auth.uid() = profile_id)';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.get_business(uuid);
CREATE OR REPLACE FUNCTION public.get_business(
  p_profile_id uuid
)
RETURNS public.profile_business
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.profile_business
  WHERE profile_id = p_profile_id
  LIMIT 1;
$$;

DROP FUNCTION IF EXISTS public.upsert_business(jsonb);
CREATE OR REPLACE FUNCTION public.upsert_business(
  p_payload jsonb
)
RETURNS public.profile_business
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_row public.profile_business;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  INSERT INTO public.profile_business (
    profile_id,
    business_description,
    website_url,
    contact_email,
    contact_phone,
    location_or_service_area,
    hours
  )
  VALUES (
    v_uid,
    nullif(trim(p_payload->>'business_description'), ''),
    nullif(trim(p_payload->>'website_url'), ''),
    nullif(trim(p_payload->>'contact_email'), ''),
    nullif(trim(p_payload->>'contact_phone'), ''),
    nullif(trim(p_payload->>'location_or_service_area'), ''),
    CASE
      WHEN p_payload ? 'hours' THEN p_payload->'hours'
      ELSE NULL
    END
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET
    business_description = excluded.business_description,
    website_url = excluded.website_url,
    contact_email = excluded.contact_email,
    contact_phone = excluded.contact_phone,
    location_or_service_area = excluded.location_or_service_area,
    hours = excluded.hours,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_business(jsonb) TO authenticated;

GRANT SELECT ON TABLE public.profile_business TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.profile_business TO authenticated;

-- -----------------------------------------------------------------------------
-- 3) Musician: tracks + videos
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_music_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  artist_name text,
  audio_url text NOT NULL,
  cover_art_url text,
  sort_order int NOT NULL DEFAULT 0,
  rights_confirmed boolean NOT NULL DEFAULT false,
  rights_confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_music_tracks_rights_confirmed_check CHECK (
    (rights_confirmed = false) OR (rights_confirmed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_profile_music_tracks_profile_sort
  ON public.profile_music_tracks(profile_id, sort_order, created_at);

CREATE TABLE IF NOT EXISTS public.profile_music_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  video_type text NOT NULL,
  video_url text NOT NULL,
  youtube_id text,
  sort_order int NOT NULL DEFAULT 0,
  rights_confirmed boolean NOT NULL DEFAULT false,
  rights_confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_music_videos_video_type_check CHECK (video_type IN ('upload','youtube')),
  CONSTRAINT profile_music_videos_rights_confirmed_check CHECK (
    (rights_confirmed = false) OR (rights_confirmed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_profile_music_videos_profile_sort
  ON public.profile_music_videos(profile_id, sort_order, created_at);

ALTER TABLE public.profile_music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_music_videos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Tracks: public select
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_music_tracks'
      AND policyname='Music tracks are viewable by everyone'
  ) THEN
    EXECUTE 'CREATE POLICY "Music tracks are viewable by everyone" ON public.profile_music_tracks FOR SELECT USING (true)';
  END IF;

  -- Tracks: owner write
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_music_tracks'
      AND policyname='Users can insert own music tracks'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert own music tracks" ON public.profile_music_tracks FOR INSERT WITH CHECK (auth.uid() = profile_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_music_tracks'
      AND policyname='Users can update own music tracks'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own music tracks" ON public.profile_music_tracks FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_music_tracks'
      AND policyname='Users can delete own music tracks'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete own music tracks" ON public.profile_music_tracks FOR DELETE USING (auth.uid() = profile_id)';
  END IF;

  -- Videos: public select
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_music_videos'
      AND policyname='Music videos are viewable by everyone'
  ) THEN
    EXECUTE 'CREATE POLICY "Music videos are viewable by everyone" ON public.profile_music_videos FOR SELECT USING (true)';
  END IF;

  -- Videos: owner write
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_music_videos'
      AND policyname='Users can insert own music videos'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert own music videos" ON public.profile_music_videos FOR INSERT WITH CHECK (auth.uid() = profile_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_music_videos'
      AND policyname='Users can update own music videos'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own music videos" ON public.profile_music_videos FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_music_videos'
      AND policyname='Users can delete own music videos'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete own music videos" ON public.profile_music_videos FOR DELETE USING (auth.uid() = profile_id)';
  END IF;
END;
$$;

-- Tracks RPCs
DROP FUNCTION IF EXISTS public.get_music_tracks(uuid);
CREATE OR REPLACE FUNCTION public.get_music_tracks(
  p_profile_id uuid
)
RETURNS SETOF public.profile_music_tracks
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.profile_music_tracks
  WHERE profile_id = p_profile_id
  ORDER BY sort_order, created_at;
$$;

DROP FUNCTION IF EXISTS public.upsert_music_track(uuid, jsonb);
CREATE OR REPLACE FUNCTION public.upsert_music_track(
  p_id uuid DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS public.profile_music_tracks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_row public.profile_music_tracks;
  v_title text;
  v_audio_url text;
  v_rights_confirmed boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_title := nullif(trim(p_payload->>'title'), '');
  v_audio_url := nullif(trim(p_payload->>'audio_url'), '');
  v_rights_confirmed := CASE
    WHEN p_payload ? 'rights_confirmed' THEN (p_payload->>'rights_confirmed')::boolean
    ELSE NULL
  END;

  IF p_id IS NULL THEN
    IF v_title IS NULL THEN
      RAISE EXCEPTION 'title is required';
    END IF;
    IF v_audio_url IS NULL THEN
      RAISE EXCEPTION 'audio_url is required';
    END IF;

    INSERT INTO public.profile_music_tracks (
      profile_id,
      title,
      artist_name,
      audio_url,
      cover_art_url,
      sort_order,
      rights_confirmed,
      rights_confirmed_at
    )
    VALUES (
      v_uid,
      v_title,
      nullif(trim(p_payload->>'artist_name'), ''),
      v_audio_url,
      nullif(trim(p_payload->>'cover_art_url'), ''),
      COALESCE((p_payload->>'sort_order')::int, 0),
      COALESCE(v_rights_confirmed, false),
      CASE
        WHEN COALESCE(v_rights_confirmed, false) = true THEN now()
        ELSE NULL
      END
    )
    RETURNING * INTO v_row;

    RETURN v_row;
  END IF;

  UPDATE public.profile_music_tracks
  SET
    title = COALESCE(v_title, title),
    artist_name = COALESCE(nullif(trim(p_payload->>'artist_name'), ''), artist_name),
    audio_url = COALESCE(v_audio_url, audio_url),
    cover_art_url = COALESCE(nullif(trim(p_payload->>'cover_art_url'), ''), cover_art_url),
    sort_order = COALESCE((p_payload->>'sort_order')::int, sort_order),
    rights_confirmed = COALESCE(v_rights_confirmed, rights_confirmed),
    rights_confirmed_at = CASE
      WHEN COALESCE(v_rights_confirmed, rights_confirmed) = true
        THEN COALESCE(rights_confirmed_at, now())
      ELSE NULL
    END
  WHERE id = p_id
    AND profile_id = v_uid
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'not found';
  END IF;

  RETURN v_row;
END;
$$;

DROP FUNCTION IF EXISTS public.delete_music_track(uuid);
CREATE OR REPLACE FUNCTION public.delete_music_track(
  p_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_deleted int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  DELETE FROM public.profile_music_tracks
  WHERE id = p_id
    AND profile_id = v_uid;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'not found';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.reorder_music_tracks(uuid[]);
CREATE OR REPLACE FUNCTION public.reorder_music_tracks(
  p_ordered_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_expected int;
  v_owned int;
  v_id uuid;
  v_i int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_expected := coalesce(array_length(p_ordered_ids, 1), 0);

  SELECT count(*)
  INTO v_owned
  FROM public.profile_music_tracks
  WHERE profile_id = v_uid
    AND id = ANY(p_ordered_ids);

  IF v_owned <> v_expected THEN
    RAISE EXCEPTION 'invalid reorder set';
  END IF;

  v_i := 0;
  FOREACH v_id IN ARRAY p_ordered_ids LOOP
    UPDATE public.profile_music_tracks
    SET sort_order = v_i
    WHERE id = v_id
      AND profile_id = v_uid;
    v_i := v_i + 1;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_music_tracks(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_music_track(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_music_track(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_music_tracks(uuid[]) TO authenticated;

-- Videos RPCs
DROP FUNCTION IF EXISTS public.get_music_videos(uuid);
CREATE OR REPLACE FUNCTION public.get_music_videos(
  p_profile_id uuid
)
RETURNS SETOF public.profile_music_videos
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.profile_music_videos
  WHERE profile_id = p_profile_id
  ORDER BY sort_order, created_at;
$$;

DROP FUNCTION IF EXISTS public.upsert_music_video(uuid, jsonb);
CREATE OR REPLACE FUNCTION public.upsert_music_video(
  p_id uuid DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS public.profile_music_videos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_row public.profile_music_videos;
  v_title text;
  v_video_type text;
  v_video_url text;
  v_rights_confirmed boolean;
  v_youtube_id text;
  v_normalized_url text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_title := nullif(trim(p_payload->>'title'), '');
  v_video_type := lower(trim(coalesce(p_payload->>'video_type', '')));
  v_video_url := nullif(trim(p_payload->>'video_url'), '');
  v_rights_confirmed := CASE
    WHEN p_payload ? 'rights_confirmed' THEN (p_payload->>'rights_confirmed')::boolean
    ELSE NULL
  END;

  IF p_id IS NULL THEN
    IF v_title IS NULL THEN
      RAISE EXCEPTION 'title is required';
    END IF;
    IF v_video_type NOT IN ('upload','youtube') THEN
      RAISE EXCEPTION 'invalid video_type: %', v_video_type;
    END IF;
    IF v_video_url IS NULL THEN
      RAISE EXCEPTION 'video_url is required';
    END IF;

    IF v_video_type = 'youtube' THEN
      SELECT youtube_id, normalized_url
      INTO v_youtube_id, v_normalized_url
      FROM public.normalize_youtube_url(v_video_url);

      IF v_youtube_id IS NULL THEN
        RAISE EXCEPTION 'invalid youtube url';
      END IF;

      v_video_url := v_normalized_url;
    ELSE
      v_youtube_id := NULL;
    END IF;

    INSERT INTO public.profile_music_videos (
      profile_id,
      title,
      video_type,
      video_url,
      youtube_id,
      sort_order,
      rights_confirmed,
      rights_confirmed_at
    )
    VALUES (
      v_uid,
      v_title,
      v_video_type,
      v_video_url,
      v_youtube_id,
      COALESCE((p_payload->>'sort_order')::int, 0),
      COALESCE(v_rights_confirmed, false),
      CASE
        WHEN COALESCE(v_rights_confirmed, false) = true THEN now()
        ELSE NULL
      END
    )
    RETURNING * INTO v_row;

    RETURN v_row;
  END IF;

  -- Update path (normalize YouTube if video_type + url provided)
  IF v_video_type = 'youtube' AND v_video_url IS NOT NULL THEN
    SELECT youtube_id, normalized_url
    INTO v_youtube_id, v_normalized_url
    FROM public.normalize_youtube_url(v_video_url);

    IF v_youtube_id IS NULL THEN
      RAISE EXCEPTION 'invalid youtube url';
    END IF;

    v_video_url := v_normalized_url;
  ELSIF v_video_type = 'upload' THEN
    v_youtube_id := NULL;
  END IF;

  UPDATE public.profile_music_videos
  SET
    title = COALESCE(v_title, title),
    video_type = COALESCE(NULLIF(v_video_type, ''), video_type),
    video_url = COALESCE(v_video_url, video_url),
    youtube_id = CASE
      WHEN COALESCE(NULLIF(v_video_type, ''), video_type) = 'youtube' THEN COALESCE(v_youtube_id, youtube_id)
      ELSE NULL
    END,
    sort_order = COALESCE((p_payload->>'sort_order')::int, sort_order),
    rights_confirmed = COALESCE(v_rights_confirmed, rights_confirmed),
    rights_confirmed_at = CASE
      WHEN COALESCE(v_rights_confirmed, rights_confirmed) = true
        THEN COALESCE(rights_confirmed_at, now())
      ELSE NULL
    END
  WHERE id = p_id
    AND profile_id = v_uid
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'not found';
  END IF;

  RETURN v_row;
END;
$$;

DROP FUNCTION IF EXISTS public.delete_music_video(uuid);
CREATE OR REPLACE FUNCTION public.delete_music_video(
  p_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_deleted int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  DELETE FROM public.profile_music_videos
  WHERE id = p_id
    AND profile_id = v_uid;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'not found';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.reorder_music_videos(uuid[]);
CREATE OR REPLACE FUNCTION public.reorder_music_videos(
  p_ordered_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_expected int;
  v_owned int;
  v_id uuid;
  v_i int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_expected := coalesce(array_length(p_ordered_ids, 1), 0);

  SELECT count(*)
  INTO v_owned
  FROM public.profile_music_videos
  WHERE profile_id = v_uid
    AND id = ANY(p_ordered_ids);

  IF v_owned <> v_expected THEN
    RAISE EXCEPTION 'invalid reorder set';
  END IF;

  v_i := 0;
  FOREACH v_id IN ARRAY p_ordered_ids LOOP
    UPDATE public.profile_music_videos
    SET sort_order = v_i
    WHERE id = v_id
      AND profile_id = v_uid;
    v_i := v_i + 1;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_music_videos(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_music_video(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_music_video(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_music_videos(uuid[]) TO authenticated;

GRANT SELECT ON TABLE public.profile_music_tracks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.profile_music_tracks TO authenticated;

GRANT SELECT ON TABLE public.profile_music_videos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.profile_music_videos TO authenticated;

-- -----------------------------------------------------------------------------
-- 4) Comedian: specials
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_comedy_specials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_type text NOT NULL,
  video_url text NOT NULL,
  youtube_id text,
  thumbnail_url text,
  duration_seconds int,
  sort_order int NOT NULL DEFAULT 0,
  rights_confirmed boolean NOT NULL DEFAULT false,
  rights_confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_comedy_specials_video_type_check CHECK (video_type IN ('upload','youtube')),
  CONSTRAINT profile_comedy_specials_rights_confirmed_check CHECK (
    (rights_confirmed = false) OR (rights_confirmed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_profile_comedy_specials_profile_sort
  ON public.profile_comedy_specials(profile_id, sort_order, created_at);

ALTER TABLE public.profile_comedy_specials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_comedy_specials'
      AND policyname='Comedy specials are viewable by everyone'
  ) THEN
    EXECUTE 'CREATE POLICY "Comedy specials are viewable by everyone" ON public.profile_comedy_specials FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_comedy_specials'
      AND policyname='Users can insert own comedy specials'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert own comedy specials" ON public.profile_comedy_specials FOR INSERT WITH CHECK (auth.uid() = profile_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_comedy_specials'
      AND policyname='Users can update own comedy specials'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own comedy specials" ON public.profile_comedy_specials FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_comedy_specials'
      AND policyname='Users can delete own comedy specials'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete own comedy specials" ON public.profile_comedy_specials FOR DELETE USING (auth.uid() = profile_id)';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.get_comedy_specials(uuid);
CREATE OR REPLACE FUNCTION public.get_comedy_specials(
  p_profile_id uuid
)
RETURNS SETOF public.profile_comedy_specials
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.profile_comedy_specials
  WHERE profile_id = p_profile_id
  ORDER BY sort_order, created_at;
$$;

DROP FUNCTION IF EXISTS public.upsert_comedy_special(uuid, jsonb);
CREATE OR REPLACE FUNCTION public.upsert_comedy_special(
  p_id uuid DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS public.profile_comedy_specials
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_row public.profile_comedy_specials;
  v_title text;
  v_video_type text;
  v_video_url text;
  v_rights_confirmed boolean;
  v_youtube_id text;
  v_normalized_url text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_title := nullif(trim(p_payload->>'title'), '');
  v_video_type := lower(trim(coalesce(p_payload->>'video_type', '')));
  v_video_url := nullif(trim(p_payload->>'video_url'), '');
  v_rights_confirmed := CASE
    WHEN p_payload ? 'rights_confirmed' THEN (p_payload->>'rights_confirmed')::boolean
    ELSE NULL
  END;

  IF p_id IS NULL THEN
    IF v_title IS NULL THEN
      RAISE EXCEPTION 'title is required';
    END IF;
    IF v_video_type NOT IN ('upload','youtube') THEN
      RAISE EXCEPTION 'invalid video_type: %', v_video_type;
    END IF;
    IF v_video_url IS NULL THEN
      RAISE EXCEPTION 'video_url is required';
    END IF;

    IF v_video_type = 'youtube' THEN
      SELECT youtube_id, normalized_url
      INTO v_youtube_id, v_normalized_url
      FROM public.normalize_youtube_url(v_video_url);

      IF v_youtube_id IS NULL THEN
        RAISE EXCEPTION 'invalid youtube url';
      END IF;

      v_video_url := v_normalized_url;
    ELSE
      v_youtube_id := NULL;
    END IF;

    INSERT INTO public.profile_comedy_specials (
      profile_id,
      title,
      description,
      video_type,
      video_url,
      youtube_id,
      thumbnail_url,
      duration_seconds,
      sort_order,
      rights_confirmed,
      rights_confirmed_at
    )
    VALUES (
      v_uid,
      v_title,
      nullif(trim(p_payload->>'description'), ''),
      v_video_type,
      v_video_url,
      v_youtube_id,
      nullif(trim(p_payload->>'thumbnail_url'), ''),
      NULLIF((p_payload->>'duration_seconds')::int, 0),
      COALESCE((p_payload->>'sort_order')::int, 0),
      COALESCE(v_rights_confirmed, false),
      CASE
        WHEN COALESCE(v_rights_confirmed, false) = true THEN now()
        ELSE NULL
      END
    )
    RETURNING * INTO v_row;

    RETURN v_row;
  END IF;

  IF v_video_type = 'youtube' AND v_video_url IS NOT NULL THEN
    SELECT youtube_id, normalized_url
    INTO v_youtube_id, v_normalized_url
    FROM public.normalize_youtube_url(v_video_url);

    IF v_youtube_id IS NULL THEN
      RAISE EXCEPTION 'invalid youtube url';
    END IF;

    v_video_url := v_normalized_url;
  ELSIF v_video_type = 'upload' THEN
    v_youtube_id := NULL;
  END IF;

  UPDATE public.profile_comedy_specials
  SET
    title = COALESCE(v_title, title),
    description = COALESCE(nullif(trim(p_payload->>'description'), ''), description),
    video_type = COALESCE(NULLIF(v_video_type, ''), video_type),
    video_url = COALESCE(v_video_url, video_url),
    youtube_id = CASE
      WHEN COALESCE(NULLIF(v_video_type, ''), video_type) = 'youtube' THEN COALESCE(v_youtube_id, youtube_id)
      ELSE NULL
    END,
    thumbnail_url = COALESCE(nullif(trim(p_payload->>'thumbnail_url'), ''), thumbnail_url),
    duration_seconds = COALESCE(NULLIF((p_payload->>'duration_seconds')::int, 0), duration_seconds),
    sort_order = COALESCE((p_payload->>'sort_order')::int, sort_order),
    rights_confirmed = COALESCE(v_rights_confirmed, rights_confirmed),
    rights_confirmed_at = CASE
      WHEN COALESCE(v_rights_confirmed, rights_confirmed) = true
        THEN COALESCE(rights_confirmed_at, now())
      ELSE NULL
    END
  WHERE id = p_id
    AND profile_id = v_uid
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'not found';
  END IF;

  RETURN v_row;
END;
$$;

DROP FUNCTION IF EXISTS public.delete_comedy_special(uuid);
CREATE OR REPLACE FUNCTION public.delete_comedy_special(
  p_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_deleted int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  DELETE FROM public.profile_comedy_specials
  WHERE id = p_id
    AND profile_id = v_uid;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'not found';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.reorder_comedy_specials(uuid[]);
CREATE OR REPLACE FUNCTION public.reorder_comedy_specials(
  p_ordered_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_expected int;
  v_owned int;
  v_id uuid;
  v_i int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_expected := coalesce(array_length(p_ordered_ids, 1), 0);

  SELECT count(*)
  INTO v_owned
  FROM public.profile_comedy_specials
  WHERE profile_id = v_uid
    AND id = ANY(p_ordered_ids);

  IF v_owned <> v_expected THEN
    RAISE EXCEPTION 'invalid reorder set';
  END IF;

  v_i := 0;
  FOREACH v_id IN ARRAY p_ordered_ids LOOP
    UPDATE public.profile_comedy_specials
    SET sort_order = v_i
    WHERE id = v_id
      AND profile_id = v_uid;
    v_i := v_i + 1;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_comedy_specials(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_comedy_special(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_comedy_special(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_comedy_specials(uuid[]) TO authenticated;

GRANT SELECT ON TABLE public.profile_comedy_specials TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.profile_comedy_specials TO authenticated;

-- -----------------------------------------------------------------------------
-- 5) Creator + Streamer: 60-second VLOG reels
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_vlogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  caption text,
  thumbnail_url text,
  duration_seconds int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_vlogs_duration_check CHECK (duration_seconds <= 60)
);

CREATE INDEX IF NOT EXISTS idx_profile_vlogs_profile_created_at
  ON public.profile_vlogs(profile_id, created_at DESC);

ALTER TABLE public.profile_vlogs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_vlogs'
      AND policyname='Vlogs are viewable by everyone'
  ) THEN
    EXECUTE 'CREATE POLICY "Vlogs are viewable by everyone" ON public.profile_vlogs FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_vlogs'
      AND policyname='Users can insert own vlogs'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert own vlogs" ON public.profile_vlogs FOR INSERT WITH CHECK (auth.uid() = profile_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_vlogs'
      AND policyname='Users can delete own vlogs'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete own vlogs" ON public.profile_vlogs FOR DELETE USING (auth.uid() = profile_id)';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.get_vlogs(uuid);
CREATE OR REPLACE FUNCTION public.get_vlogs(
  p_profile_id uuid
)
RETURNS SETOF public.profile_vlogs
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.profile_vlogs
  WHERE profile_id = p_profile_id
  ORDER BY created_at DESC;
$$;

DROP FUNCTION IF EXISTS public.create_vlog(jsonb);
CREATE OR REPLACE FUNCTION public.create_vlog(
  p_payload jsonb
)
RETURNS public.profile_vlogs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_row public.profile_vlogs;
  v_video_url text;
  v_duration int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_video_url := nullif(trim(p_payload->>'video_url'), '');
  IF v_video_url IS NULL THEN
    RAISE EXCEPTION 'video_url is required';
  END IF;

  v_duration := (p_payload->>'duration_seconds')::int;
  IF v_duration IS NULL THEN
    RAISE EXCEPTION 'duration_seconds is required';
  END IF;

  IF v_duration > 60 THEN
    RAISE EXCEPTION 'duration_seconds must be <= 60';
  END IF;

  INSERT INTO public.profile_vlogs (
    profile_id,
    video_url,
    caption,
    thumbnail_url,
    duration_seconds
  )
  VALUES (
    v_uid,
    v_video_url,
    nullif(trim(p_payload->>'caption'), ''),
    nullif(trim(p_payload->>'thumbnail_url'), ''),
    v_duration
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

DROP FUNCTION IF EXISTS public.delete_vlog(uuid);
CREATE OR REPLACE FUNCTION public.delete_vlog(
  p_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_deleted int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  DELETE FROM public.profile_vlogs
  WHERE id = p_id
    AND profile_id = v_uid;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_vlogs(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_vlog(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_vlog(uuid) TO authenticated;

GRANT SELECT ON TABLE public.profile_vlogs TO anon, authenticated;
GRANT INSERT, DELETE ON TABLE public.profile_vlogs TO authenticated;

-- -----------------------------------------------------------------------------
-- Contracts (minimal response shapes; PostgREST returns columns as JSON keys)
--
-- set_profile_type(text) -> "default|streamer|creator|musician|comedian|business" (scalar)
-- get_business(profile_id) ->
--   { profile_id, business_description, website_url, contact_email, contact_phone, location_or_service_area, hours, updated_at }
-- get_music_tracks(profile_id) ->
--   [{ id, profile_id, title, artist_name, audio_url, cover_art_url, sort_order, rights_confirmed, rights_confirmed_at, created_at }]
-- get_music_videos(profile_id) ->
--   [{ id, profile_id, title, video_type, video_url, youtube_id, sort_order, rights_confirmed, rights_confirmed_at, created_at }]
-- get_comedy_specials(profile_id) ->
--   [{ id, profile_id, title, description, video_type, video_url, youtube_id, thumbnail_url, duration_seconds, sort_order, rights_confirmed, rights_confirmed_at, created_at }]
-- get_vlogs(profile_id) ->
--   [{ id, profile_id, video_url, caption, thumbnail_url, duration_seconds, created_at }]
-- -----------------------------------------------------------------------------

COMMIT;
