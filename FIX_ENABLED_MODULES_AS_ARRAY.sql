-- ============================================================================
-- CRITICAL FIX: Make RPC return enabled_modules as text array
-- ============================================================================
-- The profile page expects enabled_modules as string[] but we converted to jsonb
-- This causes the profile to not respect customization settings
-- ============================================================================

BEGIN;

-- Step 1: Convert enabled_modules back to text[] for compatibility
-- The frontend expects string[], not jsonb
ALTER TABLE profiles 
ALTER COLUMN enabled_modules TYPE text[] 
USING CASE 
  WHEN enabled_modules IS NULL THEN NULL
  WHEN jsonb_typeof(enabled_modules) = 'array' THEN 
    ARRAY(SELECT jsonb_array_elements_text(enabled_modules))
  ELSE NULL
END;

-- Step 2: Update set_enabled_modules to accept text[]
DROP FUNCTION IF EXISTS public.set_enabled_modules(jsonb);
DROP FUNCTION IF EXISTS public.set_enabled_modules(text[]);

CREATE OR REPLACE FUNCTION public.set_enabled_modules(p_modules text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  -- No validation - users can enable ANY module!
  UPDATE public.profiles
  SET enabled_modules = p_modules,
      updated_at = now()
  WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_enabled_modules(text[]) TO authenticated;

-- Step 3: Update get_enabled_modules to return text[]
DROP FUNCTION IF EXISTS public.get_enabled_modules(uuid);

CREATE OR REPLACE FUNCTION public.get_enabled_modules(p_profile_id uuid)
RETURNS TABLE (enabled_modules text[])
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.enabled_modules
  FROM public.profiles p
  WHERE p.id = p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_enabled_modules(uuid) TO anon, authenticated;

-- Step 4: Verify
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name = 'enabled_modules';

COMMIT;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- enabled_modules should now be: ARRAY | text[] | YES
-- The profile page will now properly load your customization settings!
-- ============================================================================

