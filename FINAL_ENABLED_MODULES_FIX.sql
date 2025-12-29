-- ============================================================================
-- SIMPLER FIX: Convert enabled_modules to text[] (WORKING VERSION)
-- ============================================================================
-- Uses a simpler approach that PostgreSQL accepts
-- ============================================================================

BEGIN;

-- Step 1: Check current data type
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name = 'enabled_modules';

-- Step 2: If it's jsonb, we need to convert existing data first
-- Create a temporary text[] column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS enabled_modules_new text[];

-- Step 3: Convert existing jsonb data to text[]
UPDATE profiles
SET enabled_modules_new = CASE
    WHEN enabled_modules IS NULL THEN NULL
    WHEN jsonb_typeof(enabled_modules) = 'array' THEN
        (SELECT array_agg(value::text)
         FROM jsonb_array_elements_text(enabled_modules) AS value)
    ELSE NULL
END
WHERE enabled_modules IS NOT NULL;

-- Step 4: Drop old column and rename new one
ALTER TABLE profiles DROP COLUMN enabled_modules;
ALTER TABLE profiles RENAME COLUMN enabled_modules_new TO enabled_modules;

-- Step 5: Update functions to use text[]
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
  
  UPDATE public.profiles
  SET enabled_modules = p_modules,
      updated_at = now()
  WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_enabled_modules(text[]) TO authenticated;

-- Step 6: Update get function
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

-- Step 7: Verify
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name = 'enabled_modules';

-- Should show: enabled_modules | ARRAY | YES

COMMIT;

