-- ============================================================================
-- Profile Module Customization Migration (CORRECTED + UPDATED)
-- UI Agent #1 Deliverable - P0 FIX + Connections & Referral Network
-- ============================================================================
-- Adds enabled_modules column (optional modules only, no core shell)
-- Core sections (hero, footer, social_media, links) always render
-- Connections & Referral Network are optional but enabled by default
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
  v_core_modules text[] := ARRAY['hero', 'footer', 'social_media', 'links'];
  v_optional_modules text[] := ARRAY[
    'connections', 'referral_network',
    'streaming_stats', 'profile_stats', 'social_counts', 'top_supporters', 'top_streamers',
    'music_showcase', 'upcoming_events', 'merchandise', 'portfolio', 'business_info'
  ];
  v_invalid_modules text[];
BEGIN
  v_uid := auth.uid();
  
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  -- If p_modules is NULL, reset to profile_type defaults
  IF p_modules IS NULL THEN
    UPDATE public.profiles
    SET enabled_modules = NULL,
        updated_at = now()
    WHERE id = v_uid;
    RETURN;
  END IF;
  
  -- Check for any core modules in the input, which are not allowed to be customized
  SELECT ARRAY_AGG(s)
  INTO v_invalid_modules
  FROM unnest(p_modules) AS s
  WHERE s = ANY(v_core_modules);

  IF array_length(v_invalid_modules, 1) > 0 THEN
    RAISE EXCEPTION 'Cannot customize core modules: %', array_to_string(v_invalid_modules, ', ');
  END IF;

  -- Ensure all provided modules are valid optional modules
  SELECT ARRAY_AGG(s)
  INTO v_invalid_modules
  FROM unnest(p_modules) AS s
  WHERE NOT (s = ANY(v_optional_modules));

  IF array_length(v_invalid_modules, 1) > 0 THEN
    RAISE EXCEPTION 'Invalid modules provided: %', array_to_string(v_invalid_modules, ', ');
  END IF;
  
  -- Update enabled_modules
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

