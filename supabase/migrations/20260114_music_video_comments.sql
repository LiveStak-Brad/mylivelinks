-- Music Video Comments System
-- Supports comments on profile_music_videos with likes/upvoting

-- Create music_video_comments table
CREATE TABLE IF NOT EXISTS public.music_video_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.profile_music_videos(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.music_video_comments(id) ON DELETE CASCADE,
  text_content text NOT NULL,
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT music_video_comments_text_not_empty CHECK (length(trim(text_content)) > 0)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_music_video_comments_video_id ON public.music_video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_music_video_comments_author_id ON public.music_video_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_music_video_comments_parent_id ON public.music_video_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_music_video_comments_created_at ON public.music_video_comments(created_at DESC);

-- Create music_video_comment_likes table for upvoting
CREATE TABLE IF NOT EXISTS public.music_video_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.music_video_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_music_video_comment_likes_comment_id ON public.music_video_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_music_video_comment_likes_user_id ON public.music_video_comment_likes(user_id);

-- Trigger to update like_count on music_video_comments
CREATE OR REPLACE FUNCTION public.update_music_video_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.music_video_comments
    SET like_count = like_count + 1
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.music_video_comments
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_music_video_comment_like_count ON public.music_video_comment_likes;
CREATE TRIGGER trg_music_video_comment_like_count
  AFTER INSERT OR DELETE ON public.music_video_comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_music_video_comment_like_count();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_music_video_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_music_video_comments_updated_at ON public.music_video_comments;
CREATE TRIGGER trg_music_video_comments_updated_at
  BEFORE UPDATE ON public.music_video_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_music_video_comment_updated_at();

-- RLS Policies for music_video_comments
ALTER TABLE public.music_video_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments
DROP POLICY IF EXISTS "Anyone can view music video comments" ON public.music_video_comments;
CREATE POLICY "Anyone can view music video comments"
  ON public.music_video_comments FOR SELECT
  USING (true);

-- Authenticated users can create comments
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.music_video_comments;
CREATE POLICY "Authenticated users can create comments"
  ON public.music_video_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Users can update their own comments
DROP POLICY IF EXISTS "Users can update own comments" ON public.music_video_comments;
CREATE POLICY "Users can update own comments"
  ON public.music_video_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Users can delete their own comments
DROP POLICY IF EXISTS "Users can delete own comments" ON public.music_video_comments;
CREATE POLICY "Users can delete own comments"
  ON public.music_video_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- RLS Policies for music_video_comment_likes
ALTER TABLE public.music_video_comment_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can view likes
DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.music_video_comment_likes;
CREATE POLICY "Anyone can view comment likes"
  ON public.music_video_comment_likes FOR SELECT
  USING (true);

-- Authenticated users can like comments
DROP POLICY IF EXISTS "Authenticated users can like comments" ON public.music_video_comment_likes;
CREATE POLICY "Authenticated users can like comments"
  ON public.music_video_comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can unlike (delete their own likes)
DROP POLICY IF EXISTS "Users can unlike comments" ON public.music_video_comment_likes;
CREATE POLICY "Users can unlike comments"
  ON public.music_video_comment_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON public.music_video_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.music_video_comments TO authenticated;
GRANT SELECT ON public.music_video_comment_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.music_video_comment_likes TO authenticated;
