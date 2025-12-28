BEGIN;

-- -----------------------------------------------------------------------------
-- Clip Actors CRUD RPCs (Phase 1 contract)
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.add_clip_actor(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.add_clip_actor(
  p_clip_id uuid,
  p_actor_profile_id uuid,
  p_role text
)
RETURNS public.clip_actors
LANGUAGE plpgsql
AS $$
DECLARE
  v_clip public.clips;
  v_row public.clip_actors;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_role NOT IN ('target','participant') THEN
    RAISE EXCEPTION 'Invalid role';
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

  INSERT INTO public.clip_actors (
    clip_id,
    actor_profile_id,
    role
  )
  VALUES (
    p_clip_id,
    p_actor_profile_id,
    p_role
  )
  ON CONFLICT (clip_id, actor_profile_id, role) DO NOTHING;

  SELECT ca.*
  INTO v_row
  FROM public.clip_actors ca
  WHERE ca.clip_id = p_clip_id
    AND ca.actor_profile_id = p_actor_profile_id
    AND ca.role = p_role;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.add_clip_actor(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_clip_actor(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_clip_actor(uuid, uuid, text) TO service_role;


DROP FUNCTION IF EXISTS public.remove_clip_actor(uuid, uuid);

CREATE OR REPLACE FUNCTION public.remove_clip_actor(
  p_clip_id uuid,
  p_actor_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_clip public.clips;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
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

  DELETE FROM public.clip_actors ca
  WHERE ca.clip_id = p_clip_id
    AND ca.actor_profile_id = p_actor_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_clip_actor(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_clip_actor(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_clip_actor(uuid, uuid) TO service_role;


DROP FUNCTION IF EXISTS public.list_clip_actors(uuid);

CREATE OR REPLACE FUNCTION public.list_clip_actors(
  p_clip_id uuid
)
RETURNS SETOF public.clip_actors
LANGUAGE sql
AS $$
  SELECT ca.*
  FROM public.clip_actors ca
  WHERE ca.clip_id = p_clip_id
  ORDER BY ca.role, ca.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.list_clip_actors(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_clip_actors(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_clip_actors(uuid) TO service_role;

COMMIT;
