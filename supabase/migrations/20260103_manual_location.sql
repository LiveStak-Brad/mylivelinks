-- ============================================================================
-- MANUAL LOCATION STORAGE + NEARBY DISCOVERY SUPPORT
-- ============================================================================
-- Adds location columns to profiles, lookup/cache tables, resolution helpers,
-- and RPCs for updating locations + querying nearby profiles.
-- Includes indexes for filtering + trigram search support.
-- ============================================================================

BEGIN;

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- ============================================================================
-- 1. PROFILE LOCATION FIELDS
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_zip text,
  ADD COLUMN IF NOT EXISTS location_city text,
  ADD COLUMN IF NOT EXISTS location_region text,
  ADD COLUMN IF NOT EXISTS location_country text NOT NULL DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS location_label text,
  ADD COLUMN IF NOT EXISTS location_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_show_zip boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz NOT NULL DEFAULT timezone('utc', now());

COMMENT ON COLUMN public.profiles.location_zip IS 'User-provided ZIP code (5 digits, not shown unless explicitly enabled).';
COMMENT ON COLUMN public.profiles.location_city IS 'Resolved city derived from ZIP lookup.';
COMMENT ON COLUMN public.profiles.location_region IS 'Resolved region/state derived from ZIP lookup.';
COMMENT ON COLUMN public.profiles.location_country IS 'Country ISO code (defaults to US).';
COMMENT ON COLUMN public.profiles.location_label IS 'Optional custom label (e.g., "St. Louis Metro").';
COMMENT ON COLUMN public.profiles.location_hidden IS 'If true, location is hidden from other users.';
COMMENT ON COLUMN public.profiles.location_show_zip IS 'If true, exact ZIP can be displayed.';
COMMENT ON COLUMN public.profiles.location_updated_at IS 'Timestamp of the last manual location update.';

CREATE INDEX IF NOT EXISTS idx_profiles_location_zip ON public.profiles (location_zip);
CREATE INDEX IF NOT EXISTS idx_profiles_location_region_city ON public.profiles (location_region, location_city);
CREATE INDEX IF NOT EXISTS idx_profiles_location_city_trgm ON public.profiles USING GIN (location_city gin_trgm_ops);

