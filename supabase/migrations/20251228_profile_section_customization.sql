-- ============================================================================
-- Profile Section Customization Migration
-- UI Agent #1 Deliverable
-- ============================================================================
-- Adds enabled_sections column and RPCs for profile section customization
-- ============================================================================

BEGIN;

-- Add enabled_sections column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS enabled_sections text[] DEFAULT NULL;

-- Create get_enabled_sections RPC
CREATE OR REPLACE FUNCTION public.get_enabled_sections(
  p_profile_id uuid
)
RETURNS TABLE (
  enabled_sections text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT p.enabled_sections
  FROM public.profiles p
  WHERE p.id = p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_enabled_sections(uuid) TO anon, authenticated;

-- Create set_enabled_sections RPC
CREATE OR REPLACE FUNCTION public.set_enabled_sections(
  p_sections text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_core_sections text[] := ARRAY['hero', 'links', 'footer'];
  v_has_core boolean;
BEGIN
  v_uid := auth.uid();
  
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  -- If p_sections is NULL, reset to profile_type defaults
  IF p_sections IS NULL THEN
    UPDATE public.profiles
    SET enabled_sections = NULL,
        updated_at = now()
    WHERE id = v_uid;
    RETURN;
  END IF;
  
  -- Ensure at least one core section is enabled
  v_has_core := EXISTS (
    SELECT 1
    FROM unnest(p_sections) AS s
    WHERE s = ANY(v_core_sections)
  );
  
  IF NOT v_has_core THEN
    RAISE EXCEPTION 'At least one core section (hero, links, or footer) must be enabled';
  END IF;
  
  -- Update enabled_sections
  UPDATE public.profiles
  SET enabled_sections = p_sections,
      updated_at = now()
  WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_enabled_sections(text[]) TO authenticated;

COMMIT;

