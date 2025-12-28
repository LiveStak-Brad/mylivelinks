BEGIN;

-- -----------------------------------------------------------------------------
-- Feed: Create a feed post from a composer clip project (Phase 1 contract)
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.create_feed_post_from_clip_project(uuid, text);

CREATE OR REPLACE FUNCTION public.create_feed_post_from_clip_project(
  p_project_id uuid,
  p_caption text DEFAULT NULL
)
RETURNS TABLE (
  post_id uuid,
  clip_id uuid,
  project_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_project record;
  v_clip record;
  v_post_id uuid;
  v_created_at timestamptz;
  v_text_content text;
  v_posts_has_visibility boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT cp.*
  INTO v_project
  FROM public.clip_projects cp
  WHERE cp.id = p_project_id
  FOR UPDATE;

  IF v_project.id IS NULL THEN
    RAISE EXCEPTION 'Clip project not found';
  END IF;

  IF v_project.owner_profile_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized clip project owner';
  END IF;

  IF v_project.status = 'posted' THEN
    RAISE EXCEPTION 'Clip project already posted';
  END IF;

  SELECT c.*
  INTO v_clip
  FROM public.clips c
  WHERE c.id = v_project.clip_id
  FOR UPDATE;

  IF v_clip.id IS NULL THEN
    RAISE EXCEPTION 'Clip not found';
  END IF;

  IF v_clip.producer_profile_id <> v_project.owner_profile_id THEN
    RAISE EXCEPTION 'Clip producer does not match project owner';
  END IF;

  IF v_clip.asset_url IS NULL OR length(trim(v_clip.asset_url)) = 0 THEN
    RAISE EXCEPTION 'Clip asset_url is missing';
  END IF;

  v_text_content := COALESCE(NULLIF(trim(p_caption), ''), NULLIF(trim(v_project.caption), ''), '');

  UPDATE public.clip_projects
  SET
    status = 'posted',
    caption = COALESCE(p_caption, caption)
  WHERE id = v_project.id;

  -- Feed posts are served publicly; we set the resulting clip visibility to public.
  UPDATE public.clips
  SET visibility = 'public'
  WHERE id = v_project.clip_id
    AND visibility <> 'removed';

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'posts'
      AND column_name = 'visibility'
  )
  INTO v_posts_has_visibility;

  IF v_posts_has_visibility THEN
    EXECUTE 'INSERT INTO public.posts (author_id, text_content, media_url, visibility) VALUES ($1, $2, $3, $4) RETURNING id, created_at'
    INTO v_post_id, v_created_at
    USING v_project.owner_profile_id, v_text_content, v_clip.asset_url, 'public';
  ELSE
    EXECUTE 'INSERT INTO public.posts (author_id, text_content, media_url) VALUES ($1, $2, $3) RETURNING id, created_at'
    INTO v_post_id, v_created_at
    USING v_project.owner_profile_id, v_text_content, v_clip.asset_url;
  END IF;

  post_id := v_post_id;
  clip_id := v_project.clip_id;
  project_id := v_project.id;
  created_at := v_created_at;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_feed_post_from_clip_project(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_feed_post_from_clip_project(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_feed_post_from_clip_project(uuid, text) TO service_role;

COMMIT;
