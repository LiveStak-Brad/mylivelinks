-- Update Replay RPCs to include profile_music_videos
-- Run this in Supabase SQL Editor

-- -----------------------------------------------------------------------------
-- RPC: Get global replay feed (Popular section)
-- Now includes BOTH creator_studio_items AND profile_music_videos
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_replay_feed_popular(text, int, int);
CREATE OR REPLACE FUNCTION public.get_replay_feed_popular(
  p_category text DEFAULT NULL,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  item_type text,
  media_url text,
  thumb_url text,
  artwork_url text,
  duration_seconds int,
  views_count int,
  created_at timestamptz,
  owner_profile_id uuid,
  owner_username text,
  owner_display_name text,
  owner_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH combined_items AS (
    -- Creator Studio Items
    SELECT 
      i.id,
      i.title,
      i.description,
      i.item_type::text,
      i.media_url,
      i.thumb_url,
      i.artwork_url,
      i.duration_seconds,
      COALESCE(i.views_count, 0) as views_count,
      i.created_at,
      p.id as owner_profile_id,
      p.username as owner_username,
      p.display_name as owner_display_name,
      p.avatar_url as owner_avatar_url
    FROM creator_studio_items i
    JOIN profiles p ON p.id = i.owner_profile_id
    WHERE i.status = 'ready'
      AND i.visibility = 'public'
      AND (p_category IS NULL OR p_category = 'all' OR i.item_type::text = p_category)
    
    UNION ALL
    
    -- Profile Music Videos (always type 'music_video')
    SELECT 
      mv.id,
      mv.title,
      mv.description,
      'music_video'::text as item_type,
      COALESCE(mv.video_url, 'https://www.youtube.com/watch?v=' || mv.youtube_id) as media_url,
      COALESCE(mv.thumbnail_url, 'https://img.youtube.com/vi/' || mv.youtube_id || '/hqdefault.jpg') as thumb_url,
      NULL::text as artwork_url,
      0 as duration_seconds,
      COALESCE(mv.views_count, 0) as views_count,
      mv.created_at,
      p.id as owner_profile_id,
      p.username as owner_username,
      p.display_name as owner_display_name,
      p.avatar_url as owner_avatar_url
    FROM profile_music_videos mv
    JOIN profiles p ON p.id = mv.profile_id
    WHERE mv.youtube_id IS NOT NULL
      AND (p_category IS NULL OR p_category = 'all' OR p_category = 'music_video')
  )
  SELECT * FROM combined_items
  ORDER BY views_count DESC, created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_replay_feed_popular(text, int, int) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC: Get global replay feed (New uploads section)
-- Now includes BOTH creator_studio_items AND profile_music_videos
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_replay_feed_new(text, int, int);
CREATE OR REPLACE FUNCTION public.get_replay_feed_new(
  p_category text DEFAULT NULL,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  item_type text,
  media_url text,
  thumb_url text,
  artwork_url text,
  duration_seconds int,
  views_count int,
  created_at timestamptz,
  owner_profile_id uuid,
  owner_username text,
  owner_display_name text,
  owner_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH combined_items AS (
    -- Creator Studio Items
    SELECT 
      i.id,
      i.title,
      i.description,
      i.item_type::text,
      i.media_url,
      i.thumb_url,
      i.artwork_url,
      i.duration_seconds,
      COALESCE(i.views_count, 0) as views_count,
      i.created_at,
      p.id as owner_profile_id,
      p.username as owner_username,
      p.display_name as owner_display_name,
      p.avatar_url as owner_avatar_url
    FROM creator_studio_items i
    JOIN profiles p ON p.id = i.owner_profile_id
    WHERE i.status = 'ready'
      AND i.visibility = 'public'
      AND (p_category IS NULL OR p_category = 'all' OR i.item_type::text = p_category)
    
    UNION ALL
    
    -- Profile Music Videos (always type 'music_video')
    SELECT 
      mv.id,
      mv.title,
      mv.description,
      'music_video'::text as item_type,
      COALESCE(mv.video_url, 'https://www.youtube.com/watch?v=' || mv.youtube_id) as media_url,
      COALESCE(mv.thumbnail_url, 'https://img.youtube.com/vi/' || mv.youtube_id || '/hqdefault.jpg') as thumb_url,
      NULL::text as artwork_url,
      0 as duration_seconds,
      COALESCE(mv.views_count, 0) as views_count,
      mv.created_at,
      p.id as owner_profile_id,
      p.username as owner_username,
      p.display_name as owner_display_name,
      p.avatar_url as owner_avatar_url
    FROM profile_music_videos mv
    JOIN profiles p ON p.id = mv.profile_id
    WHERE mv.youtube_id IS NOT NULL
      AND (p_category IS NULL OR p_category = 'all' OR p_category = 'music_video')
  )
  SELECT * FROM combined_items
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_replay_feed_new(text, int, int) TO anon, authenticated;

-- Verify
SELECT 'RPCs updated to include profile_music_videos' AS status;
