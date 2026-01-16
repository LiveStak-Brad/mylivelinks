-- Video Likes & Comments System
-- Generic tables for likes/comments on any video content
-- Used for trending/discovery algorithms

-- ============================================================================
-- VIDEO LIKES TABLE (generic - works with any video ID)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.video_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL,  -- Text to support YouTube IDs and UUIDs
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_video_likes_video_id ON public.video_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_user_id ON public.video_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_created_at ON public.video_likes(created_at DESC);

-- RLS Policies for video_likes
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view video likes" ON public.video_likes;
CREATE POLICY "Anyone can view video likes"
  ON public.video_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can like videos" ON public.video_likes;
CREATE POLICY "Users can like videos"
  ON public.video_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike their own likes" ON public.video_likes;
CREATE POLICY "Users can unlike their own likes"
  ON public.video_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- VIDEO COMMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.video_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL,  -- Text to support YouTube IDs and UUIDs
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text_content text NOT NULL,
  like_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_comments_video_id ON public.video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_author_id ON public.video_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_created_at ON public.video_comments(created_at DESC);

-- RLS Policies for video_comments
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view video comments" ON public.video_comments;
CREATE POLICY "Anyone can view video comments"
  ON public.video_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON public.video_comments;
CREATE POLICY "Users can create comments"
  ON public.video_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.video_comments;
CREATE POLICY "Users can update own comments"
  ON public.video_comments FOR UPDATE
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.video_comments;
CREATE POLICY "Users can delete own comments"
  ON public.video_comments FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================================================
-- VIDEO COMMENT LIKES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.video_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.video_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_video_comment_likes_comment_id ON public.video_comment_likes(comment_id);

-- Trigger to update comment like_count
CREATE OR REPLACE FUNCTION public.update_video_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.video_comments
    SET like_count = like_count + 1
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.video_comments
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_video_comment_like_count ON public.video_comment_likes;
CREATE TRIGGER trg_video_comment_like_count
  AFTER INSERT OR DELETE ON public.video_comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_video_comment_like_count();

-- RLS for comment likes
ALTER TABLE public.video_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.video_comment_likes;
CREATE POLICY "Anyone can view comment likes"
  ON public.video_comment_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can like comments" ON public.video_comment_likes;
CREATE POLICY "Users can like comments"
  ON public.video_comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike comments" ON public.video_comment_likes;
CREATE POLICY "Users can unlike comments"
  ON public.video_comment_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER: Get video trending score (for discovery)
-- Score = likes + (comments * 2) + (recent_views * 0.1)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_video_trending_score(p_video_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_like_count int;
  v_comment_count int;
  v_score numeric;
BEGIN
  -- Count likes
  SELECT COUNT(*) INTO v_like_count
  FROM video_likes
  WHERE video_id = p_video_id;
  
  -- Count comments
  SELECT COUNT(*) INTO v_comment_count
  FROM video_comments
  WHERE video_id = p_video_id;
  
  -- Calculate score (likes + comments*2)
  v_score := v_like_count + (v_comment_count * 2);
  
  RETURN v_score;
END;
$$;
