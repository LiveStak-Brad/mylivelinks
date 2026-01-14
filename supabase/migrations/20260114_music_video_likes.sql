-- Music Video Likes System
-- Tracks likes on music videos for trend ranking

-- Create music_video_likes table
CREATE TABLE IF NOT EXISTS public.music_video_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.profile_music_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_music_video_likes_video_id ON public.music_video_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_music_video_likes_user_id ON public.music_video_likes(user_id);

-- Add like_count column to profile_music_videos
ALTER TABLE public.profile_music_videos
  ADD COLUMN IF NOT EXISTS like_count int NOT NULL DEFAULT 0;

-- Trigger to update like_count on profile_music_videos
CREATE OR REPLACE FUNCTION public.update_music_video_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profile_music_videos
    SET like_count = like_count + 1
    WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profile_music_videos
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_music_video_like_count ON public.music_video_likes;
CREATE TRIGGER trg_music_video_like_count
  AFTER INSERT OR DELETE ON public.music_video_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_music_video_like_count();

-- RLS Policies for music_video_likes
ALTER TABLE public.music_video_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can view likes
DROP POLICY IF EXISTS "Anyone can view video likes" ON public.music_video_likes;
CREATE POLICY "Anyone can view video likes"
  ON public.music_video_likes FOR SELECT
  USING (true);

-- Authenticated users can like videos
DROP POLICY IF EXISTS "Authenticated users can like videos" ON public.music_video_likes;
CREATE POLICY "Authenticated users can like videos"
  ON public.music_video_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can unlike (delete their own likes)
DROP POLICY IF EXISTS "Users can unlike videos" ON public.music_video_likes;
CREATE POLICY "Users can unlike videos"
  ON public.music_video_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON public.music_video_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.music_video_likes TO authenticated;

-- RPC to toggle like (returns new like state)
CREATE OR REPLACE FUNCTION public.toggle_music_video_like(p_video_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_exists boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if like exists
  SELECT EXISTS(
    SELECT 1 FROM music_video_likes
    WHERE video_id = p_video_id AND user_id = v_user_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Unlike
    DELETE FROM music_video_likes
    WHERE video_id = p_video_id AND user_id = v_user_id;
    RETURN false;
  ELSE
    -- Like
    INSERT INTO music_video_likes (video_id, user_id)
    VALUES (p_video_id, v_user_id);
    RETURN true;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_music_video_like(uuid) TO authenticated;

-- RPC to check if user liked a video
CREATE OR REPLACE FUNCTION public.check_music_video_liked(p_video_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS(
    SELECT 1 FROM music_video_likes
    WHERE video_id = p_video_id AND user_id = v_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_music_video_liked(uuid) TO anon, authenticated;
