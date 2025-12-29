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

