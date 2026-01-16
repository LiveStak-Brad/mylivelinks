-- Update get_prp_feed_deduped RPC to include item_type for category filtering
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS public.get_prp_feed_deduped(int, int);
CREATE OR REPLACE FUNCTION public.get_prp_feed_deduped(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  item_id uuid,
  youtube_video_id text,
  title text,
  description text,
  thumb_url text,
  media_url text,
  duration_seconds int,
  views_count int,
  created_at timestamptz,
  playlist_id uuid,
  playlist_title text,
  curator_profile_id uuid,
  curator_username text,
  curator_display_name text,
  curator_avatar_url text,
  first_added_at timestamptz,
  item_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH first_curators AS (
    -- For each youtube_video_id, find the first curator (earliest created_at)
    SELECT DISTINCT ON (rpi.youtube_video_id)
      rpi.id as item_id,
      rpi.youtube_video_id,
      rpi.playlist_id,
      rp.profile_id as curator_profile_id,
      rpi.created_at as first_added_at,
      rpi.title as item_title,
      rpi.thumbnail_url as item_thumbnail,
      rpi.duration_seconds as item_duration,
      rpi.youtube_url,
      -- Map playlist category to item_type
      CASE rp.category::text
        WHEN 'music' THEN 'music_video'
        WHEN 'movies' THEN 'movie'
        WHEN 'education' THEN 'education'
        WHEN 'comedy' THEN 'comedy_special'
        WHEN 'podcasts' THEN 'podcast'
        WHEN 'series' THEN 'series_episode'
        ELSE 'vlog'
      END as item_type
    FROM replay_playlist_items rpi
    JOIN replay_playlists rp ON rp.id = rpi.playlist_id
    WHERE rp.visibility = 'public'
      AND rpi.youtube_video_id IS NOT NULL
    ORDER BY rpi.youtube_video_id, rpi.created_at ASC
  )
  SELECT 
    fc.item_id,
    fc.youtube_video_id,
    fc.item_title as title,
    NULL::text as description,
    COALESCE(fc.item_thumbnail, 'https://img.youtube.com/vi/' || fc.youtube_video_id || '/hqdefault.jpg') as thumb_url,
    fc.youtube_url as media_url,
    COALESCE(fc.item_duration, 0) as duration_seconds,
    0 as views_count,
    fc.first_added_at as created_at,
    fc.playlist_id,
    rp.title as playlist_title,
    p.id as curator_profile_id,
    p.username as curator_username,
    p.display_name as curator_display_name,
    p.avatar_url as curator_avatar_url,
    fc.first_added_at,
    fc.item_type
  FROM first_curators fc
  JOIN replay_playlists rp ON rp.id = fc.playlist_id
  JOIN profiles p ON p.id = fc.curator_profile_id
  ORDER BY fc.first_added_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_prp_feed_deduped(int, int) TO anon, authenticated;