-- ============================================================================
-- 2. LOOKUP + CACHE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.location_zip_lookup (
  zip text PRIMARY KEY,
  city text NOT NULL,
  region text NOT NULL,
  country text NOT NULL DEFAULT 'US',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.location_zip_lookup IS 'Authoritative ZIP -> city/region mapping seeded from USPS data.';

ALTER TABLE public.location_zip_lookup ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'location_zip_lookup'
      AND policyname = 'ZIP lookup readable by all'
  ) THEN
    CREATE POLICY "ZIP lookup readable by all"
      ON public.location_zip_lookup
      FOR SELECT
      USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.location_zip_cache (
  zip text PRIMARY KEY,
  city text NOT NULL,
  region text NOT NULL,
  country text NOT NULL DEFAULT 'US',
  source text NOT NULL DEFAULT 'api',
  last_verified timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.location_zip_cache IS 'Cache for API-resolved ZIP lookups with last Verified timestamps.';

ALTER TABLE public.location_zip_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'location_zip_cache'
      AND policyname = 'ZIP cache readable by all'
  ) THEN
    CREATE POLICY "ZIP cache readable by all"
      ON public.location_zip_cache
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- ============================================================================
-- 3. HELPERS FOR ZIP NORMALIZATION + RESOLUTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalize_zip(p_zip text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_clean text;
BEGIN
  IF p_zip IS NULL THEN
    RETURN NULL;
  END IF;

  v_clean := regexp_replace(p_zip, '[^0-9]', '', 'g');

  IF v_clean = '' THEN
    RETURN NULL;
  END IF;

  IF length(v_clean) >= 5 THEN
    RETURN substring(v_clean FROM 1 FOR 5);
  END IF;

  RETURN lpad(v_clean, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_zip_location(p_zip text)
RETURNS TABLE(resolved_zip text, city text, region text, country text, source text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
SET row_security = off
AS $$
DECLARE
  v_zip text;
  v_city text;
  v_region text;
  v_country text;
  v_source text;
  v_response http_response;
  v_body jsonb;
BEGIN
  v_zip := public.normalize_zip(p_zip);
  IF v_zip IS NULL THEN
    RAISE EXCEPTION 'invalid_zip';
  END IF;

  SELECT l.zip, l.city, l.region, l.country, 'lookup'
  INTO resolved_zip, city, region, country, source
  FROM public.location_zip_lookup l
  WHERE l.zip = v_zip;

  IF FOUND THEN
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT c.zip, c.city, c.region, c.country, c.source
  INTO resolved_zip, city, region, country, source
  FROM public.location_zip_cache c
  WHERE c.zip = v_zip;

  IF FOUND THEN
    UPDATE public.location_zip_cache
      SET last_verified = timezone('utc', now())
      WHERE location_zip_cache.zip = v_zip;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT * INTO v_response
  FROM http_get('https://api.zippopotam.us/us/' || v_zip);

  IF v_response.status <> 200 THEN
    RAISE EXCEPTION 'zip_not_found';
  END IF;

  v_body := v_response.content::jsonb;

  v_city := upper(trim((v_body -> 'places' -> 0 ->> 'place name')));
  v_region := upper(trim((v_body -> 'places' -> 0 ->> 'state abbreviation')));
  v_country := upper(trim(v_body ->> 'country abbreviation'));

  IF v_city IS NULL OR v_region IS NULL OR v_country IS NULL THEN
    RAISE EXCEPTION 'zip_lookup_failed';
  END IF;

  INSERT INTO public.location_zip_cache (zip, city, region, country, source, last_verified)
  VALUES (v_zip, v_city, v_region, COALESCE(v_country, 'US'), 'api', timezone('utc', now()))
  ON CONFLICT (zip) DO UPDATE
    SET city = EXCLUDED.city,
        region = EXCLUDED.region,
        country = EXCLUDED.country,
        source = EXCLUDED.source,
        last_verified = timezone('utc', now());

  resolved_zip := v_zip;
  city := v_city;
  region := v_region;
  country := COALESCE(v_country, 'US');
  source := 'api';
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_zip_location(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_zip_location(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_zip_location(text) TO authenticated;

-- ============================================================================
-- 4. RPC: UPDATE PROFILE LOCATION
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_update_profile_location(text, text, boolean, boolean);
CREATE OR REPLACE FUNCTION public.rpc_update_profile_location(
  p_zip text,
  p_label text DEFAULT NULL,
  p_hide boolean DEFAULT false,
  p_show_zip boolean DEFAULT false
)
RETURNS TABLE(
  profile_id uuid,
  location_zip text,
  location_city text,
  location_region text,
  location_country text,
  location_label text,
  location_hidden boolean,
  location_show_zip boolean,
  location_updated_at timestamptz,
  resolved_source text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_zip text;
  v_city text;
  v_region text;
  v_country text;
  v_source text;
  v_label text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT r.resolved_zip, r.city, r.region, r.country, r.source
  INTO v_zip, v_city, v_region, v_country, v_source
  FROM public.resolve_zip_location(p_zip) r;

  v_label := NULLIF(trim(coalesce(p_label, '')), '');

  UPDATE public.profiles AS p
  SET
    location_zip = v_zip,
    location_city = v_city,
    location_region = v_region,
    location_country = v_country,
    location_label = v_label,
    location_hidden = COALESCE(p_hide, false),
    location_show_zip = COALESCE(p_show_zip, false),
    location_updated_at = timezone('utc', now())
  WHERE p.id = v_user_id
  RETURNING
    p.id,
    p.location_zip,
    p.location_city,
    p.location_region,
    p.location_country,
    p.location_label,
    p.location_hidden,
    p.location_show_zip,
    p.location_updated_at
  INTO profile_id,
       location_zip,
       location_city,
       location_region,
       location_country,
       location_label,
       location_hidden,
       location_show_zip,
       location_updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  resolved_source := v_source;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_update_profile_location(text, text, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_update_profile_location(text, text, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_update_profile_location(text, text, boolean, boolean) TO service_role;

-- ============================================================================
-- 5. RPC: NEARBY PROFILES
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_profiles_nearby(uuid, text, text, integer);
CREATE OR REPLACE FUNCTION public.rpc_profiles_nearby(
  p_profile_id uuid DEFAULT auth.uid(),
  p_mode text DEFAULT 'region',
  p_value text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  profile_id uuid,
  username text,
  display_name text,
  avatar_url text,
  location_label text,
  location_city text,
  location_region text,
  location_zip text,
  location_country text,
  location_hidden boolean,
  location_show_zip boolean,
  location_updated_at timestamptz,
  is_self boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_zip text;
  v_base_city text;
  v_base_region text;
  v_base_country text;
  v_mode text := lower(coalesce(p_mode, 'region'));
  v_target_value text := NULLIF(trim(coalesce(p_value, '')), '');
  v_actor uuid := auth.uid();
  v_subject uuid := COALESCE(p_profile_id, auth.uid());
BEGIN
  IF v_mode NOT IN ('zip', 'city', 'region') THEN
    v_mode := 'region';
  END IF;

  IF v_target_value IS NOT NULL THEN
    IF v_mode = 'zip' THEN
      SELECT r.resolved_zip, r.city, r.region, r.country
      INTO v_base_zip, v_base_city, v_base_region, v_base_country
      FROM public.resolve_zip_location(v_target_value) r;
    ELSIF v_mode = 'city' THEN
      v_base_city := upper(split_part(v_target_value, ',', 1));
      v_base_region := upper(split_part(v_target_value, ',', 2));
      IF v_base_region IS NULL OR v_base_region = '' THEN
        RAISE EXCEPTION 'city_requires_region';
      END IF;
      v_base_country := 'US';
    ELSE
      v_base_region := upper(v_target_value);
      v_base_country := 'US';
    END IF;
  ELSE
    SELECT
      p.location_zip,
      p.location_city,
      p.location_region,
      p.location_country
    INTO
      v_base_zip,
      v_base_city,
      v_base_region,
      v_base_country
    FROM public.profiles p
    WHERE p.id = v_subject;

    IF v_base_zip IS NULL AND v_base_city IS NULL AND v_base_region IS NULL THEN
      RAISE EXCEPTION 'location_not_set';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    pr.id,
    pr.username,
    pr.display_name,
    pr.avatar_url,
    pr.location_label,
    pr.location_city,
    pr.location_region,
    pr.location_zip,
    pr.location_country,
    pr.location_hidden,
    pr.location_show_zip,
    pr.location_updated_at,
    pr.id = v_actor AS is_self
  FROM public.profiles pr
  WHERE
    pr.location_zip IS NOT NULL
    AND pr.location_city IS NOT NULL
    AND pr.location_region IS NOT NULL
    AND pr.location_hidden IS NOT TRUE
    AND (
      (v_mode = 'zip' AND pr.location_zip = v_base_zip)
      OR (v_mode = 'city' AND pr.location_city = v_base_city AND pr.location_region = v_base_region)
      OR (v_mode = 'region' AND pr.location_region = v_base_region)
    )
  ORDER BY pr.location_updated_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(p_limit, 1), 200);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_profiles_nearby(uuid, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_profiles_nearby(uuid, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_profiles_nearby(uuid, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_profiles_nearby(uuid, text, text, integer) TO anon;

-- ============================================================================
-- 6. VERIFICATION QUERIES (run manually after applying migration)
-- ============================================================================
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'profiles' AND column_name LIKE 'location_%';
-- EXPECTED: 8 new columns listed above.
--
-- SELECT COUNT(*) FROM public.location_zip_lookup;
-- EXPECTED: > 0 once seed script is executed.
--
-- EXPLAIN ANALYZE SELECT * FROM public.profiles
--   WHERE location_region = 'CA' AND location_city = 'LOS ANGELES';
-- EXPECTED: Uses idx_profiles_location_region_city.

COMMIT;
