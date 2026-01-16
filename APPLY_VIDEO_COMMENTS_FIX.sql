-- Quick fix: Create video_comments and video_likes tables with TEXT video_id
-- Run this in Supabase SQL Editor

-- Drop existing tables if they have wrong type
DROP TABLE IF EXISTS public.video_comment_likes CASCADE;
DROP TABLE IF EXISTS public.video_comments CASCADE;
DROP TABLE IF EXISTS public.video_likes CASCADE;

-- VIDEO LIKES TABLE
CREATE TABLE public.video_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL,  -- Text to support YouTube IDs and UUIDs
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id)
);

CREATE INDEX idx_video_likes_video_id ON public.video_likes(video_id);
CREATE INDEX idx_video_likes_user_id ON public.video_likes(user_id);
CREATE INDEX idx_video_likes_created_at ON public.video_likes(created_at DESC);

ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view video likes"
  ON public.video_likes FOR SELECT USING (true);

CREATE POLICY "Users can like videos"
  ON public.video_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
  ON public.video_likes FOR DELETE
  USING (auth.uid() = user_id);

-- VIDEO COMMENTS TABLE
CREATE TABLE public.video_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL,  -- Text to support YouTube IDs and UUIDs
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.video_comments(id) ON DELETE CASCADE,  -- For replies
  text_content text NOT NULL,
  like_count int NOT NULL DEFAULT 0,
  dislike_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_video_comments_video_id ON public.video_comments(video_id);
CREATE INDEX idx_video_comments_author_id ON public.video_comments(author_id);
CREATE INDEX idx_video_comments_created_at ON public.video_comments(created_at DESC);
CREATE INDEX idx_video_comments_parent_id ON public.video_comments(parent_comment_id);

ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view video comments"
  ON public.video_comments FOR SELECT USING (true);

CREATE POLICY "Users can create comments"
  ON public.video_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own comments"
  ON public.video_comments FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own comments"
  ON public.video_comments FOR DELETE
  USING (auth.uid() = author_id);

-- VIDEO COMMENT LIKES TABLE
CREATE TABLE public.video_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.video_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX idx_video_comment_likes_comment_id ON public.video_comment_likes(comment_id);
CREATE INDEX idx_video_comment_likes_user_id ON public.video_comment_likes(user_id);

ALTER TABLE public.video_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comment likes"
  ON public.video_comment_likes FOR SELECT USING (true);

CREATE POLICY "Users can like comments"
  ON public.video_comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments"
  ON public.video_comment_likes FOR DELETE
  USING (auth.uid() = user_id);

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

CREATE TRIGGER trg_video_comment_like_count
  AFTER INSERT OR DELETE ON public.video_comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_video_comment_like_count();

-- VIDEO COMMENT DISLIKES TABLE
CREATE TABLE public.video_comment_dislikes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.video_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX idx_video_comment_dislikes_comment_id ON public.video_comment_dislikes(comment_id);
CREATE INDEX idx_video_comment_dislikes_user_id ON public.video_comment_dislikes(user_id);

ALTER TABLE public.video_comment_dislikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comment dislikes"
  ON public.video_comment_dislikes FOR SELECT USING (true);

CREATE POLICY "Users can dislike comments"
  ON public.video_comment_dislikes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove dislikes"
  ON public.video_comment_dislikes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update comment dislike_count
CREATE OR REPLACE FUNCTION public.update_video_comment_dislike_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.video_comments
    SET dislike_count = dislike_count + 1
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.video_comments
    SET dislike_count = GREATEST(0, dislike_count - 1)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_video_comment_dislike_count
  AFTER INSERT OR DELETE ON public.video_comment_dislikes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_video_comment_dislike_count();
