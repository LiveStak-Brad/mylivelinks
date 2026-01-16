-- Quick fix: Add missing columns to existing tables
-- Run this in Supabase SQL Editor

-- Add view_count to profile_music_videos if missing
ALTER TABLE public.profile_music_videos 
ADD COLUMN IF NOT EXISTS view_count int NOT NULL DEFAULT 0;

-- Add dislike_count column
ALTER TABLE public.video_comments 
ADD COLUMN IF NOT EXISTS dislike_count int NOT NULL DEFAULT 0;

-- Add parent_comment_id column for replies
ALTER TABLE public.video_comments 
ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES public.video_comments(id) ON DELETE CASCADE;

-- Add index for parent lookups
CREATE INDEX IF NOT EXISTS idx_video_comments_parent_id ON public.video_comments(parent_comment_id);

-- Create video_comment_dislikes table if not exists
CREATE TABLE IF NOT EXISTS public.video_comment_dislikes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.video_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_video_comment_dislikes_comment_id ON public.video_comment_dislikes(comment_id);
CREATE INDEX IF NOT EXISTS idx_video_comment_dislikes_user_id ON public.video_comment_dislikes(user_id);

ALTER TABLE public.video_comment_dislikes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comment dislikes" ON public.video_comment_dislikes;
CREATE POLICY "Anyone can view comment dislikes"
  ON public.video_comment_dislikes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can dislike comments" ON public.video_comment_dislikes;
CREATE POLICY "Users can dislike comments"
  ON public.video_comment_dislikes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove dislikes" ON public.video_comment_dislikes;
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

DROP TRIGGER IF EXISTS trg_video_comment_dislike_count ON public.video_comment_dislikes;
CREATE TRIGGER trg_video_comment_dislike_count
  AFTER INSERT OR DELETE ON public.video_comment_dislikes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_video_comment_dislike_count();
