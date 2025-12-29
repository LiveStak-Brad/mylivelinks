BEGIN;

-- -----------------------------------------------------------------------------
-- P0 Music Tracks Persistence (web + mobile playlist players)
-- Table: public.profile_music_tracks
-- RPCs:
--   - get_profile_music_tracks(p_profile_id uuid)
--   - upsert_profile_music_track(p_track jsonb)
--   - delete_profile_music_track(p_track_id uuid)
--   - reorder_profile_music_tracks(p_profile_id uuid, p_ordered_ids uuid[])
--
-- Notes:
-- - Keep legacy RPC names (get_music_tracks / upsert_music_track / delete_music_track / reorder_music_tracks)
--   as wrappers to avoid breaking older callers, but enforce rights rules centrally.
-- -----------------------------------------------------------------------------

-- Create table if missing (some environments already have it from earlier migrations)
CREATE TABLE IF NOT EXISTS public.profile_music_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  artist_name text,
  audio_url text NOT NULL,
  cover_art_url text,
  rights_confirmed boolean NOT NULL DEFAULT false,
  rights_confirmed_at timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_music_tracks_rights_confirmed_check CHECK (
    (rights_confirmed = false) OR (rights_confirmed_at IS NOT NULL)
  )
);

-- Ensure required columns exist (for environments where the table pre-exists)
ALTER TABLE public.profile_music_tracks
  ADD COLUMN IF NOT EXISTS rights_confirmed boolean NOT NULL DEFAULT false;

ALTER TABLE public.profile_music_tracks
  ADD COLUMN IF NOT EXISTS rights_confirmed_at timestamptz;

ALTER TABLE public.profile_music_tracks
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.profile_music_tracks
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Ensure rights constraint exists (older environments may differ)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'profile_music_tracks'
      AND c.conname = 'profile_music_tracks_rights_confirmed_check'
  ) THEN
    ALTER TABLE public.profile_music_tracks
      ADD CONSTRAINT profile_music_tracks_rights_confirmed_check CHECK (
        (rights_confirmed = false) OR (rights_confirmed_at IS NOT NULL)
      );
  END IF;
END;
$$;

-- Index required by spec
CREATE INDEX IF NOT EXISTS idx_profile_music_tracks_profile_sort
  ON public.profile_music_tracks(profile_id, sort_order);

-- RLS
ALTER TABLE public.profile_music_tracks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_music_tracks'
      AND policyname='Music tracks are viewable by everyone'
  ) THEN
    EXECUTE 'CREATE POLICY "Music tracks are viewable by everyone" ON public.profile_music_tracks FOR SELECT USING (true)';
  END IF;

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
END;
$$;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_profile_music_tracks_set_updated_at ON public.profile_music_tracks;
CREATE TRIGGER trg_profile_music_tracks_set_updated_at
BEFORE UPDATE ON public.profile_music_tracks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- New canonical RPCs (requested)
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_profile_music_tracks(uuid);
CREATE OR REPLACE FUNCTION public.get_profile_music_tracks(
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

DROP FUNCTION IF EXISTS public.upsert_profile_music_track(jsonb);
CREATE OR REPLACE FUNCTION public.upsert_profile_music_track(
  p_track jsonb
)
RETURNS public.profile_music_tracks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_id uuid;
  v_existing public.profile_music_tracks;
  v_row public.profile_music_tracks;

  v_title text;
  v_artist_name text;
  v_audio_url text;
  v_cover_art_url text;
  v_sort_order int;
  v_rights_confirmed boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_id := NULLIF(TRIM(COALESCE(p_track->>'id','')), '')::uuid;
  v_title := nullif(trim(p_track->>'title'), '');
  v_artist_name := nullif(trim(p_track->>'artist_name'), '');
  v_audio_url := nullif(trim(p_track->>'audio_url'), '');
  v_cover_art_url := nullif(trim(p_track->>'cover_art_url'), '');
  v_sort_order := COALESCE(NULLIF(TRIM(COALESCE(p_track->>'sort_order','')), '')::int, 0);
  v_rights_confirmed := CASE
    WHEN p_track ? 'rights_confirmed' THEN (p_track->>'rights_confirmed')::boolean
    ELSE NULL
  END;

  -- INSERT
  IF v_id IS NULL THEN
    IF v_title IS NULL THEN
      RAISE EXCEPTION 'title is required';
    END IF;
    IF v_audio_url IS NULL THEN
      RAISE EXCEPTION 'audio_url is required';
    END IF;
    -- Rights rule: if inserting with an audio_url, require rights_confirmed = true
    IF v_rights_confirmed IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'rights_confirmed must be true when setting audio_url';
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
      v_artist_name,
      v_audio_url,
      v_cover_art_url,
      v_sort_order,
      TRUE,
      now()
    )
    RETURNING * INTO v_row;

    RETURN v_row;
  END IF;

  -- UPDATE
  SELECT *
  INTO v_existing
  FROM public.profile_music_tracks
  WHERE id = v_id
    AND profile_id = v_uid;

  IF v_existing.id IS NULL THEN
    RAISE EXCEPTION 'not found';
  END IF;

  -- Rights rule: if updating/changing audio_url, require rights_confirmed = true
  IF v_audio_url IS NOT NULL AND v_audio_url <> v_existing.audio_url THEN
    IF v_rights_confirmed IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'rights_confirmed must be true when setting audio_url';
    END IF;
  END IF;

  UPDATE public.profile_music_tracks
  SET
    title = COALESCE(v_title, title),
    artist_name = COALESCE(v_artist_name, artist_name),
    audio_url = COALESCE(v_audio_url, audio_url),
    cover_art_url = COALESCE(v_cover_art_url, cover_art_url),
    sort_order = COALESCE(v_sort_order, sort_order),
    rights_confirmed = COALESCE(v_rights_confirmed, rights_confirmed),
    rights_confirmed_at = CASE
      -- When confirming, stamp time (and keep existing stamp if already confirmed).
      WHEN COALESCE(v_rights_confirmed, rights_confirmed) = true THEN COALESCE(rights_confirmed_at, now())
      ELSE NULL
    END
  WHERE id = v_id
    AND profile_id = v_uid
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

