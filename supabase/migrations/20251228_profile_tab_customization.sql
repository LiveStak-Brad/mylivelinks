BEGIN;

-- Add enabled_tabs column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS enabled_tabs text[] DEFAULT NULL;

COMMENT ON COLUMN public.profiles.enabled_tabs IS 'User-customized optional tabs (feed, reels, photos, videos, music, events, products). NULL = use profile_type defaults. Core tabs (info) always render.';

-- Create get_enabled_tabs RPC
CREATE OR REPLACE FUNCTION public.get_enabled_tabs(
  p_profile_id uuid
)
RETURNS TABLE (
  enabled_tabs text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT p.enabled_tabs
  FROM public.profiles p
  WHERE p.id = p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_enabled_tabs(uuid) TO anon, authenticated;

-- Create set_enabled_tabs RPC
CREATE OR REPLACE FUNCTION public.set_enabled_tabs(
  p_tabs text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_core_tabs text[] := ARRAY['info'];
  v_optional_tabs text[] := ARRAY['feed', 'reels', 'photos', 'videos', 'music', 'events', 'products'];
  v_invalid_tabs text[];
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- If p_tabs is NULL, reset to profile_type defaults
  IF p_tabs IS NULL THEN
    UPDATE public.profiles
    SET enabled_tabs = NULL,
        updated_at = now()
    WHERE id = v_uid;
    RETURN;
  END IF;

  -- Check for any core tabs in the input, which are not allowed to be customized
  SELECT ARRAY_AGG(s)
  INTO v_invalid_tabs
  FROM unnest(p_tabs) AS s
  WHERE s = ANY(v_core_tabs);

  IF array_length(v_invalid_tabs, 1) > 0 THEN
    RAISE EXCEPTION 'Cannot customize core tabs: %', array_to_string(v_invalid_tabs, ', ');
  END IF;

  -- Ensure all provided tabs are valid optional tabs
  SELECT ARRAY_AGG(s)
  INTO v_invalid_tabs
  FROM unnest(p_tabs) AS s
  WHERE NOT (s = ANY(v_optional_tabs));

  IF array_length(v_invalid_tabs, 1) > 0 THEN
    RAISE EXCEPTION 'Invalid tabs provided: %', array_to_string(v_invalid_tabs, ', ');
  END IF;

  -- Update enabled_tabs
  UPDATE public.profiles
  SET enabled_tabs = p_tabs,
      updated_at = now()
  WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_enabled_tabs(text[]) TO authenticated;

COMMIT;

