# FIX SAVE BUTTON - Apply This SQL Migration NOW

## The Error You're Seeing
```
Profile update failed: new row for relation "profiles" violates check constraint "profiles_enabled_modules_check" (23514)
```

## The Problem
The database has an outdated CHECK constraint on `enabled_modules` that doesn't recognize all the valid module names.

## The Solution - Run This SQL (30 seconds)

### Step 1: Open Supabase SQL Editor
https://supabase.com/dashboard/project/dfiyrmqobjfsdsgklweg/sql/new

### Step 2: Copy and Paste This SQL

```sql
-- ============================================================================
-- Fix profiles enabled_modules Check Constraint
-- ============================================================================
-- This removes the overly strict check constraint on enabled_modules
-- and allows any valid module names from the updated ProfileModulePicker
-- ============================================================================

BEGIN;

-- Drop existing check constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'profiles_enabled_modules_check'
          AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_enabled_modules_check;
        RAISE NOTICE 'Dropped profiles_enabled_modules_check constraint';
    END IF;
END $$;

-- Add new check constraint with ALL valid module names
-- This matches ProfileModulePicker.tsx OPTIONAL_MODULES
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_enabled_modules_check
CHECK (
    enabled_modules IS NULL
    OR enabled_modules <@ ARRAY[
        -- Profile modules
        'social_counts',
        'social_media',
        'links',
        'connections',
        -- Community
        'referral_network',
        -- Content
        'music_showcase',
        'upcoming_events',
        -- Stats
        'streaming_stats',
        'profile_stats',
        'top_supporters',
        'top_streamers',
        -- Business
        'merchandise',
        'portfolio',
        'business_info'
    ]::text[]
);

COMMENT ON CONSTRAINT profiles_enabled_modules_check ON public.profiles IS 
'Validates enabled_modules contains only valid optional module names from ProfileModulePicker';

COMMIT;
```

### Step 3: Click "Run" (or press Ctrl+Enter)

You should see:
- **NOTICE: Dropped profiles_enabled_modules_check constraint**
- **SUCCESS**

### Step 4: Try Saving Again

Your profile save will now work!

## What This Does

✅ **Removes** the old, overly-strict constraint  
✅ **Adds** new constraint with ALL valid module names  
✅ **Matches** exactly what ProfileModulePicker allows  
✅ **Allows** `NULL` (use profile_type defaults)  

## Valid Modules Now Allowed
- social_counts
- social_media  
- links
- connections
- referral_network
- music_showcase
- upcoming_events
- streaming_stats
- profile_stats
- top_supporters
- top_streamers
- merchandise
- portfolio
- business_info

## After This Fix

Your save button will work **immediately** after running this migration!

---

**This migration file is also in:** `supabase/migrations/20251229_fix_enabled_modules_constraint.sql`

