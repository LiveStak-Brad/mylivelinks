BEGIN;

ALTER TABLE public.profile_music_videos
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

ALTER TABLE public.profile_music_videos
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_profile_music_videos_set_updated_at ON public.profile_music_videos;
CREATE TRIGGER trg_profile_music_videos_set_updated_at
BEFORE UPDATE ON public.profile_music_videos
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

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

  IF v ~ '^[A-Za-z0-9_-]{11}$' THEN
    RETURN v;
  END IF;

  SELECT regexp_match(v, 'youtu\.be/([A-Za-z0-9_-]{11})') INTO m;
  IF m IS NOT NULL THEN
    RETURN m[1];
  END IF;

  SELECT regexp_match(v, '[?&]v=([A-Za-z0-9_-]{11})') INTO m;
  IF m IS NOT NULL THEN
    RETURN m[1];
  END IF;

  SELECT regexp_match(v, 'youtube\.com/(?:embed|shorts|live|v)/([A-Za-z0-9_-]{11})') INTO m;
  IF m IS NOT NULL THEN
    RETURN m[1];
  END IF;

  RETURN NULL;
END;
$$;

DROP FUNCTION IF EXISTS public.normalize_youtube_url(text);
CREATE OR REPLACE FUNCTION public.normalize_youtube_url(p_url text)
RETURNS TABLE(youtube_id text, normalized_url text)
LANGUAGE sql
IMMUTABLE
AS $$
  WITH x AS (
    SELECT
      public.extract_youtube_video_id(p_url) AS id,
      nullif(trim(coalesce(p_url, '')), '') AS raw
  )
  SELECT
    x.id AS youtube_id,
    CASE
      WHEN x.id IS NULL THEN x.raw
      ELSE 'https://www.youtube.com/watch?v=' || x.id
    END AS normalized_url
  FROM x;
$$;

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

    v_video_url := 'https://www.youtube.com/watch?v=' || v_youtube_id;

    IF v_thumbnail_url IS NULL THEN
      v_thumbnail_url := 'https://img.youtube.com/vi/' || v_youtube_id || '/hqdefault.jpg';
    END IF;
  ELSE
    v_youtube_id := NULL;
  END IF;

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
  v_distinct int;
  v_nulls int;
  v_owned int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_profile_id IS NULL OR p_profile_id <> v_uid THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  WITH input AS (
    SELECT x.id, x.ord
    FROM unnest(p_ordered_ids) WITH ORDINALITY AS x(id, ord)
  )
  SELECT
    count(*)::int,
    count(distinct id)::int,
    count(*) FILTER (WHERE id IS NULL)::int
  INTO v_expected, v_distinct, v_nulls
  FROM input;

  IF COALESCE(v_expected, 0) = 0 THEN
    RETURN;
  END IF;
  IF COALESCE(v_nulls, 0) > 0 THEN
    RAISE EXCEPTION 'null ids in reorder list';
  END IF;
  IF v_expected <> v_distinct THEN
    RAISE EXCEPTION 'duplicate ids in reorder list';
  END IF;

  SELECT count(*)::int
  INTO v_owned
  FROM public.profile_music_videos
  WHERE profile_id = p_profile_id
    AND id = ANY(p_ordered_ids);

  IF v_owned <> v_expected THEN
    RAISE EXCEPTION 'invalid reorder set';
  END IF;

  WITH input AS (
    SELECT x.id, x.ord
    FROM unnest(p_ordered_ids) WITH ORDINALITY AS x(id, ord)
  )
  UPDATE public.profile_music_videos t
  SET sort_order = (input.ord - 1)
  FROM input
  WHERE t.id = input.id
    AND t.profile_id = p_profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_music_videos(p_profile_id uuid)
RETURNS SETOF public.profile_music_videos
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.profile_music_videos
  WHERE profile_id = p_profile_id
  ORDER BY sort_order, created_at;
$$;

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
  v_video jsonb;
BEGIN
  v_video := COALESCE(p_payload, '{}'::jsonb);
  IF p_id IS NOT NULL THEN
    v_video := v_video || jsonb_build_object('id', p_id::text);
  END IF;

  RETURN public.upsert_profile_music_video(v_video);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_music_video(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  PERFORM public.delete_profile_music_video(p_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_music_videos(p_ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  PERFORM public.reorder_profile_music_videos(v_uid, p_ordered_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.extract_youtube_video_id(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_youtube_url(text) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_profile_music_videos(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_profile_music_video(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_profile_music_video(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_profile_music_videos(uuid, uuid[]) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_music_videos(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_music_video(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_music_video(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_music_videos(uuid[]) TO authenticated;

COMMIT;
