-- ============================================================================
-- FIX: Convert enabled_modules from jsonb to text[] (CORRECT WAY)
-- ============================================================================

-- Step 1: Create a new column with the correct type
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS enabled_modules_new text[];

-- Step 2: Migrate data from jsonb to text[]
UPDATE profiles
SET enabled_modules_new = CASE 
  WHEN enabled_modules IS NULL THEN NULL
  WHEN jsonb_typeof(enabled_modules) = 'array' THEN 
    (SELECT array_agg(value::text)
     FROM jsonb_array_elements_text(enabled_modules) AS value)
  ELSE NULL
END
WHERE enabled_modules IS NOT NULL;

-- Step 3: Drop the old jsonb column
ALTER TABLE profiles DROP COLUMN enabled_modules;

-- Step 4: Rename the new column
ALTER TABLE profiles RENAME COLUMN enabled_modules_new TO enabled_modules;

-- Step 5: Update the set_enabled_modules function to accept text[]
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

-- Step 6: Update get_enabled_modules to return text[]
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

-- Step 7: Verify
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'enabled_modules';

-- Should show: enabled_modules | ARRAY

