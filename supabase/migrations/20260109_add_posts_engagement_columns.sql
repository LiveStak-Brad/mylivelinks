-- Add engagement tracking columns to posts table
-- These columns are queried by lib/search.ts but don't exist yet

BEGIN;

-- Add like_count column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'posts' 
    AND column_name = 'like_count'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN like_count bigint NOT NULL DEFAULT 0;
  END IF;
END;
$$;

-- Add comment_count column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'posts' 
    AND column_name = 'comment_count'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN comment_count bigint NOT NULL DEFAULT 0;
  END IF;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_like_count ON public.posts(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_comment_count ON public.posts(comment_count DESC);

COMMENT ON COLUMN public.posts.like_count IS 'Cached count of likes on this post';
COMMENT ON COLUMN public.posts.comment_count IS 'Cached count of comments on this post';

COMMIT;
