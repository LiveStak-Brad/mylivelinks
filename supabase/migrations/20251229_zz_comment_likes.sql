BEGIN;

-- ============================================================================
-- Comment Likes Feature
-- ============================================================================
-- Adds comment likes functionality to post_comments
-- ============================================================================

-- 1. Rename content column to text_content for consistency
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'post_comments' 
      AND column_name = 'content'
  ) AND NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'post_comments' 
      AND column_name = 'text_content'
  ) THEN
    ALTER TABLE public.post_comments RENAME COLUMN content TO text_content;
  END IF;
END;
$$;

-- 2. Create comment_likes table
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id bigserial PRIMARY KEY,
  comment_id bigint NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id 
  ON public.comment_likes(comment_id);

CREATE INDEX IF NOT EXISTS idx_comment_likes_profile_id 
  ON public.comment_likes(profile_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS: Comment likes viewable by everyone
DROP POLICY IF EXISTS "Comment likes viewable by everyone" ON public.comment_likes;
CREATE POLICY "Comment likes viewable by everyone"
  ON public.comment_likes
  FOR SELECT
  USING (true);

-- RLS: Users can like comments
DROP POLICY IF EXISTS "Users can like comments" ON public.comment_likes;
CREATE POLICY "Users can like comments"
  ON public.comment_likes
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- RLS: Users can unlike comments
DROP POLICY IF EXISTS "Users can unlike comments" ON public.comment_likes;
CREATE POLICY "Users can unlike comments"
  ON public.comment_likes
  FOR DELETE
  USING (auth.uid() = profile_id);

GRANT SELECT ON TABLE public.comment_likes TO anon, authenticated;
GRANT INSERT, DELETE ON TABLE public.comment_likes TO authenticated;

-- 3. Add like_count column to post_comments (denormalized for performance)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'post_comments' 
      AND column_name = 'like_count'
  ) THEN
    ALTER TABLE public.post_comments ADD COLUMN like_count bigint NOT NULL DEFAULT 0;
  END IF;
END;
$$;

-- 4. Create function to update like count
CREATE OR REPLACE FUNCTION public.update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post_comments
    SET like_count = like_count + 1
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_comments
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger to maintain like count
DROP TRIGGER IF EXISTS trg_update_comment_like_count ON public.comment_likes;
CREATE TRIGGER trg_update_comment_like_count
  AFTER INSERT OR DELETE ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comment_like_count();

-- 6. Backfill like_count for existing comments
UPDATE public.post_comments pc
SET like_count = (
  SELECT COUNT(*)
  FROM public.comment_likes cl
  WHERE cl.comment_id = pc.id
)
WHERE like_count = 0;

COMMENT ON TABLE public.comment_likes IS 'Tracks likes on post comments';
COMMENT ON COLUMN public.post_comments.like_count IS 'Denormalized count of likes for performance';

COMMIT;

