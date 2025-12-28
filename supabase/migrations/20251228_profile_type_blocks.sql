BEGIN;

-- -----------------------------------------------------------------------------
-- Profile Type Expansion + Profile Content Blocks (v1)
-- -----------------------------------------------------------------------------

-- 1) Enum: profile_type_enum
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
END;
$$;

-- 2) Add profiles.profile_type
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_type public.profile_type_enum NOT NULL DEFAULT 'creator';

-- 3) Shared updated_at trigger helper (create-or-replace so it's always present)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4) profile_content_blocks
CREATE TABLE IF NOT EXISTS public.profile_content_blocks (
  id bigserial PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  block_type text NOT NULL,
  title text NULL,
  url text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_content_blocks_block_type_check CHECK (
    block_type IN (
      'schedule_item',
      'clip',
      'supporter',
      'track',
      'show',
      'merch',
      'presskit_link',
      'bit',
      'service',
      'product',
      'booking_link',
      'review',
      'featured_link'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_profile_content_blocks_profile_sort
  ON public.profile_content_blocks(profile_id, sort_order, id);

DROP TRIGGER IF EXISTS trg_profile_content_blocks_set_updated_at ON public.profile_content_blocks;
CREATE TRIGGER trg_profile_content_blocks_set_updated_at
BEFORE UPDATE ON public.profile_content_blocks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_content_blocks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- profiles: public select
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
      AND policyname='Profiles are viewable by everyone'
  ) THEN
    EXECUTE 'CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true)';
  END IF;

  -- profiles: owner update (ownership enforcement; column restriction is enforced in RPC)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
      AND policyname='Users can update own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id)';
  END IF;

  -- profile_content_blocks: public select
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_content_blocks'
      AND policyname='Profile blocks are viewable by everyone'
  ) THEN
    EXECUTE 'CREATE POLICY "Profile blocks are viewable by everyone" ON public.profile_content_blocks FOR SELECT USING (true)';
  END IF;

  -- profile_content_blocks: owner insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_content_blocks'
      AND policyname='Users can insert own profile blocks'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert own profile blocks" ON public.profile_content_blocks FOR INSERT WITH CHECK (auth.uid() = profile_id)';
  END IF;

  -- profile_content_blocks: owner update
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_content_blocks'
      AND policyname='Users can update own profile blocks'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own profile blocks" ON public.profile_content_blocks FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id)';
  END IF;

  -- profile_content_blocks: owner delete
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_content_blocks'
      AND policyname='Users can delete own profile blocks'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete own profile blocks" ON public.profile_content_blocks FOR DELETE USING (auth.uid() = profile_id)';
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- RPCs (owner-only)
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.set_profile_type(public.profile_type_enum);
CREATE OR REPLACE FUNCTION public.set_profile_type(
  p_profile_type public.profile_type_enum
)
RETURNS public.profile_type_enum
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_profile_type public.profile_type_enum;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  UPDATE public.profiles
  SET profile_type = p_profile_type
  WHERE id = v_uid
  RETURNING profile_type INTO v_profile_type;

  IF v_profile_type IS NULL THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  RETURN v_profile_type;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_profile_type(public.profile_type_enum) TO authenticated;

DROP FUNCTION IF EXISTS public.add_profile_block(text, text, text, jsonb, int);
CREATE OR REPLACE FUNCTION public.add_profile_block(
  p_block_type text,
  p_title text,
  p_url text,
  p_metadata jsonb,
  p_sort_order int
)
RETURNS public.profile_content_blocks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_row public.profile_content_blocks;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  INSERT INTO public.profile_content_blocks(
    profile_id,
    block_type,
    title,
    url,
    metadata,
    sort_order
  )
  VALUES (
    v_uid,
    p_block_type,
    p_title,
    p_url,
    COALESCE(p_metadata, '{}'::jsonb),
    COALESCE(p_sort_order, 0)
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_profile_block(text, text, text, jsonb, int) TO authenticated;

DROP FUNCTION IF EXISTS public.update_profile_block(bigint, text, text, jsonb, int);
CREATE OR REPLACE FUNCTION public.update_profile_block(
  p_id bigint,
  p_title text,
  p_url text,
  p_metadata jsonb,
  p_sort_order int
)
RETURNS public.profile_content_blocks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_row public.profile_content_blocks;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  UPDATE public.profile_content_blocks
  SET
    title = p_title,
    url = p_url,
    metadata = COALESCE(p_metadata, metadata),
    sort_order = COALESCE(p_sort_order, sort_order)
  WHERE id = p_id
    AND profile_id = v_uid
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'not found';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_profile_block(bigint, text, text, jsonb, int) TO authenticated;

DROP FUNCTION IF EXISTS public.delete_profile_block(bigint);
CREATE OR REPLACE FUNCTION public.delete_profile_block(
  p_id bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_deleted int;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  DELETE FROM public.profile_content_blocks
  WHERE id = p_id
    AND profile_id = v_uid;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_profile_block(bigint) TO authenticated;

-- -----------------------------------------------------------------------------
-- Grants (table-level; RLS still enforces ownership)
-- -----------------------------------------------------------------------------

GRANT SELECT ON TABLE public.profile_content_blocks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.profile_content_blocks TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.profile_content_blocks_id_seq TO authenticated;

COMMIT;
