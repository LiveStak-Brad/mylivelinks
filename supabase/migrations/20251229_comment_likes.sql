-- Migration: Comment Likes Feature
-- Description: Add like functionality to comments with Facebook-style interactions
-- Date: 2025-12-29

BEGIN;

-- 1. Add like_count column to post_comments if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'post_comments' 
    AND column_name = 'like_count'
  ) THEN
    ALTER TABLE public.post_comments ADD COLUMN like_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 2. Create comment_likes table
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, profile_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_profile_id ON public.comment_likes(profile_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_created_at ON public.comment_likes(created_at DESC);

-- 4. Enable RLS on comment_likes
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for comment_likes
DROP POLICY IF EXISTS "Comment likes are viewable by everyone" ON public.comment_likes;
CREATE POLICY "Comment likes are viewable by everyone" 
  ON public.comment_likes FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can insert own comment likes" ON public.comment_likes;
CREATE POLICY "Users can insert own comment likes" 
  ON public.comment_likes FOR INSERT 
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete own comment likes" ON public.comment_likes;
CREATE POLICY "Users can delete own comment likes" 
  ON public.comment_likes FOR DELETE 
  USING (auth.uid() = profile_id);

-- 6. Grant permissions
GRANT SELECT ON TABLE public.comment_likes TO anon, authenticated;
GRANT INSERT, DELETE ON TABLE public.comment_likes TO authenticated;

-- 7. RPC function to like a comment (atomic operation)
CREATE OR REPLACE FUNCTION public.like_comment(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  v_profile_id := auth.uid();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Insert like (ON CONFLICT does nothing if already liked)
  INSERT INTO public.comment_likes (comment_id, profile_id)
  VALUES (p_comment_id, v_profile_id)
  ON CONFLICT (comment_id, profile_id) DO NOTHING;

  -- Update like_count
  UPDATE public.post_comments
  SET like_count = (
    SELECT COUNT(*) FROM public.comment_likes WHERE comment_id = p_comment_id
  )
  WHERE id = p_comment_id;
END;
$$;

-- 8. RPC function to unlike a comment (atomic operation)
CREATE OR REPLACE FUNCTION public.unlike_comment(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  v_profile_id := auth.uid();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Delete like
  DELETE FROM public.comment_likes
  WHERE comment_id = p_comment_id AND profile_id = v_profile_id;

  -- Update like_count
  UPDATE public.post_comments
  SET like_count = (
    SELECT COUNT(*) FROM public.comment_likes WHERE comment_id = p_comment_id
  )
  WHERE id = p_comment_id;
END;
$$;

-- 9. Trigger to update like_count on INSERT (backup, RPC handles it but this is safety)
CREATE OR REPLACE FUNCTION public.trg_comment_likes_increment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.post_comments
  SET like_count = like_count + 1
  WHERE id = NEW.comment_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comment_likes_increment ON public.comment_likes;
CREATE TRIGGER trg_comment_likes_increment
AFTER INSERT ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.trg_comment_likes_increment_count();

-- 10. Trigger to update like_count on DELETE (backup, RPC handles it but this is safety)
CREATE OR REPLACE FUNCTION public.trg_comment_likes_decrement_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.post_comments
  SET like_count = GREATEST(0, like_count - 1)
  WHERE id = OLD.comment_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_comment_likes_decrement ON public.comment_likes;
CREATE TRIGGER trg_comment_likes_decrement
AFTER DELETE ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.trg_comment_likes_decrement_count();

COMMIT;

