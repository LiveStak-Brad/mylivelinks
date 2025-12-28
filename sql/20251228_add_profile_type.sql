BEGIN;

-- Ensure canonical profile_type enum + column (handle legacy varchar profile_type safely)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'profile_type_enum'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.profile_type_enum AS ENUM (
      'streamer',
      'musician',
      'comedian',
      'business',
      'creator'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'profile_type'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN profile_type public.profile_type_enum NOT NULL DEFAULT 'creator';
  ELSE
    -- If profile_type is currently varchar/text, convert it safely.
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'profile_type'
        AND data_type IN ('character varying', 'text')
    ) THEN
      -- Drop old default BEFORE type conversion (prevents cast errors)
      BEGIN
        ALTER TABLE public.profiles ALTER COLUMN profile_type DROP DEFAULT;
      EXCEPTION WHEN others THEN
        NULL;
      END;

      UPDATE public.profiles
      SET profile_type = 'creator'
      WHERE profile_type IS NULL
         OR profile_type = 'default'
         OR profile_type NOT IN ('streamer','musician','comedian','business','creator');

      ALTER TABLE public.profiles
        ALTER COLUMN profile_type TYPE public.profile_type_enum
        USING (
          CASE
            WHEN profile_type IS NULL THEN 'creator'
            WHEN profile_type = 'default' THEN 'creator'
            WHEN profile_type IN ('streamer','musician','comedian','business','creator') THEN profile_type
            ELSE 'creator'
          END
        )::public.profile_type_enum;
    END IF;

    -- Ensure default + not null
    UPDATE public.profiles
    SET profile_type = 'creator'
    WHERE profile_type IS NULL;

    ALTER TABLE public.profiles
      ALTER COLUMN profile_type SET DEFAULT 'creator',
      ALTER COLUMN profile_type SET NOT NULL;
  END IF;
END;
$$;

-- Ensure RLS allows user to update only their own row (RPC below enforces column-level)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
      AND policyname='Profiles are viewable by everyone'
  ) THEN
    EXECUTE 'CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
      AND policyname='Users can update own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id)';
  END IF;
END;
$$;

-- Safe write path (preferred): RPC set_profile_type(p_profile_type text)
DROP FUNCTION IF EXISTS public.set_profile_type(text);
CREATE OR REPLACE FUNCTION public.set_profile_type(
  p_profile_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_type_text text;
  v_type public.profile_type_enum;
  v_updated public.profile_type_enum;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_type_text := lower(trim(coalesce(p_profile_type, '')));

  IF v_type_text NOT IN ('streamer','musician','comedian','business','creator') THEN
    RAISE EXCEPTION 'invalid profile_type: %', p_profile_type;
  END IF;

  v_type := v_type_text::public.profile_type_enum;

  UPDATE public.profiles
  SET profile_type = v_type
  WHERE id = v_uid
  RETURNING profile_type INTO v_updated;

  IF v_updated IS NULL THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  RETURN jsonb_build_object('ok', true, 'profile_type', v_updated::text);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_profile_type(text) TO authenticated;

COMMIT;
