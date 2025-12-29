BEGIN;

-- ============================================================================
-- LOGIC AGENT 3 — Profile Portfolio (Business + Creator)
-- ============================================================================
-- Creates dedicated profile_portfolio table with media support (image/video/link),
-- RPCs for CRUD + reordering, and RLS policies.
-- ============================================================================

-- 1) Create profile_portfolio table
CREATE TABLE IF NOT EXISTS public.profile_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  title text NULL,
  subtitle text NULL,
  description text NULL,

  media_type text NOT NULL,
  media_url text NOT NULL,
  thumbnail_url text NULL,

  sort_order int NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT profile_portfolio_media_type_check CHECK (media_type IN ('image','video','link'))
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_profile_portfolio_profile_sort
  ON public.profile_portfolio(profile_id, sort_order);

-- 3) updated_at trigger
DROP TRIGGER IF EXISTS trg_profile_portfolio_set_updated_at ON public.profile_portfolio;
CREATE TRIGGER trg_profile_portfolio_set_updated_at
BEFORE UPDATE ON public.profile_portfolio
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE public.profile_portfolio ENABLE ROW LEVEL SECURITY;

-- SELECT: public readable
DROP POLICY IF EXISTS "Profile portfolio is viewable by everyone" ON public.profile_portfolio;
CREATE POLICY "Profile portfolio is viewable by everyone"
  ON public.profile_portfolio
  FOR SELECT
  USING (true);

-- INSERT: owner only
DROP POLICY IF EXISTS "Users can insert own profile portfolio items" ON public.profile_portfolio;
CREATE POLICY "Users can insert own profile portfolio items"
  ON public.profile_portfolio
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- UPDATE: owner only
DROP POLICY IF EXISTS "Users can update own profile portfolio items" ON public.profile_portfolio;
CREATE POLICY "Users can update own profile portfolio items"
  ON public.profile_portfolio
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- DELETE: owner only
DROP POLICY IF EXISTS "Users can delete own profile portfolio items" ON public.profile_portfolio;
CREATE POLICY "Users can delete own profile portfolio items"
  ON public.profile_portfolio
  FOR DELETE
  USING (auth.uid() = profile_id);

-- ============================================================================
-- RPCs (Canonical for Web + Mobile)
-- ============================================================================

-- RPC: get_profile_portfolio
-- Returns all portfolio items for a profile, ordered by sort_order
DROP FUNCTION IF EXISTS public.get_profile_portfolio(uuid);
CREATE OR REPLACE FUNCTION public.get_profile_portfolio(
  p_profile_id uuid
)
RETURNS TABLE (
  id uuid,
  profile_id uuid,
  title text,
  subtitle text,
  description text,
  media_type text,
  media_url text,
  thumbnail_url text,
  sort_order int,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.id,
    pp.profile_id,
    pp.title,
    pp.subtitle,
    pp.description,
    pp.media_type,
    pp.media_url,
    pp.thumbnail_url,
    pp.sort_order,
    pp.created_at,
    pp.updated_at
  FROM public.profile_portfolio pp
  WHERE pp.profile_id = p_profile_id
  ORDER BY pp.sort_order ASC, pp.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_portfolio(uuid) TO anon, authenticated;

-- RPC: upsert_profile_portfolio_item
-- Owner only: insert new item or update existing item
DROP FUNCTION IF EXISTS public.upsert_profile_portfolio_item(jsonb);
CREATE OR REPLACE FUNCTION public.upsert_profile_portfolio_item(
  p_item jsonb
)
RETURNS public.profile_portfolio
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_item_id uuid;
  v_result public.profile_portfolio;
  v_media_type text;
  v_media_url text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_item_id := NULLIF(p_item->>'id', '')::uuid;
  v_media_type := NULLIF(p_item->>'media_type', '');
  v_media_url := NULLIF(p_item->>'media_url', '');

  IF v_item_id IS NOT NULL THEN
    -- UPDATE
    UPDATE public.profile_portfolio
    SET
      title = CASE WHEN p_item ? 'title' THEN p_item->>'title' ELSE title END,
      subtitle = CASE WHEN p_item ? 'subtitle' THEN p_item->>'subtitle' ELSE subtitle END,
      description = CASE WHEN p_item ? 'description' THEN p_item->>'description' ELSE description END,
      media_type = CASE WHEN p_item ? 'media_type' THEN p_item->>'media_type' ELSE media_type END,
      media_url = CASE WHEN p_item ? 'media_url' THEN p_item->>'media_url' ELSE media_url END,
      thumbnail_url = CASE WHEN p_item ? 'thumbnail_url' THEN p_item->>'thumbnail_url' ELSE thumbnail_url END,
      sort_order = CASE WHEN p_item ? 'sort_order' THEN (p_item->>'sort_order')::int ELSE sort_order END
    WHERE id = v_item_id
      AND profile_id = v_uid
    RETURNING * INTO v_result;

    IF v_result.id IS NULL THEN
      RAISE EXCEPTION 'portfolio item not found or unauthorized';
    END IF;
  ELSE
    -- INSERT
    IF v_media_type IS NULL OR v_media_type NOT IN ('image','video','link') THEN
      RAISE EXCEPTION 'invalid media_type';
    END IF;
    IF v_media_url IS NULL THEN
      RAISE EXCEPTION 'media_url is required';
    END IF;

    INSERT INTO public.profile_portfolio (
      profile_id,
      title,
      subtitle,
      description,
      media_type,
      media_url,
      thumbnail_url,
      sort_order
    )
    VALUES (
      v_uid,
      NULLIF(p_item->>'title', ''),
      NULLIF(p_item->>'subtitle', ''),
      NULLIF(p_item->>'description', ''),
      v_media_type,
      v_media_url,
      NULLIF(p_item->>'thumbnail_url', ''),
      COALESCE(NULLIF(p_item->>'sort_order', '')::int, 0)
    )
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_profile_portfolio_item(jsonb) TO authenticated;

-- RPC: delete_profile_portfolio_item
-- Owner only: delete item by id
DROP FUNCTION IF EXISTS public.delete_profile_portfolio_item(uuid);
CREATE OR REPLACE FUNCTION public.delete_profile_portfolio_item(
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

  DELETE FROM public.profile_portfolio
  WHERE id = p_item_id
    AND profile_id = v_uid;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'portfolio item not found or unauthorized';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_profile_portfolio_item(uuid) TO authenticated;

-- RPC: reorder_profile_portfolio
-- Owner only: reorder items by providing ordered array of IDs
DROP FUNCTION IF EXISTS public.reorder_profile_portfolio(uuid, uuid[]);
CREATE OR REPLACE FUNCTION public.reorder_profile_portfolio(
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
  FROM public.profile_portfolio
  WHERE profile_id = p_profile_id
    AND id = ANY(p_ordered_ids);

  IF v_owned <> v_expected THEN
    RAISE EXCEPTION 'invalid reorder set';
  END IF;

  WITH input AS (
    SELECT x.id, x.ord
    FROM unnest(p_ordered_ids) WITH ORDINALITY AS x(id, ord)
  )
  UPDATE public.profile_portfolio t
  SET sort_order = (input.ord - 1)
  FROM input
  WHERE t.id = input.id
    AND t.profile_id = p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_profile_portfolio(uuid, uuid[]) TO authenticated;

-- ============================================================================
-- Grants
-- ============================================================================

GRANT SELECT ON TABLE public.profile_portfolio TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.profile_portfolio TO authenticated;

COMMIT;





