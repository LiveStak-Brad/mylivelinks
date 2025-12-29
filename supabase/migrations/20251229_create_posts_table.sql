BEGIN;

-- ============================================================================
-- MyLiveLinks: Feed Posts Schema
-- ============================================================================
-- Create posts table for feed functionality
-- Required for referral activation trigger (first_post_created event)
-- ============================================================================

-- Create posts table (feed posts)
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text_content text,
  media_url text,
  visibility text NOT NULL DEFAULT 'public',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT posts_has_content CHECK (
    text_content IS NOT NULL OR media_url IS NOT NULL
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'posts'
      AND c.conname = 'posts_visibility_check'
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_visibility_check CHECK (visibility IN ('public', 'friends'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_posts_author_created_at_desc
  ON public.posts (author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_visibility_created_at_desc
  ON public.posts (visibility, created_at DESC, id DESC);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS: Posts viewable by everyone if public, or by author/friends
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone"
  ON public.posts
  FOR SELECT
  USING (
    visibility = 'public'
    OR auth.uid() = author_id
  );

-- RLS: Users can insert own posts
DROP POLICY IF EXISTS "Users can insert own posts" ON public.posts;
CREATE POLICY "Users can insert own posts"
  ON public.posts
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- RLS: Users can update own posts
DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts"
  ON public.posts
  FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- RLS: Users can delete own posts
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users can delete own posts"
  ON public.posts
  FOR DELETE
  USING (auth.uid() = author_id);

GRANT SELECT ON TABLE public.posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.posts TO authenticated;

-- ============================================================================
-- Post Comments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.post_comments (
  id bigserial PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_created
  ON public.post_comments (post_id, created_at DESC);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.post_comments;
CREATE POLICY "Comments viewable by everyone"
  ON public.post_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own comments" ON public.post_comments;
CREATE POLICY "Users can insert own comments"
  ON public.post_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

GRANT SELECT ON TABLE public.post_comments TO anon, authenticated;
GRANT INSERT ON TABLE public.post_comments TO authenticated;

-- ============================================================================
-- Post Gifts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.post_gifts (
  id bigserial PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gift_id bigint,
  coins bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add foreign key constraint to gifts table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'gifts'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'post_gifts'
        AND c.conname = 'post_gifts_gift_id_fkey'
    ) THEN
      ALTER TABLE public.post_gifts
        ADD CONSTRAINT post_gifts_gift_id_fkey
        FOREIGN KEY (gift_id) REFERENCES public.gifts(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_post_gifts_post
  ON public.post_gifts (post_id, created_at DESC);

ALTER TABLE public.post_gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Post gifts viewable by everyone" ON public.post_gifts;
CREATE POLICY "Post gifts viewable by everyone"
  ON public.post_gifts FOR SELECT USING (true);

GRANT SELECT ON TABLE public.post_gifts TO anon, authenticated;

-- ============================================================================
-- Friends Table (for friends-only posts visibility)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.friends (
  id bigserial PRIMARY KEY,
  user_id_1 uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id_2 uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friends_user_order CHECK (user_id_1 < user_id_2),
  UNIQUE(user_id_1, user_id_2)
);

CREATE INDEX IF NOT EXISTS idx_friends_user_id_1 ON public.friends(user_id_1);
CREATE INDEX IF NOT EXISTS idx_friends_user_id_2 ON public.friends(user_id_2);

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own friendships" ON public.friends;
CREATE POLICY "Users can view own friendships"
  ON public.friends
  FOR SELECT
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

DROP POLICY IF EXISTS "Users can create friendships" ON public.friends;
CREATE POLICY "Users can create friendships"
  ON public.friends
  FOR INSERT
  WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

GRANT SELECT, INSERT ON TABLE public.friends TO authenticated;

COMMENT ON TABLE public.posts IS 'Feed posts - supports text and media content. Triggers referral activation on first post.';
COMMENT ON TABLE public.post_comments IS 'Comments on feed posts.';
COMMENT ON TABLE public.post_gifts IS 'Gifts sent to feed posts (monetization).';
COMMENT ON TABLE public.friends IS 'Friend relationships for friends-only post visibility.';

-- ============================================================================
-- Referral Activation Trigger: First Post
-- ============================================================================
-- This trigger hooks into the referral activation system (20251228_referrals_activation_v1.sql)
-- When a user creates their first post, log the activity which may activate their referral
-- ============================================================================

-- Ensure the trigger function exists (it's defined in referrals_activation_v1 migration)
-- If that migration hasn't run yet, this will fail gracefully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'on_posts_first_post_activity'
  ) THEN
    -- Drop and recreate trigger to ensure it's properly attached
    DROP TRIGGER IF EXISTS trg_posts_first_post_activity ON public.posts;
    
    CREATE TRIGGER trg_posts_first_post_activity
    AFTER INSERT ON public.posts
    FOR EACH ROW
    EXECUTE FUNCTION public.on_posts_first_post_activity();
  END IF;
END;
$$;

COMMIT;

