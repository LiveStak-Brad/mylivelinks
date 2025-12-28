BEGIN;

-- -----------------------------------------------------------------------------
-- Music Videos (P0): persistence + RPCs + YouTube normalization + storage rules
-- -----------------------------------------------------------------------------
-- Bucket: profile-media
-- Video:      profile-media/{profile_id}/music/videos/{video_id}/video
-- Thumbnail:  profile-media/{profile_id}/music/videos/{video_id}/thumb
--
-- Notes:
-- - This migration is written to be safe even if an earlier "profile modules v1"
--   migration already created `public.profile_music_videos`.
-- - RPC names in this migration are the *canonical* ones requested for P0.
-- -----------------------------------------------------------------------------

-- Ensure helper exists (idempotent).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- YouTube normalization (extract strict 11-char ID)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.extract_youtube_video_id(text);
CREATE OR REPLACE FUNCTION public.extract_youtube_video_id(p_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text;
  m text[];
BEGIN
  v := trim(coalesce(p_input, ''));
  IF v = '' THEN
    RETURN NULL;
  END IF;

  -- Accept raw ID.
  IF v ~ '^[A-Za-z0-9_-]{11}$' THEN
    RETURN v;
  END IF;

  -- youtu.be/{id}
  SELECT regexp_match(v, 'youtu\.be/([A-Za-z0-9_-]{11})') INTO m;
  IF m IS NOT NULL THEN
    RETURN m[1];
  END IF;

  -- youtube.com/watch?v={id}
  SELECT regexp_match(v, '[?&]v=([A-Za-z0-9_-]{11})') INTO m;
  IF m IS NOT NULL THEN
    RETURN m[1];
  END IF;

  -- youtube.com/embed/{id} or youtube.com/shorts/{id}
  SELECT regexp_match(v, 'youtube\.com/(?:embed|shorts)/([A-Za-z0-9_-]{11})') INTO m;
  IF m IS NOT NULL THEN
    RETURN m[1];
  END IF;

  RETURN NULL;
END;
$$;

-- -----------------------------------------------------------------------------
-- Table: public.profile_music_videos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_music_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  video_type text NOT NULL,
  video_url text NOT NULL,
  youtube_id text,
  thumbnail_url text,
  rights_confirmed boolean NOT NULL DEFAULT false,
  rights_confirmed_at timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_music_videos_video_type_check CHECK (video_type IN ('upload','youtube')),
  CONSTRAINT profile_music_videos_rights_confirmed_check CHECK (
    (rights_confirmed = false) OR (rights_confirmed_at IS NOT NULL)
  )
);

-- If table existed already (older schema), ensure required columns exist.
ALTER TABLE public.profile_music_videos
  ADD COLUMN IF NOT EXISTS youtube_id text;
ALTER TABLE public.profile_music_videos
  ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.profile_music_videos
  ADD COLUMN IF NOT EXISTS rights_confirmed boolean NOT NULL DEFAULT false;
ALTER TABLE public.profile_music_videos
  ADD COLUMN IF NOT EXISTS rights_confirmed_at timestamptz;
ALTER TABLE public.profile_music_videos
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
ALTER TABLE public.profile_music_videos
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.profile_music_videos
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Required indexes
CREATE INDEX IF NOT EXISTS idx_profile_music_videos_profile_sort_order
  ON public.profile_music_videos(profile_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_profile_music_videos_profile_video_type
  ON public.profile_music_videos(profile_id, video_type);

-- Enable RLS
ALTER TABLE public.profile_music_videos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Public read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_music_videos'
      AND policyname='Profile music videos are viewable by everyone'
  ) THEN
    EXECUTE 'CREATE POLICY "Profile music videos are viewable by everyone" ON public.profile_music_videos FOR SELECT USING (true)';
  END IF;

  -- Owner write
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_music_videos'
      AND policyname='Users can insert own profile music videos'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert own profile music videos" ON public.profile_music_videos FOR INSERT WITH CHECK (auth.uid() = profile_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_music_videos'
      AND policyname='Users can update own profile music videos'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own profile music videos" ON public.profile_music_videos FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_music_videos'
      AND policyname='Users can delete own profile music videos'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete own profile music videos" ON public.profile_music_videos FOR DELETE USING (auth.uid() = profile_id)';
  END IF;
END;
$$;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_profile_music_videos_set_updated_at ON public.profile_music_videos;
CREATE TRIGGER trg_profile_music_videos_set_updated_at
BEFORE UPDATE ON public.profile_music_videos
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RPCs (canonical names)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_profile_music_videos(uuid);
CREATE OR REPLACE FUNCTION public.get_profile_music_videos(p_profile_id uuid)
RETURNS SETOF public.profile_music_videos
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.profile_music_videos
  WHERE profile_id = p_profile_id
  ORDER BY sort_order, created_at;
$$;

