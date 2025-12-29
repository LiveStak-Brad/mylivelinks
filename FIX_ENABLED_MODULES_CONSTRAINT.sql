-- ============================================================================
-- FIX: Update enabled_modules to support full customization
-- ============================================================================
-- Changes:
-- 1. Change enabled_modules from text[] to jsonb for better flexibility
-- 2. Drop the constraint that was rejecting new modules
-- 3. Update RPC functions to match new schema
-- ============================================================================

BEGIN;

-- Step 1: Drop the old constraint/check if it exists
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_enabled_modules_check;

-- Step 2: Change column type from text[] to jsonb
-- First, convert existing data
ALTER TABLE profiles 
ALTER COLUMN enabled_modules TYPE jsonb 
USING CASE 
  WHEN enabled_modules IS NULL THEN NULL
  ELSE to_jsonb(enabled_modules)
END;

-- Step 3: Drop old function and recreate to accept jsonb and allow ALL modules
DROP FUNCTION IF EXISTS public.set_enabled_modules(text[]);
DROP FUNCTION IF EXISTS public.set_enabled_modules(jsonb);

CREATE OR REPLACE FUNCTION public.set_enabled_modules(
  p_modules jsonb
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
  
  -- Allow NULL to reset to profile_type defaults
  -- Allow empty array [] to disable all optional modules
  -- Allow any valid jsonb array
  
  -- No validation needed - users can enable ANY module they want!
  -- Profile type is just a template, not a restriction
  
  UPDATE public.profiles
  SET enabled_modules = p_modules,
      updated_at = now()
  WHERE id = v_uid;
END;
$$;

-- Step 4: Drop old function and recreate with jsonb return type
DROP FUNCTION IF EXISTS public.get_enabled_modules(uuid);

CREATE OR REPLACE FUNCTION public.get_enabled_modules(
  p_profile_id uuid
)
RETURNS TABLE (
  enabled_modules jsonb
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

-- Step 5: Verify the changes
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
-- You should see: enabled_modules | jsonb | YES
-- Now users can customize ANY modules without restrictions!
-- ============================================================================

