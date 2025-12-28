-- ============================================================================
-- Profile Module Customization Migration (CORRECTED)
-- UI Agent #1 Deliverable - P0 FIX
-- ============================================================================
-- Adds enabled_modules column (optional modules only, no core shell)
-- Core sections (hero, footer, connections, social_media, links) always render
-- ============================================================================

BEGIN;

-- Add enabled_modules column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS enabled_modules text[] DEFAULT NULL;

-- Remove old enabled_sections column if it exists
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS enabled_sections;

-- Create get_enabled_modules RPC
CREATE OR REPLACE FUNCTION public.get_enabled_modules(
  p_profile_id uuid
)
RETURNS TABLE (
  enabled_modules text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT p.enabled_modules
  FROM public.profiles p
  WHERE p.id = p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_enabled_modules(uuid) TO anon, authenticated;

-- Create set_enabled_modules RPC
CREATE OR REPLACE FUNCTION public.set_enabled_modules(
  p_modules text[]
)
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
  
  -- Update enabled_modules (can be NULL for profile_type defaults)
  UPDATE public.profiles
  SET enabled_modules = p_modules,
      updated_at = now()
  WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_enabled_modules(text[]) TO authenticated;

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS public.get_enabled_sections(uuid);
DROP FUNCTION IF EXISTS public.set_enabled_sections(text[]);

COMMIT;

