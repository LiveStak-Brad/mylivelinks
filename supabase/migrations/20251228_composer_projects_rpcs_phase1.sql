BEGIN;

DROP FUNCTION IF EXISTS public.create_clip_project_from_clip(uuid, text, text);

CREATE OR REPLACE FUNCTION public.create_clip_project_from_clip(
  p_clip_id uuid,
  p_caption text DEFAULT NULL,
  p_composer_level text DEFAULT 'mobile'
)
RETURNS TABLE (
  project_id uuid,
  clip_id uuid,
  status text,
  updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_clip record;
  v_project record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_composer_level NOT IN ('mobile','web') THEN
    RAISE EXCEPTION 'Invalid composer_level';
  END IF;

  SELECT c.*
  INTO v_clip
  FROM public.clips c
  WHERE c.id = p_clip_id;

  IF v_clip.id IS NULL THEN
    RAISE EXCEPTION 'Clip not found';
  END IF;

  IF v_clip.producer_profile_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized clip producer';
  END IF;

  INSERT INTO public.clip_projects (
    clip_id,
    owner_profile_id,
    caption,
    composer_level
  )
  VALUES (
    p_clip_id,
    auth.uid(),
    p_caption,
    p_composer_level
  )
  RETURNING * INTO v_project;

  project_id := v_project.id;
  clip_id := v_project.clip_id;
  status := v_project.status;
  updated_at := v_project.updated_at;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_clip_project_from_clip(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_clip_project_from_clip(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_clip_project_from_clip(uuid, text, text) TO service_role;

DROP FUNCTION IF EXISTS public.update_clip_project(uuid, text, jsonb, text);

CREATE OR REPLACE FUNCTION public.update_clip_project(
  p_project_id uuid,
  p_caption text DEFAULT NULL,
  p_overlay_json jsonb DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS public.clip_projects
LANGUAGE plpgsql
AS $$
DECLARE
  v_row public.clip_projects;
  v_key text;
  v_item jsonb;
  v_item_key text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('draft','posted','archived') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  IF p_overlay_json IS NOT NULL THEN
    IF octet_length(p_overlay_json::text) > 50000 THEN
      RAISE EXCEPTION 'overlay_json too large';
    END IF;

    IF jsonb_typeof(p_overlay_json) <> 'object' THEN
      RAISE EXCEPTION 'overlay_json must be a JSON object';
    END IF;

    FOR v_key IN SELECT jsonb_object_keys(p_overlay_json)
    LOOP
      IF v_key <> 'text' THEN
        RAISE EXCEPTION 'overlay_json contains unsupported key: %', v_key;
      END IF;
    END LOOP;

    IF p_overlay_json ? 'text' THEN
      IF jsonb_typeof(p_overlay_json->'text') <> 'array' THEN
        RAISE EXCEPTION 'overlay_json.text must be an array';
      END IF;

      FOR v_item IN SELECT jsonb_array_elements(p_overlay_json->'text')
      LOOP
        IF jsonb_typeof(v_item) <> 'object' THEN
          RAISE EXCEPTION 'overlay_json.text[] items must be objects';
        END IF;

        FOR v_item_key IN SELECT jsonb_object_keys(v_item)
        LOOP
          IF v_item_key NOT IN ('id','text','x','y','scale','color','font','startMs','endMs') THEN
            RAISE EXCEPTION 'overlay_json.text[] contains unsupported key: %', v_item_key;
          END IF;
        END LOOP;

        IF NOT (v_item ? 'id') OR jsonb_typeof(v_item->'id') <> 'string' THEN
          RAISE EXCEPTION 'overlay_json.text[].id must be a string';
        END IF;

        IF NOT (v_item ? 'text') OR jsonb_typeof(v_item->'text') <> 'string' THEN
          RAISE EXCEPTION 'overlay_json.text[].text must be a string';
        END IF;

        IF NOT (v_item ? 'x') OR jsonb_typeof(v_item->'x') <> 'number' THEN
          RAISE EXCEPTION 'overlay_json.text[].x must be a number';
        END IF;

        IF NOT (v_item ? 'y') OR jsonb_typeof(v_item->'y') <> 'number' THEN
          RAISE EXCEPTION 'overlay_json.text[].y must be a number';
        END IF;

        IF NOT (v_item ? 'scale') OR jsonb_typeof(v_item->'scale') <> 'number' THEN
          RAISE EXCEPTION 'overlay_json.text[].scale must be a number';
        END IF;

        IF NOT (v_item ? 'color') OR jsonb_typeof(v_item->'color') <> 'string' THEN
          RAISE EXCEPTION 'overlay_json.text[].color must be a string';
        END IF;

        IF NOT (v_item ? 'font') OR jsonb_typeof(v_item->'font') <> 'string' THEN
          RAISE EXCEPTION 'overlay_json.text[].font must be a string';
        END IF;

        IF v_item ? 'startMs' THEN
          IF jsonb_typeof(v_item->'startMs') NOT IN ('number','null') THEN
            RAISE EXCEPTION 'overlay_json.text[].startMs must be a number or null';
          END IF;
        END IF;

        IF v_item ? 'endMs' THEN
          IF jsonb_typeof(v_item->'endMs') NOT IN ('number','null') THEN
            RAISE EXCEPTION 'overlay_json.text[].endMs must be a number or null';
          END IF;
        END IF;
      END LOOP;
    END IF;
  END IF;

  UPDATE public.clip_projects
  SET
    caption = COALESCE(p_caption, caption),
    overlay_json = COALESCE(p_overlay_json, overlay_json),
    status = COALESCE(p_status, status)
  WHERE id = p_project_id
    AND owner_profile_id = auth.uid()
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Clip project not found';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_clip_project(uuid, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_clip_project(uuid, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_clip_project(uuid, text, jsonb, text) TO service_role;

DROP FUNCTION IF EXISTS public.get_clip_project(uuid);

CREATE OR REPLACE FUNCTION public.get_clip_project(
  p_project_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_project public.clip_projects;
  v_clip public.clips;
  v_actors jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT cp.*
  INTO v_project
  FROM public.clip_projects cp
  WHERE cp.id = p_project_id;

  IF v_project.id IS NULL THEN
    RAISE EXCEPTION 'Clip project not found';
  END IF;

  SELECT c.*
  INTO v_clip
  FROM public.clips c
  WHERE c.id = v_project.clip_id;

  IF v_clip.id IS NULL THEN
    RAISE EXCEPTION 'Clip not found';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'role', ca.role
      )
      ORDER BY ca.role, p.id
    ),
    '[]'::jsonb
  )
  INTO v_actors
  FROM public.clip_actors ca
  JOIN public.profiles p ON p.id = ca.actor_profile_id
  WHERE ca.clip_id = v_project.clip_id;

  RETURN jsonb_build_object(
    'project', jsonb_build_object(
      'id', v_project.id,
      'clip_id', v_project.clip_id,
      'owner_profile_id', v_project.owner_profile_id,
      'caption', v_project.caption,
      'overlay_json', v_project.overlay_json,
      'composer_level', v_project.composer_level,
      'status', v_project.status,
      'created_at', v_project.created_at,
      'updated_at', v_project.updated_at
    ),
    'clip', jsonb_build_object(
      'id', v_clip.id,
      'producer_profile_id', v_clip.producer_profile_id,
      'room_name', v_clip.room_name,
      'mode', v_clip.mode,
      'target_profile_id', v_clip.target_profile_id,
      'duration_seconds', v_clip.duration_seconds,
      'include_chat', v_clip.include_chat,
      'layout_meta', v_clip.layout_meta,
      'status', v_clip.status,
      'visibility', v_clip.visibility,
      'asset_url', v_clip.asset_url,
      'thumbnail_url', v_clip.thumbnail_url,
      'created_at', v_clip.created_at,
      'updated_at', v_clip.updated_at
    ),
    'actors', v_actors
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_clip_project(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_clip_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clip_project(uuid) TO service_role;

DROP FUNCTION IF EXISTS public.list_clip_projects(uuid, text, timestamptz, int);

CREATE OR REPLACE FUNCTION public.list_clip_projects(
  p_owner_profile_id uuid DEFAULT auth.uid(),
  p_status text DEFAULT NULL,
  p_cursor timestamptz DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  project_id uuid,
  clip_id uuid,
  status text,
  updated_at timestamptz,
  caption text,
  composer_level text
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_owner_profile_id IS NULL OR p_owner_profile_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('draft','posted','archived') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Invalid limit';
  END IF;

  RETURN QUERY
  SELECT
    cp.id,
    cp.clip_id,
    cp.status,
    cp.updated_at,
    cp.caption,
    cp.composer_level
  FROM public.clip_projects cp
  WHERE cp.owner_profile_id = p_owner_profile_id
    AND (p_status IS NULL OR cp.status = p_status)
    AND (p_cursor IS NULL OR cp.updated_at < p_cursor)
  ORDER BY cp.updated_at DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.list_clip_projects(uuid, text, timestamptz, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_clip_projects(uuid, text, timestamptz, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_clip_projects(uuid, text, timestamptz, int) TO service_role;

COMMIT;
