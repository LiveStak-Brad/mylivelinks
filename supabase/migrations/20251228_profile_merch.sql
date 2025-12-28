BEGIN;

-- ============================================================================
-- LOGIC AGENT 2 — Profile Types: Merchandise (DB + RPC)
-- ============================================================================
-- Creates dedicated profile_merch table with ordering + featured flag,
-- public read access, owner-only writes, updated_at trigger,
-- and canonical RPCs for web + mobile.
-- ============================================================================

-- 1) Create profile_merch table
CREATE TABLE IF NOT EXISTS public.profile_merch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  name text NOT NULL,
  price_cents int NULL,
  currency text NOT NULL DEFAULT 'USD',
  url text NULL,
  image_url text NULL,
  description text NULL,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_profile_merch_profile_sort
  ON public.profile_merch(profile_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_profile_merch_profile_featured_sort
  ON public.profile_merch(profile_id, is_featured DESC, sort_order);

-- 3) updated_at trigger
DROP TRIGGER IF EXISTS trg_profile_merch_set_updated_at ON public.profile_merch;
CREATE TRIGGER trg_profile_merch_set_updated_at
BEFORE UPDATE ON public.profile_merch
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE public.profile_merch ENABLE ROW LEVEL SECURITY;

-- SELECT: public readable
DROP POLICY IF EXISTS "Profile merch is viewable by everyone" ON public.profile_merch;
CREATE POLICY "Profile merch is viewable by everyone"
  ON public.profile_merch
  FOR SELECT
  USING (true);

-- INSERT: owner only
DROP POLICY IF EXISTS "Users can insert own profile merch" ON public.profile_merch;
CREATE POLICY "Users can insert own profile merch"
  ON public.profile_merch
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- UPDATE: owner only
DROP POLICY IF EXISTS "Users can update own profile merch" ON public.profile_merch;
CREATE POLICY "Users can update own profile merch"
  ON public.profile_merch
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- DELETE: owner only
DROP POLICY IF EXISTS "Users can delete own profile merch" ON public.profile_merch;
CREATE POLICY "Users can delete own profile merch"
  ON public.profile_merch
  FOR DELETE
  USING (auth.uid() = profile_id);

-- ============================================================================
-- RPCs (Canonical for Web + Mobile)
-- ============================================================================

-- RPC: get_profile_merch
DROP FUNCTION IF EXISTS public.get_profile_merch(uuid);
CREATE OR REPLACE FUNCTION public.get_profile_merch(
  p_profile_id uuid
)
RETURNS SETOF public.profile_merch
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.profile_merch
  WHERE profile_id = p_profile_id
  ORDER BY sort_order ASC, id ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_merch(uuid) TO anon, authenticated;

