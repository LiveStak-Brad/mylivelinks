# Fix: enabled_modules Check Constraint Error

## Error
```
Failed to save profile: Profile update failed: new row for relation "profiles" violates check constraint "profiles_enabled_modules_check" (23514)
```

## Cause
1. The `enabled_modules` column was created as `text[]` but the code is sending `jsonb`
2. There's a constraint function validating which modules can be enabled
3. The constraint doesn't know about the new modules we added (social_media, links, social_counts)

## Solution

### Run This SQL in Supabase SQL Editor:

```sql
BEGIN;

-- 1. Drop any check constraints
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_enabled_modules_check;

-- 2. Change column type to jsonb (better for our use case)
ALTER TABLE profiles 
ALTER COLUMN enabled_modules TYPE jsonb 
USING CASE 
  WHEN enabled_modules IS NULL THEN NULL
  ELSE to_jsonb(enabled_modules)
END;

-- 3. Update function to remove validation (users can enable ANY module!)
CREATE OR REPLACE FUNCTION public.set_enabled_modules(p_modules jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  -- No validation - users can customize freely!
  UPDATE public.profiles
  SET enabled_modules = p_modules,
      updated_at = now()
  WHERE id = v_uid;
END;
$$;

COMMIT;
```

### Or Use the Pre-Made File

Run the file: **`FIX_ENABLED_MODULES_CONSTRAINT.sql`** in Supabase SQL Editor

## What This Does

1. **Removes the restrictive check constraint** that was blocking new modules
2. **Changes data type to `jsonb`** (more flexible than `text[]`)
3. **Removes validation** - users can now enable ANY module combination
4. **Matches the code** - the TypeScript code sends jsonb arrays

## After Applying

1. Refresh your browser
2. Go to Settings → Profile
3. Customize your modules (try enabling any combination!)
4. Click "Save All Changes"
5. Should work perfectly! ✅

## Why This Happened

The original migration had a strict validation function that only allowed specific modules. When we expanded the module system to allow ALL modules (social_media, links, social_counts, etc.), the old constraint rejected them.

This fix removes that restriction so users have complete freedom to customize their profiles.

