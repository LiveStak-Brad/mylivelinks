-- Add description field to profile_music_videos
-- This allows musicians to add descriptions to their music videos

ALTER TABLE public.profile_music_videos
  ADD COLUMN IF NOT EXISTS description text;

-- Drop existing function first to allow signature change
DROP FUNCTION IF EXISTS public.upsert_music_video(uuid, jsonb);

-- Update the upsert_music_video RPC to support description
CREATE OR REPLACE FUNCTION public.upsert_music_video(
  p_id uuid,
  p_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_video_id uuid;
  v_title text;
  v_description text;
  v_video_type text;
  v_video_url text;
  v_youtube_id text;
  v_thumbnail_url text;
  v_rights_confirmed boolean;
  v_sort_order int;
BEGIN
  v_profile_id := auth.uid();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Extract payload fields
  v_title := COALESCE(p_payload->>'title', '');
  v_description := p_payload->>'description';
  v_video_type := COALESCE(p_payload->>'video_type', 'youtube');
  v_video_url := COALESCE(p_payload->>'video_url', '');
  v_thumbnail_url := p_payload->>'thumbnail_url';
  v_rights_confirmed := COALESCE((p_payload->>'rights_confirmed')::boolean, false);

  -- Validate
  IF v_title = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;
  IF v_video_url = '' THEN
    RAISE EXCEPTION 'Video URL is required';
  END IF;
  IF v_video_type NOT IN ('upload', 'youtube') THEN
    RAISE EXCEPTION 'Invalid video_type: %', v_video_type;
  END IF;

  -- Extract YouTube ID if applicable
  IF v_video_type = 'youtube' THEN
    v_youtube_id := extract_youtube_video_id(v_video_url);
    IF v_youtube_id IS NULL THEN
      RAISE EXCEPTION 'Invalid YouTube URL';
    END IF;
  ELSE
    v_youtube_id := NULL;
  END IF;

  IF p_id IS NOT NULL THEN
    -- UPDATE existing
    UPDATE profile_music_videos
    SET
      title = v_title,
      description = v_description,
      video_type = v_video_type,
      video_url = v_video_url,
      youtube_id = v_youtube_id,
      thumbnail_url = COALESCE(v_thumbnail_url, thumbnail_url),
      rights_confirmed = v_rights_confirmed,
      rights_confirmed_at = CASE WHEN v_rights_confirmed THEN now() ELSE rights_confirmed_at END,
      updated_at = now()
    WHERE id = p_id AND profile_id = v_profile_id
    RETURNING id INTO v_video_id;

    IF v_video_id IS NULL THEN
      RAISE EXCEPTION 'Video not found or not owned by user';
    END IF;
  ELSE
    -- INSERT new
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_order
    FROM profile_music_videos
    WHERE profile_id = v_profile_id;

    INSERT INTO profile_music_videos (
      profile_id,
      title,
      description,
      video_type,
      video_url,
      youtube_id,
      thumbnail_url,
      rights_confirmed,
      rights_confirmed_at,
      sort_order
    ) VALUES (
      v_profile_id,
      v_title,
      v_description,
      v_video_type,
      v_video_url,
      v_youtube_id,
      v_thumbnail_url,
      v_rights_confirmed,
      CASE WHEN v_rights_confirmed THEN now() ELSE NULL END,
      v_sort_order
    )
    RETURNING id INTO v_video_id;
  END IF;

  RETURN v_video_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_music_video(uuid, jsonb) TO authenticated;
