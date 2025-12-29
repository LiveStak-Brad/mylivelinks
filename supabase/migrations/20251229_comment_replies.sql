-- Migration: Comment Replies Feature
-- Description: Add nested replies to comments (Facebook-style)
-- Date: 2025-12-29

BEGIN;

-- 1. Add parent_comment_id column to post_comments for nested replies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'post_comments' 
    AND column_name = 'parent_comment_id'
  ) THEN
    ALTER TABLE public.post_comments 
    ADD COLUMN parent_comment_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Add reply_count column to track number of replies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'post_comments' 
    AND column_name = 'reply_count'
  ) THEN
    ALTER TABLE public.post_comments 
    ADD COLUMN reply_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON public.post_comments(parent_comment_id);

-- 4. Initialize reply_count for existing comments
UPDATE public.post_comments 
SET reply_count = (
  SELECT COUNT(*) 
  FROM public.post_comments replies 
  WHERE replies.parent_comment_id = post_comments.id
)
WHERE reply_count = 0;

-- 5. Trigger to increment reply_count when a reply is added
CREATE OR REPLACE FUNCTION public.trg_comment_replies_increment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.parent_comment_id IS NOT NULL THEN
    UPDATE public.post_comments
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_comment_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comment_replies_increment ON public.post_comments;
CREATE TRIGGER trg_comment_replies_increment
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_comment_replies_increment_count();

-- 6. Trigger to decrement reply_count when a reply is deleted
CREATE OR REPLACE FUNCTION public.trg_comment_replies_decrement_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.parent_comment_id IS NOT NULL THEN
    UPDATE public.post_comments
    SET reply_count = GREATEST(0, reply_count - 1)
    WHERE id = OLD.parent_comment_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_comment_replies_decrement ON public.post_comments;
CREATE TRIGGER trg_comment_replies_decrement
AFTER DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_comment_replies_decrement_count();

COMMIT;

