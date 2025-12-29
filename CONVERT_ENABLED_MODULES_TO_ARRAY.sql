-- ============================================================================
-- FIX: Convert enabled_modules from jsonb back to text[]
-- ============================================================================
-- The frontend expects text[], but FIX_ENABLED_MODULES_CONSTRAINT.sql changed it to jsonb
-- This converts it back safely
-- ============================================================================

-- Step 1: Convert enabled_modules from jsonb to text[]
ALTER TABLE profiles 
ALTER COLUMN enabled_modules TYPE text[] 
USING CASE 
  WHEN enabled_modules IS NULL THEN NULL
  WHEN jsonb_typeof(enabled_modules) = 'array' THEN 
    ARRAY(SELECT jsonb_array_elements_text(enabled_modules))
  ELSE NULL
END;

-- Step 2: Update the set_enabled_modules function to accept text[]
DROP FUNCTION IF EXISTS public.set_enabled_modules(jsonb);
DROP FUNCTION IF EXISTS public.set_enabled_modules(text[]);

CREATE OR REPLACE FUNCTION public.set_enabled_modules(
  p_modules text[]
)
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
  
  UPDATE public.profiles
  SET enabled_modules = p_modules,
      updated_at = now()
  WHERE id = v_uid;
END;
$$;

-- Step 3: Update get_enabled_modules to return text[]
DROP FUNCTION IF EXISTS public.get_enabled_modules(uuid);

CREATE OR REPLACE FUNCTION public.get_enabled_modules(
  p_profile_id uuid
)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_modules text[];
BEGIN
  SELECT enabled_modules INTO v_modules
  FROM public.profiles
  WHERE id = p_profile_id;
  
  RETURN v_modules;
END;
$$;

-- Step 4: Verify
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'enabled_modules';

-- Should show: enabled_modules | ARRAY

