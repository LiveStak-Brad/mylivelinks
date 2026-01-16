-- Add username_tv and comedy to enabled_tabs constraint
-- These are new profile tabs for the [Username]TV unified video hub and Comedy content

BEGIN;

-- Drop the old constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'profiles_enabled_tabs_check'
          AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_enabled_tabs_check;
        RAISE NOTICE 'Dropped profiles_enabled_tabs_check constraint';
    END IF;
END $$;

-- Add new check constraint with ALL valid tab names including username_tv and comedy
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_enabled_tabs_check
CHECK (
    enabled_tabs IS NULL
    OR enabled_tabs <@ ARRAY[
        'info',
        'feed',
        'reels',
        'media',
        'username_tv',
        'music_videos',
        'podcasts',
        'series',
        'movies',
        'education',
        'comedy',
        'music',
        'events',
        'products',
        'reposts',
        'highlights',
        -- Legacy values for backwards compatibility
        'photos',
        'videos'
    ]::text[]
);

COMMENT ON CONSTRAINT profiles_enabled_tabs_check ON public.profiles IS 
'Validates enabled_tabs contains only valid tab names from ProfileTab type (includes username_tv and comedy)';

-- Update the set_enabled_tabs RPC to allow the new tab values
CREATE OR REPLACE FUNCTION public.set_enabled_tabs(
  p_tabs text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_core_tabs text[] := ARRAY['info'];
  v_optional_tabs text[] := ARRAY[
    'feed', 'reels', 'media', 'username_tv', 'music_videos', 'podcasts', 
    'series', 'movies', 'education', 'comedy', 'music', 'events', 'products',
    'reposts', 'highlights',
    -- Legacy values
    'photos', 'videos'
  ];
  v_invalid_tabs text[];
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- If p_tabs is NULL, reset to profile_type defaults
  IF p_tabs IS NULL THEN
    UPDATE public.profiles
    SET enabled_tabs = NULL,
        updated_at = now()
    WHERE id = v_uid;
    RETURN;
  END IF;

  -- Check for any core tabs in the input, which are not allowed to be customized
  SELECT ARRAY_AGG(s)
  INTO v_invalid_tabs
  FROM unnest(p_tabs) AS s
  WHERE s = ANY(v_core_tabs);

  IF array_length(v_invalid_tabs, 1) > 0 THEN
    RAISE EXCEPTION 'Cannot customize core tabs: %', array_to_string(v_invalid_tabs, ', ');
  END IF;

  -- Ensure all provided tabs are valid optional tabs
  SELECT ARRAY_AGG(s)
  INTO v_invalid_tabs
  FROM unnest(p_tabs) AS s
  WHERE NOT (s = ANY(v_optional_tabs));

  IF array_length(v_invalid_tabs, 1) > 0 THEN
    RAISE EXCEPTION 'Invalid tabs provided: %', array_to_string(v_invalid_tabs, ', ');
  END IF;

  -- Update enabled_tabs
  UPDATE public.profiles
  SET enabled_tabs = p_tabs,
      updated_at = now()
  WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_enabled_tabs(text[]) TO authenticated;

COMMIT;
