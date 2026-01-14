-- ============================================================================
-- SHARED VIEW TRACKING - Add referral source to content views
-- ============================================================================
-- Extends the content_views table to track views from shared links
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD REFERRAL SOURCE COLUMN
-- ============================================================================

ALTER TABLE public.content_views 
ADD COLUMN IF NOT EXISTS referral_source text CHECK (
  referral_source IS NULL OR referral_source IN (
    'direct',           -- Direct navigation
    'shared_link',      -- Shared via link (copy link, native share)
    'inbox_share',      -- Shared via in-app inbox/DM
    'external_share',   -- Shared to external platform (Snapchat, etc.)
    'feed',             -- Discovered in feed
    'watch',            -- Discovered in watch feed
    'profile',          -- Discovered on profile page
    'search'            -- Discovered via search
  )
);

-- ============================================================================
-- 2. ADD SHARER TRACKING
-- ============================================================================

-- Track who shared the content (for attribution)
ALTER TABLE public.content_views 
ADD COLUMN IF NOT EXISTS sharer_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================================
-- 3. INDEX FOR SHARED VIEW ANALYTICS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_content_views_referral_source
  ON content_views(content_type, referral_source, viewed_at DESC)
  WHERE referral_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_views_sharer
  ON content_views(sharer_profile_id, viewed_at DESC)
  WHERE sharer_profile_id IS NOT NULL;

-- ============================================================================
-- 4. UPDATED RPC: Track Content View with Referral Source
-- ============================================================================

DROP FUNCTION IF EXISTS rpc_track_content_view(text, uuid, text, text, text);

CREATE OR REPLACE FUNCTION rpc_track_content_view(
  p_content_type text,
  p_content_id uuid,
  p_view_source text,
  p_view_type text,
  p_viewer_fingerprint text DEFAULT NULL,
  p_referral_source text DEFAULT 'direct',
  p_sharer_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_id uuid;
  v_today date;
  v_existing_view_count int;
BEGIN
  -- Validate content_type enum
  IF p_content_type NOT IN ('feed_post', 'team_post', 'music_track', 'music_video', 'clip') THEN
    RAISE EXCEPTION 'Invalid content_type: %', p_content_type;
  END IF;
  
  -- Validate view_type enum
  IF p_view_type NOT IN ('page_load', 'viewport', 'playback') THEN
    RAISE EXCEPTION 'Invalid view_type: %', p_view_type;
  END IF;
  
  -- Validate view_source enum
  IF p_view_source NOT IN ('web', 'mobile') THEN
    RAISE EXCEPTION 'Invalid view_source: %', p_view_source;
  END IF;
  
  -- Validate referral_source enum (allow NULL for backwards compatibility)
  IF p_referral_source IS NOT NULL AND p_referral_source NOT IN (
    'direct', 'shared_link', 'inbox_share', 'external_share', 'feed', 'watch', 'profile', 'search'
  ) THEN
    RAISE EXCEPTION 'Invalid referral_source: %', p_referral_source;
  END IF;
  
  -- Get viewer ID and today's date
  v_viewer_id := auth.uid();
  v_today := CURRENT_DATE;
  
  -- Check for existing view today (calendar day deduplication)
  IF v_viewer_id IS NOT NULL THEN
    -- Logged-in user: check by profile_id
    SELECT COUNT(*) INTO v_existing_view_count
    FROM content_views
    WHERE content_type = p_content_type
      AND content_id = p_content_id
      AND viewer_profile_id = v_viewer_id
      AND viewed_at::date = v_today;
  ELSE
    -- Anonymous user: check by fingerprint
    SELECT COUNT(*) INTO v_existing_view_count
    FROM content_views
    WHERE content_type = p_content_type
      AND content_id = p_content_id
      AND viewer_fingerprint = p_viewer_fingerprint
      AND viewed_at::date = v_today;
  END IF;
  
  -- Only insert if no view exists today
  IF v_existing_view_count = 0 THEN
    INSERT INTO content_views (
      content_type,
      content_id,
      viewer_profile_id,
      viewer_fingerprint,
      view_source,
      view_type,
      referral_source,
      sharer_profile_id
    ) VALUES (
      p_content_type,
      p_content_id,
      v_viewer_id,
      p_viewer_fingerprint,
      p_view_source,
      p_view_type,
      COALESCE(p_referral_source, 'direct'),
      p_sharer_id
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_track_content_view(text, uuid, text, text, text, text, uuid) 
  TO authenticated, anon;

-- ============================================================================
-- 5. RPC: Get Shared View Stats for Content
-- ============================================================================

CREATE OR REPLACE FUNCTION rpc_get_shared_view_stats(
  p_content_type text,
  p_content_id uuid
)
RETURNS TABLE(
  total_views bigint,
  shared_views bigint,
  inbox_shares bigint,
  external_shares bigint,
  unique_sharers bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint AS total_views,
    COUNT(*) FILTER (WHERE referral_source IN ('shared_link', 'inbox_share', 'external_share'))::bigint AS shared_views,
    COUNT(*) FILTER (WHERE referral_source = 'inbox_share')::bigint AS inbox_shares,
    COUNT(*) FILTER (WHERE referral_source = 'external_share')::bigint AS external_shares,
    COUNT(DISTINCT sharer_profile_id) FILTER (WHERE sharer_profile_id IS NOT NULL)::bigint AS unique_sharers
  FROM content_views
  WHERE content_type = p_content_type
    AND content_id = p_content_id;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_get_shared_view_stats(text, uuid) 
  TO authenticated;

COMMIT;
