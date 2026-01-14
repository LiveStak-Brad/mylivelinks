-- Immediate view count update for music videos
-- This modifies rpc_track_content_view to also increment views_count directly

CREATE OR REPLACE FUNCTION rpc_track_content_view(
  p_content_type text,
  p_content_id uuid,
  p_view_source text,
  p_view_type text,
  p_viewer_fingerprint text DEFAULT NULL
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
  v_is_new_view boolean := false;
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
      view_type
    ) VALUES (
      p_content_type,
      p_content_id,
      v_viewer_id,
      p_viewer_fingerprint,
      p_view_source,
      p_view_type
    );
    v_is_new_view := true;
  END IF;

  -- Immediately update views_count on the content table for new views
  IF v_is_new_view THEN
    CASE p_content_type
      WHEN 'music_video' THEN
        UPDATE profile_music_videos 
        SET views_count = views_count + 1 
        WHERE id = p_content_id;
      WHEN 'music_track' THEN
        UPDATE profile_music_tracks 
        SET views_count = views_count + 1 
        WHERE id = p_content_id;
      WHEN 'feed_post' THEN
        UPDATE posts 
        SET views_count = views_count + 1 
        WHERE id = p_content_id;
      WHEN 'team_post' THEN
        UPDATE team_feed_posts 
        SET views_count = views_count + 1 
        WHERE id = p_content_id;
      WHEN 'clip' THEN
        UPDATE clips 
        SET views_count = views_count + 1 
        WHERE id = p_content_id;
      ELSE
        -- Do nothing for unknown types
        NULL;
    END CASE;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_track_content_view(text, uuid, text, text, text) 
  TO authenticated, anon;