DROP FUNCTION IF EXISTS public.upsert_profile_music_video(jsonb);
CREATE OR REPLACE FUNCTION public.upsert_profile_music_video(p_video jsonb)
RETURNS public.profile_music_videos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_id uuid;
  v_title text;
  v_video_type text;
  v_video_url text;
  v_youtube_id text;
  v_thumbnail_url text;
  v_rights_confirmed boolean;
  v_sort_order int;
  v_existing public.profile_music_videos;
  v_row public.profile_music_videos;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_id := NULLIF(trim(coalesce(p_video->>'id','')), '')::uuid;
  v_title := nullif(trim(p_video->>'title'), '');
  v_video_type := lower(trim(coalesce(p_video->>'video_type','')));
  v_video_url := nullif(trim(p_video->>'video_url'), '');
  v_thumbnail_url := nullif(trim(p_video->>'thumbnail_url'), '');
  v_rights_confirmed := COALESCE((p_video->>'rights_confirmed')::boolean, false);

  IF v_rights_confirmed IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'rights_confirmed is required';
  END IF;

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
    v_youtube_id := public.extract_youtube_video_id(v_video_url);
    IF v_youtube_id IS NULL THEN
      RAISE EXCEPTION 'invalid youtube url';
    END IF;
    -- Canonicalize URL for consistency.
    v_video_url := 'https://www.youtube.com/watch?v=' || v_youtube_id;
    IF v_thumbnail_url IS NULL THEN
      v_thumbnail_url := 'https://img.youtube.com/vi/' || v_youtube_id || '/hqdefault.jpg';
    END IF;
  ELSE
    v_youtube_id := NULL;
  END IF;

  -- Insert vs update
  IF v_id IS NULL THEN
    SELECT COALESCE(MAX(sort_order), -1) + 1 INTO v_sort_order
    FROM public.profile_music_videos
    WHERE profile_id = v_uid;

    INSERT INTO public.profile_music_videos (
      profile_id,
      title,
      video_type,
      video_url,
      youtube_id,
      thumbnail_url,
      rights_confirmed,
      rights_confirmed_at,
      sort_order
    ) VALUES (
      v_uid,
      v_title,
      v_video_type,
      v_video_url,
      v_youtube_id,
      v_thumbnail_url,
      true,
      now(),
      v_sort_order
    )
    RETURNING * INTO v_row;

    RETURN v_row;
  END IF;

  SELECT * INTO v_existing
  FROM public.profile_music_videos
  WHERE id = v_id
    AND profile_id = v_uid;

  IF v_existing.id IS NULL THEN
    RAISE EXCEPTION 'not found';
  END IF;

  UPDATE public.profile_music_videos
  SET
    title = v_title,
    video_type = v_video_type,
    video_url = v_video_url,
    youtube_id = v_youtube_id,
    thumbnail_url = v_thumbnail_url,
    rights_confirmed = true,
    rights_confirmed_at = COALESCE(v_existing.rights_confirmed_at, now())
  WHERE id = v_id
    AND profile_id = v_uid
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

DROP FUNCTION IF EXISTS public.delete_profile_music_video(uuid);
CREATE OR REPLACE FUNCTION public.delete_profile_music_video(p_video_id uuid)
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
  WHERE id = p_video_id
    AND profile_id = v_uid;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'not found';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.reorder_profile_music_videos(uuid, uuid[]);
CREATE OR REPLACE FUNCTION public.reorder_profile_music_videos(
  p_profile_id uuid,
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

  IF p_profile_id IS NULL OR p_profile_id <> v_uid THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_expected := COALESCE(array_length(p_ordered_ids, 1), 0);

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

GRANT EXECUTE ON FUNCTION public.get_profile_music_videos(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_profile_music_video(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_profile_music_video(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_profile_music_videos(uuid, uuid[]) TO authenticated;

GRANT SELECT ON TABLE public.profile_music_videos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.profile_music_videos TO authenticated;

-- -----------------------------------------------------------------------------
-- Storage: bucket + policies for music videos
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-media', 'profile-media', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DO $$
BEGIN
  -- Public read for music videos + thumbs under profile-media
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Profile media music videos are publicly readable'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Profile media music videos are publicly readable"
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'profile-media'
        AND name LIKE '%/music/videos/%'
      )
    $pol$;
  END IF;

  -- Owner insert (uploads) limited to their profile folder + music/videos subtree.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Users can upload own music videos to profile-media'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can upload own music videos to profile-media"
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'profile-media'
        AND auth.uid() IS NOT NULL
        AND name LIKE (auth.uid()::text || '/music/videos/%')
      )
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Users can update own music videos in profile-media'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can update own music videos in profile-media"
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'profile-media'
        AND auth.uid() IS NOT NULL
        AND name LIKE (auth.uid()::text || '/music/videos/%')
      )
      WITH CHECK (
        bucket_id = 'profile-media'
        AND auth.uid() IS NOT NULL
        AND name LIKE (auth.uid()::text || '/music/videos/%')
      )
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Users can delete own music videos in profile-media'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can delete own music videos in profile-media"
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'profile-media'
        AND auth.uid() IS NOT NULL
        AND name LIKE (auth.uid()::text || '/music/videos/%')
      )
    $pol$;
  END IF;
END;
$$;

COMMIT;



