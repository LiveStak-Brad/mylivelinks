-- ============================================================================
-- Add top_friends to profiles_enabled_modules_check constraint
-- ============================================================================
-- Mobile supports top_friends module but DB constraint was missing it.
-- This adds top_friends to the allowed list for parity.
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

-- Recreate constraint with top_friends added
-- Keeping all existing allowed values unchanged
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
        'top_friends',  -- ADDED for mobile parity
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
'Validates enabled_modules contains only valid optional module names (includes top_friends for mobile parity)';

COMMIT;
