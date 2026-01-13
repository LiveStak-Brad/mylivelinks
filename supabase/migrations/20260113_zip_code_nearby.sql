-- ============================================================================
-- ZIP CODE NEARBY FEATURE
-- Adds zip_code column to posts and creates lookup table for nearby filtering
-- ============================================================================

-- Add zip_code column to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- Create index for zip code lookups
CREATE INDEX IF NOT EXISTS idx_posts_zip_code ON public.posts(zip_code) WHERE zip_code IS NOT NULL;

-- ============================================================================
-- ZIP CODE LOOKUP TABLE
-- Contains US zip codes with lat/lng for distance calculations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.zip_codes (
  zip_code TEXT PRIMARY KEY,
  city TEXT,
  state_code TEXT,
  state_name TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timezone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index for distance queries
CREATE INDEX IF NOT EXISTS idx_zip_codes_lat_lng ON public.zip_codes(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_zip_codes_state ON public.zip_codes(state_code);

-- ============================================================================
-- FUNCTION: Get nearby zip codes within radius
-- Returns zip codes within X miles of a given zip code
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_nearby_zip_codes(
  p_zip_code TEXT,
  p_radius_miles INTEGER DEFAULT 50
)
RETURNS TABLE (
  zip_code TEXT,
  city TEXT,
  state_code TEXT,
  distance_miles DECIMAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lat DECIMAL(10, 8);
  v_lng DECIMAL(11, 8);
BEGIN
  -- Get coordinates for the input zip code
  SELECT latitude, longitude INTO v_lat, v_lng
  FROM public.zip_codes
  WHERE zip_codes.zip_code = p_zip_code;
  
  IF v_lat IS NULL THEN
    RETURN;
  END IF;
  
  -- Return nearby zip codes using Haversine formula
  RETURN QUERY
  SELECT 
    z.zip_code,
    z.city,
    z.state_code,
    (3959 * acos(
      cos(radians(v_lat)) * cos(radians(z.latitude)) 
      * cos(radians(z.longitude) - radians(v_lng)) 
      + sin(radians(v_lat)) * sin(radians(z.latitude))
    ))::DECIMAL AS distance_miles
  FROM public.zip_codes z
  WHERE z.latitude BETWEEN v_lat - (p_radius_miles / 69.0) AND v_lat + (p_radius_miles / 69.0)
    AND z.longitude BETWEEN v_lng - (p_radius_miles / 54.6) AND v_lng + (p_radius_miles / 54.6)
    AND (3959 * acos(
      cos(radians(v_lat)) * cos(radians(z.latitude)) 
      * cos(radians(z.longitude) - radians(v_lng)) 
      + sin(radians(v_lat)) * sin(radians(z.latitude))
    )) <= p_radius_miles
  ORDER BY distance_miles;
END;
$$;

-- ============================================================================
-- UPDATE: rpc_create_video_post to include zip_code
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_create_video_post(text, text, text, text[], text, text, boolean);

CREATE OR REPLACE FUNCTION public.rpc_create_video_post(
  p_media_url text,
  p_title text DEFAULT NULL,
  p_caption text DEFAULT NULL,
  p_hashtags text[] DEFAULT NULL,
  p_location_text text DEFAULT NULL,
  p_zip_code text DEFAULT NULL,
  p_thumbnail_url text DEFAULT NULL,
  p_is_vlog boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_post_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  INSERT INTO public.posts (
    author_id,
    text_content,
    media_url,
    media_type,
    title,
    hashtags,
    location_text,
    zip_code,
    thumbnail_url,
    is_vlog,
    visibility
  ) VALUES (
    v_user_id,
    p_caption,
    p_media_url,
    'video',
    p_title,
    p_hashtags,
    p_location_text,
    p_zip_code,
    p_thumbnail_url,
    p_is_vlog,
    'public'
  )
  RETURNING id INTO v_post_id;

  RETURN jsonb_build_object(
    'success', true,
    'post_id', v_post_id
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_nearby_zip_codes(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_video_post(TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- ============================================================================
-- SAMPLE ZIP CODES (for testing - you'll want to load full dataset)
-- Full US zip code data can be loaded from: https://simplemaps.com/data/us-zips
-- ============================================================================

INSERT INTO public.zip_codes (zip_code, city, state_code, state_name, latitude, longitude, timezone) VALUES
('10001', 'New York', 'NY', 'New York', 40.7484, -73.9967, 'America/New_York'),
('10002', 'New York', 'NY', 'New York', 40.7157, -73.9863, 'America/New_York'),
('10003', 'New York', 'NY', 'New York', 40.7317, -73.9892, 'America/New_York'),
('10004', 'New York', 'NY', 'New York', 40.6988, -74.0408, 'America/New_York'),
('10005', 'New York', 'NY', 'New York', 40.7069, -74.0089, 'America/New_York'),
('10006', 'New York', 'NY', 'New York', 40.7094, -74.0131, 'America/New_York'),
('10007', 'New York', 'NY', 'New York', 40.7135, -74.0078, 'America/New_York'),
('10010', 'New York', 'NY', 'New York', 40.7390, -73.9826, 'America/New_York'),
('10011', 'New York', 'NY', 'New York', 40.7418, -74.0002, 'America/New_York'),
('10012', 'New York', 'NY', 'New York', 40.7258, -73.9981, 'America/New_York'),
('90001', 'Los Angeles', 'CA', 'California', 33.9425, -118.2551, 'America/Los_Angeles'),
('90002', 'Los Angeles', 'CA', 'California', 33.9490, -118.2470, 'America/Los_Angeles'),
('90003', 'Los Angeles', 'CA', 'California', 33.9640, -118.2730, 'America/Los_Angeles'),
('90004', 'Los Angeles', 'CA', 'California', 34.0762, -118.3089, 'America/Los_Angeles'),
('90005', 'Los Angeles', 'CA', 'California', 34.0590, -118.3010, 'America/Los_Angeles'),
('90006', 'Los Angeles', 'CA', 'California', 34.0480, -118.2920, 'America/Los_Angeles'),
('90007', 'Los Angeles', 'CA', 'California', 34.0290, -118.2830, 'America/Los_Angeles'),
('90008', 'Los Angeles', 'CA', 'California', 34.0110, -118.3410, 'America/Los_Angeles'),
('90010', 'Los Angeles', 'CA', 'California', 34.0603, -118.3153, 'America/Los_Angeles'),
('90011', 'Los Angeles', 'CA', 'California', 33.9890, -118.2580, 'America/Los_Angeles'),
('60601', 'Chicago', 'IL', 'Illinois', 41.8862, -87.6186, 'America/Chicago'),
('60602', 'Chicago', 'IL', 'Illinois', 41.8831, -87.6288, 'America/Chicago'),
('60603', 'Chicago', 'IL', 'Illinois', 41.8798, -87.6264, 'America/Chicago'),
('60604', 'Chicago', 'IL', 'Illinois', 41.8780, -87.6298, 'America/Chicago'),
('60605', 'Chicago', 'IL', 'Illinois', 41.8665, -87.6188, 'America/Chicago'),
('60606', 'Chicago', 'IL', 'Illinois', 41.8826, -87.6388, 'America/Chicago'),
('60607', 'Chicago', 'IL', 'Illinois', 41.8724, -87.6558, 'America/Chicago'),
('60608', 'Chicago', 'IL', 'Illinois', 41.8518, -87.6698, 'America/Chicago'),
('60609', 'Chicago', 'IL', 'Illinois', 41.8098, -87.6538, 'America/Chicago'),
('60610', 'Chicago', 'IL', 'Illinois', 41.9038, -87.6358, 'America/Chicago'),
('77001', 'Houston', 'TX', 'Texas', 29.7545, -95.3536, 'America/Chicago'),
('77002', 'Houston', 'TX', 'Texas', 29.7545, -95.3625, 'America/Chicago'),
('77003', 'Houston', 'TX', 'Texas', 29.7445, -95.3425, 'America/Chicago'),
('77004', 'Houston', 'TX', 'Texas', 29.7245, -95.3625, 'America/Chicago'),
('77005', 'Houston', 'TX', 'Texas', 29.7145, -95.4225, 'America/Chicago'),
('77006', 'Houston', 'TX', 'Texas', 29.7445, -95.3925, 'America/Chicago'),
('77007', 'Houston', 'TX', 'Texas', 29.7745, -95.4025, 'America/Chicago'),
('77008', 'Houston', 'TX', 'Texas', 29.7945, -95.4125, 'America/Chicago'),
('77009', 'Houston', 'TX', 'Texas', 29.7945, -95.3625, 'America/Chicago'),
('77010', 'Houston', 'TX', 'Texas', 29.7545, -95.3536, 'America/Chicago'),
('33101', 'Miami', 'FL', 'Florida', 25.7743, -80.1937, 'America/New_York'),
('33102', 'Miami', 'FL', 'Florida', 25.7743, -80.1937, 'America/New_York'),
('33109', 'Miami Beach', 'FL', 'Florida', 25.7617, -80.1300, 'America/New_York'),
('33125', 'Miami', 'FL', 'Florida', 25.7743, -80.2384, 'America/New_York'),
('33126', 'Miami', 'FL', 'Florida', 25.7743, -80.3084, 'America/New_York'),
('33127', 'Miami', 'FL', 'Florida', 25.8143, -80.1984, 'America/New_York'),
('33128', 'Miami', 'FL', 'Florida', 25.7743, -80.1984, 'America/New_York'),
('33129', 'Miami', 'FL', 'Florida', 25.7543, -80.2084, 'America/New_York'),
('33130', 'Miami', 'FL', 'Florida', 25.7643, -80.2084, 'America/New_York'),
('33131', 'Miami', 'FL', 'Florida', 25.7643, -80.1884, 'America/New_York')
ON CONFLICT (zip_code) DO NOTHING;

-- ============================================================================
-- NOTE: For production, load full US zip code dataset
-- You can download free zip code data from:
-- https://simplemaps.com/data/us-zips (free tier available)
-- Then run: COPY public.zip_codes FROM '/path/to/uszips.csv' WITH CSV HEADER;
-- ============================================================================

-- ============================================================================
-- UPDATE: rpc_get_watch_feed to support nearby filtering
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid);

CREATE OR REPLACE FUNCTION public.rpc_get_watch_feed(
  p_mode text DEFAULT 'all',        -- 'all' | 'live_only' | 'video_only'
  p_tab text DEFAULT 'for_you',     -- 'trending' | 'new' | 'nearby' | 'following' | 'for_you'
  p_limit integer DEFAULT 20,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL
)
RETURNS TABLE (
  item_id uuid,
  item_type text,
  post_id uuid,
  title text,
  caption text,
  hashtags text[],
  location_text text,
  media_url text,
  thumbnail_url text,
  created_at timestamptz,
  author_id uuid,
  author_username text,
  author_display_name text,
  author_avatar_url text,
  author_is_verified boolean,
  like_count bigint,
  comment_count bigint,
  favorite_count bigint,
  share_count bigint,
  repost_count bigint,
  view_count bigint,
  viewer_count integer,
  is_liked boolean,
  is_favorited boolean,
  is_reposted boolean,
  is_following boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_zip TEXT;
  v_nearby_zips TEXT[];
BEGIN
  -- Get user's zip code for nearby filtering
  IF p_tab = 'nearby' THEN
    SELECT zip_code INTO v_user_zip
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- Get nearby zip codes (within 50 miles)
    IF v_user_zip IS NOT NULL THEN
      SELECT ARRAY_AGG(nz.zip_code) INTO v_nearby_zips
      FROM public.get_nearby_zip_codes(v_user_zip, 50) nz;
    END IF;
  END IF;

  RETURN QUERY
  WITH viewer_likes AS (
    SELECT pl.post_id FROM public.post_likes pl WHERE pl.profile_id = auth.uid()
  ),
  viewer_favorites AS (
    SELECT pf.post_id FROM public.post_favorites pf WHERE pf.profile_id = auth.uid()
  ),
  viewer_reposts AS (
    SELECT pr.post_id FROM public.post_reposts pr WHERE pr.profile_id = auth.uid()
  ),
  viewer_following AS (
    SELECT f.followee_id FROM public.follows f WHERE f.follower_id = auth.uid()
  ),
  video_posts AS (
    SELECT
      p.id AS item_id,
      'video'::text AS item_type,
      p.id AS post_id,
      p.title,
      p.text_content AS caption,
      p.hashtags,
      p.location_text,
      p.media_url,
      p.thumbnail_url,
      p.created_at,
      prof.id AS author_id,
      prof.username AS author_username,
      COALESCE(prof.display_name, prof.username) AS author_display_name,
      prof.avatar_url AS author_avatar_url,
      COALESCE(prof.kyc_verified, false) AS author_is_verified,
      COALESCE(p.likes_count, p.like_count, 0)::bigint AS like_count,
      COALESCE(p.comment_count, 0)::bigint AS comment_count,
      COALESCE(p.favorite_count, 0)::bigint AS favorite_count,
      COALESCE(p.share_count, 0)::bigint AS share_count,
      COALESCE(p.repost_count, 0)::bigint AS repost_count,
      COALESCE(p.views_count, 0)::bigint AS view_count,
      0::integer AS viewer_count,
      EXISTS(SELECT 1 FROM viewer_likes vl WHERE vl.post_id = p.id) AS is_liked,
      EXISTS(SELECT 1 FROM viewer_favorites vf WHERE vf.post_id = p.id) AS is_favorited,
      EXISTS(SELECT 1 FROM viewer_reposts vr WHERE vr.post_id = p.id) AS is_reposted,
      EXISTS(SELECT 1 FROM viewer_following vf WHERE vf.followee_id = prof.id) AS is_following
    FROM public.posts p
    JOIN public.profiles prof ON prof.id = p.author_id
    WHERE p.visibility = 'public'
      AND p.media_url IS NOT NULL
      AND (p_mode = 'all' OR p_mode = 'video_only')
      AND (
        p_before_created_at IS NULL
        OR p_before_id IS NULL
        OR (p.created_at, p.id) < (p_before_created_at, p_before_id)
      )
      AND (
        p_tab != 'following'
        OR EXISTS(SELECT 1 FROM viewer_following vf WHERE vf.followee_id = prof.id)
      )
      AND (
        p_tab != 'nearby'
        OR v_nearby_zips IS NULL
        OR p.zip_code = ANY(v_nearby_zips)
        OR prof.zip_code = ANY(v_nearby_zips)
      )
  ),
  live_streams AS (
    SELECT
      prof.id AS item_id,
      'live'::text AS item_type,
      NULL::uuid AS post_id,
      (COALESCE(prof.display_name, prof.username) || ' is live')::text AS title,
      NULL::text AS caption,
      NULL::text[] AS hashtags,
      NULL::text AS location_text,
      NULL::text AS media_url,
      prof.avatar_url AS thumbnail_url,
      COALESCE(ls.started_at, ls.created_at) AS created_at,
      prof.id AS author_id,
      prof.username AS author_username,
      COALESCE(prof.display_name, prof.username) AS author_display_name,
      prof.avatar_url AS author_avatar_url,
      COALESCE(prof.kyc_verified, false) AS author_is_verified,
      0::bigint AS like_count,
      0::bigint AS comment_count,
      0::bigint AS favorite_count,
      0::bigint AS share_count,
      0::bigint AS repost_count,
      COALESCE(ls.total_viewer_minutes, 0)::bigint AS view_count,
      0::integer AS viewer_count,
      false AS is_liked,
      false AS is_favorited,
      false AS is_reposted,
      EXISTS(SELECT 1 FROM viewer_following vf WHERE vf.followee_id = prof.id) AS is_following
    FROM public.live_streams ls
    JOIN public.profiles prof ON prof.id = ls.profile_id
    WHERE ls.started_at IS NOT NULL
      AND ls.ended_at IS NULL
      AND (p_mode = 'all' OR p_mode = 'live_only')
      AND (
        p_tab != 'following'
        OR EXISTS(SELECT 1 FROM viewer_following vf WHERE vf.followee_id = prof.id)
      )
      AND (
        p_tab != 'nearby'
        OR v_nearby_zips IS NULL
        OR prof.zip_code = ANY(v_nearby_zips)
      )
  ),
  combined AS (
    SELECT * FROM video_posts
    UNION ALL
    SELECT * FROM live_streams
  )
  SELECT *
  FROM combined
  ORDER BY
    CASE WHEN p_tab IN ('trending', 'for_you') AND combined.item_type = 'live' THEN 0 ELSE 1 END,
    CASE WHEN p_tab = 'trending' THEN combined.like_count + combined.comment_count * 2 + combined.share_count * 3 ELSE 0 END DESC,
    combined.created_at DESC,
    combined.item_id DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_watch_feed(text, text, integer, timestamptz, uuid) TO authenticated;