DROP FUNCTION IF EXISTS public.delete_profile_music_track(uuid);
CREATE OR REPLACE FUNCTION public.delete_profile_music_track(
  p_track_id uuid
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
  WHERE id = p_track_id
    AND profile_id = v_uid;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'not found';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.reorder_profile_music_tracks(uuid, uuid[]);
CREATE OR REPLACE FUNCTION public.reorder_profile_music_tracks(
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
  v_distinct int;
  v_owned int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  IF p_profile_id IS NULL OR p_profile_id <> v_uid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH input AS (
    SELECT x.id, x.ord
    FROM unnest(p_ordered_ids) WITH ORDINALITY AS x(id, ord)
  )
  SELECT
    count(*)::int,
    count(distinct id)::int
  INTO v_expected, v_distinct
  FROM input;

  IF COALESCE(v_expected, 0) = 0 THEN
    RETURN;
  END IF;
  IF v_expected <> v_distinct THEN
    RAISE EXCEPTION 'duplicate ids in reorder list';
  END IF;

  SELECT count(*)::int
  INTO v_owned
  FROM public.profile_music_tracks
  WHERE profile_id = p_profile_id
    AND id = ANY(p_ordered_ids);

  IF v_owned <> v_expected THEN
    RAISE EXCEPTION 'invalid reorder set';
  END IF;

  WITH input AS (
    SELECT x.id, x.ord
    FROM unnest(p_ordered_ids) WITH ORDINALITY AS x(id, ord)
  )
  UPDATE public.profile_music_tracks t
  SET sort_order = (input.ord - 1)
  FROM input
  WHERE t.id = input.id
    AND t.profile_id = p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_music_tracks(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_profile_music_track(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_profile_music_track(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_profile_music_tracks(uuid, uuid[]) TO authenticated;

GRANT SELECT ON TABLE public.profile_music_tracks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.profile_music_tracks TO authenticated;

-- -----------------------------------------------------------------------------
-- Legacy RPC wrappers (back-compat)
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_music_tracks(uuid);
CREATE OR REPLACE FUNCTION public.get_music_tracks(
  p_profile_id uuid
)
RETURNS SETOF public.profile_music_tracks
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM public.get_profile_music_tracks(p_profile_id);
$$;

DROP FUNCTION IF EXISTS public.upsert_music_track(uuid, jsonb);
CREATE OR REPLACE FUNCTION public.upsert_music_track(
  p_id uuid DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS public.profile_music_tracks
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.upsert_profile_music_track(
    jsonb_strip_nulls(
      jsonb_build_object('id', p_id) || COALESCE(p_payload, '{}'::jsonb)
    )
  );
$$;

DROP FUNCTION IF EXISTS public.delete_music_track(uuid);
CREATE OR REPLACE FUNCTION public.delete_music_track(
  p_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.delete_profile_music_track(p_id);
$$;

DROP FUNCTION IF EXISTS public.reorder_music_tracks(uuid[]);
CREATE OR REPLACE FUNCTION public.reorder_music_tracks(
  p_ordered_ids uuid[]
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.reorder_profile_music_tracks(auth.uid(), p_ordered_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_music_tracks(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_music_track(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_music_track(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_music_tracks(uuid[]) TO authenticated;

COMMIT;




