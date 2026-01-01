BEGIN;

-- Recreate the gender column on public.profiles if it was dropped or never applied
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender text;

-- Enforce the canonical gender constraint (nullable / controlled values)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_gender_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_gender_check
CHECK (
  gender IS NULL
  OR gender IN ('male', 'female', 'nonbinary', 'other', 'prefer_not_to_say')
);

-- Helpful index for dating/directory filters
CREATE INDEX IF NOT EXISTS idx_profiles_gender
ON public.profiles (gender)
WHERE gender IS NOT NULL;

COMMENT ON COLUMN public.profiles.gender IS
  'Optional gender metadata used by dating filters. Allowed values: male, female, nonbinary, other, prefer_not_to_say.';

-- Make sure the schema cache sees the column immediately (Supabase/PostgREST)
NOTIFY pgrst, 'reload schema';

COMMIT;
