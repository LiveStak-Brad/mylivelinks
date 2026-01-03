-- ====================================================================
-- MANUAL LOCATION RPC DEFINITIONS (re-runnable)
-- Apply via Supabase SQL editor to refresh functions without replaying
-- the entire migration.
-- ====================================================================

BEGIN;

SET search_path = public, extensions;

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

GRANT EXECUTE ON FUNCTION public.resolve_zip_location(text) TO authenticated, service_role;

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

GRANT EXECUTE ON FUNCTION public.rpc_update_profile_location(text, text, boolean, boolean) TO authenticated, service_role;

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

GRANT EXECUTE ON FUNCTION public.rpc_profiles_nearby(uuid, text, text, integer) TO authenticated, service_role, anon;

COMMIT;