-- RPC: upsert_profile_merch_item (insert/update)
DROP FUNCTION IF EXISTS public.upsert_profile_merch_item(jsonb);
CREATE OR REPLACE FUNCTION public.upsert_profile_merch_item(
  p_item jsonb
)
RETURNS public.profile_merch
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_item_id uuid;
  v_row public.profile_merch;
  v_name text;
  v_currency text;
  v_price_cents int;
  v_url text;
  v_image_url text;
  v_description text;
  v_is_featured boolean;
  v_sort_order int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_item_id := NULLIF(TRIM(COALESCE(p_item->>'id', '')), '')::uuid;
  v_name := NULLIF(TRIM(COALESCE(p_item->>'name', '')), '');
  v_currency := NULLIF(TRIM(COALESCE(p_item->>'currency', '')), '');
  v_price_cents := CASE
    WHEN p_item ? 'price_cents' THEN NULLIF(TRIM(COALESCE(p_item->>'price_cents', '')), '')::int
    ELSE NULL
  END;
  v_url := CASE WHEN p_item ? 'url' THEN NULLIF(TRIM(COALESCE(p_item->>'url', '')), '') ELSE NULL END;
  v_image_url := CASE WHEN p_item ? 'image_url' THEN NULLIF(TRIM(COALESCE(p_item->>'image_url', '')), '') ELSE NULL END;
  v_description := CASE WHEN p_item ? 'description' THEN NULLIF(TRIM(COALESCE(p_item->>'description', '')), '') ELSE NULL END;
  v_is_featured := CASE
    WHEN p_item ? 'is_featured' THEN (p_item->>'is_featured')::boolean
    ELSE NULL
  END;
  v_sort_order := CASE
    WHEN p_item ? 'sort_order' THEN (p_item->>'sort_order')::int
    ELSE NULL
  END;

  IF v_item_id IS NULL THEN
    IF v_name IS NULL THEN
      RAISE EXCEPTION 'name is required';
    END IF;

    INSERT INTO public.profile_merch (
      profile_id,
      name,
      price_cents,
      currency,
      url,
      image_url,
      description,
      is_featured,
      sort_order
    )
    VALUES (
      v_uid,
      v_name,
      v_price_cents,
      COALESCE(v_currency, 'USD'),
      v_url,
      v_image_url,
      v_description,
      COALESCE(v_is_featured, false),
      COALESCE(v_sort_order, 0)
    )
    RETURNING * INTO v_row;

    RETURN v_row;
  END IF;

  UPDATE public.profile_merch
  SET
    name = COALESCE(v_name, name),
    price_cents = CASE WHEN p_item ? 'price_cents' THEN v_price_cents ELSE price_cents END,
    currency = COALESCE(v_currency, currency),
    url = CASE WHEN p_item ? 'url' THEN v_url ELSE url END,
    image_url = CASE WHEN p_item ? 'image_url' THEN v_image_url ELSE image_url END,
    description = CASE WHEN p_item ? 'description' THEN v_description ELSE description END,
    is_featured = COALESCE(v_is_featured, is_featured),
    sort_order = COALESCE(v_sort_order, sort_order)
  WHERE id = v_item_id
    AND profile_id = v_uid
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'item not found or unauthorized';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_profile_merch_item(jsonb) TO authenticated;

-- RPC: delete_profile_merch_item
DROP FUNCTION IF EXISTS public.delete_profile_merch_item(uuid);
CREATE OR REPLACE FUNCTION public.delete_profile_merch_item(
  p_item_id uuid
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

  DELETE FROM public.profile_merch
  WHERE id = p_item_id
    AND profile_id = v_uid;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'item not found or unauthorized';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_profile_merch_item(uuid) TO authenticated;

-- RPC: reorder_profile_merch
DROP FUNCTION IF EXISTS public.reorder_profile_merch(uuid, uuid[]);
CREATE OR REPLACE FUNCTION public.reorder_profile_merch(
  p_profile_id uuid,
  p_ordered_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_expected int;
  v_distinct int;
  v_nulls int;
  v_owned int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF v_uid != p_profile_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  WITH input AS (
    SELECT x.id, x.ord
    FROM unnest(p_ordered_ids) WITH ORDINALITY AS x(id, ord)
  )
  SELECT
    count(*)::int,
    count(distinct id)::int,
    count(*) FILTER (WHERE id IS NULL)::int
  INTO v_expected, v_distinct, v_nulls
  FROM input;

  IF COALESCE(v_expected, 0) = 0 THEN
    RETURN;
  END IF;
  IF COALESCE(v_nulls, 0) > 0 THEN
    RAISE EXCEPTION 'null ids in reorder list';
  END IF;
  IF v_expected <> v_distinct THEN
    RAISE EXCEPTION 'duplicate ids in reorder list';
  END IF;

  SELECT count(*)::int
  INTO v_owned
  FROM public.profile_merch
  WHERE profile_id = p_profile_id
    AND id = ANY(p_ordered_ids);

  IF v_owned <> v_expected THEN
    RAISE EXCEPTION 'invalid reorder set';
  END IF;

  WITH input AS (
    SELECT x.id, x.ord
    FROM unnest(p_ordered_ids) WITH ORDINALITY AS x(id, ord)
  )
  UPDATE public.profile_merch t
  SET sort_order = (input.ord - 1)
  FROM input
  WHERE t.id = input.id
    AND t.profile_id = p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_profile_merch(uuid, uuid[]) TO authenticated;

-- Grants
GRANT SELECT ON TABLE public.profile_merch TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.profile_merch TO authenticated;

COMMIT;


