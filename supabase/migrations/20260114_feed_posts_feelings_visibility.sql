-- ============================================================================
-- FEED POSTS: FEELINGS & VISIBILITY ENHANCEMENTS
-- ============================================================================
-- Adds:
-- 1. post_feelings lookup table with predefined feelings
-- 2. feeling column on posts table
-- 3. Enhanced visibility options (public, friends, followers)
-- 4. RPC for creating posts with full support
-- 5. post-media storage bucket
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. ENSURE POST-MEDIA STORAGE BUCKET EXISTS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Storage policies for post-media bucket
DROP POLICY IF EXISTS "Anyone can view post media" ON storage.objects;
CREATE POLICY "Anyone can view post media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

DROP POLICY IF EXISTS "Authenticated users can upload post media" ON storage.objects;
CREATE POLICY "Authenticated users can upload post media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own post media" ON storage.objects;
CREATE POLICY "Users can delete own post media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- 1. POST FEELINGS LOOKUP TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.post_feelings (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  emoji text NOT NULL,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.post_feelings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Post feelings are viewable by everyone" ON public.post_feelings;
CREATE POLICY "Post feelings are viewable by everyone"
  ON public.post_feelings FOR SELECT USING (true);

GRANT SELECT ON TABLE public.post_feelings TO anon, authenticated;

-- Seed default feelings
INSERT INTO public.post_feelings (slug, emoji, label, sort_order) VALUES
  ('happy', '😊', 'happy', 1),
  ('excited', '🤩', 'excited', 2),
  ('grateful', '🙏', 'grateful', 3),
  ('loved', '🥰', 'loved', 4),
  ('blessed', '✨', 'blessed', 5),
  ('chill', '😎', 'chill', 6),
  ('motivated', '💪', 'motivated', 7),
  ('creative', '🎨', 'creative', 8),
  ('tired', '😴', 'tired', 9),
  ('sad', '😢', 'sad', 10),
  ('angry', '😤', 'angry', 11),
  ('anxious', '😰', 'anxious', 12),
  ('silly', '🤪', 'silly', 13),
  ('hungry', '🍕', 'hungry', 14),
  ('celebrating', '🎉', 'celebrating', 15),
  ('working', '💻', 'working', 16),
  ('traveling', '✈️', 'traveling', 17),
  ('gaming', '🎮', 'gaming', 18),
  ('streaming', '📺', 'streaming', 19),
  ('vibing', '🎵', 'vibing', 20)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. ADD FEELING COLUMN TO POSTS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'feeling_id'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN feeling_id int REFERENCES public.post_feelings(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_posts_feeling ON public.posts(feeling_id) WHERE feeling_id IS NOT NULL;

-- ============================================================================
-- 3. ENHANCE VISIBILITY OPTIONS
-- ============================================================================
-- Current: 'public', 'friends'
-- New: 'public', 'friends', 'followers'

DO $$
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'posts' AND c.conname = 'posts_visibility_check'
  ) THEN
    ALTER TABLE public.posts DROP CONSTRAINT posts_visibility_check;
  END IF;
  
  -- Add new constraint with followers option
  ALTER TABLE public.posts
    ADD CONSTRAINT posts_visibility_check CHECK (visibility IN ('public', 'friends', 'followers'));
END;
$$;

-- ============================================================================
-- 4. USER SETTINGS: DEFAULT POST VISIBILITY
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'default_post_visibility'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN default_post_visibility text NOT NULL DEFAULT 'public'
      CHECK (default_post_visibility IN ('public', 'friends', 'followers'));
  END IF;
END;
$$;

-- ============================================================================
-- 5. RPC: GET FEELINGS LIST
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_post_feelings()
RETURNS TABLE (
  id int,
  slug text,
  emoji text,
  label text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id, slug, emoji, label
  FROM public.post_feelings
  WHERE is_active = true
  ORDER BY sort_order ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_post_feelings() TO anon, authenticated;

-- ============================================================================
-- 6. RPC: CREATE POST
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_feed_post(
  p_text_content text DEFAULT NULL,
  p_media_url text DEFAULT NULL,
  p_feeling_id int DEFAULT NULL,
  p_visibility text DEFAULT 'public'
)
RETURNS TABLE (
  post_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid := auth.uid();
  v_post_id uuid;
  v_created_at timestamptz;
  v_visibility text;
BEGIN
  -- Must be authenticated
  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate content exists
  IF COALESCE(TRIM(p_text_content), '') = '' AND COALESCE(TRIM(p_media_url), '') = '' AND p_feeling_id IS NULL THEN
    RAISE EXCEPTION 'Post must have text, media, or a feeling';
  END IF;
  
  -- Validate visibility
  v_visibility := COALESCE(p_visibility, 'public');
  IF v_visibility NOT IN ('public', 'friends', 'followers') THEN
    v_visibility := 'public';
  END IF;
  
  -- Validate feeling if provided
  IF p_feeling_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.post_feelings WHERE id = p_feeling_id AND is_active = true) THEN
      RAISE EXCEPTION 'Invalid feeling';
    END IF;
  END IF;
  
  -- Insert post
  INSERT INTO public.posts (author_id, text_content, media_url, feeling_id, visibility)
  VALUES (
    v_author_id,
    NULLIF(TRIM(p_text_content), ''),
    NULLIF(TRIM(p_media_url), ''),
    p_feeling_id,
    v_visibility
  )
  RETURNING id, posts.created_at INTO v_post_id, v_created_at;
  
  RETURN QUERY SELECT v_post_id AS post_id, v_created_at AS created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_feed_post(text, text, int, text) TO authenticated;

-- ============================================================================
-- 7. UPDATE get_public_feed TO INCLUDE FEELING
-- ============================================================================

-- Drop existing function signatures to avoid conflicts
DROP FUNCTION IF EXISTS public.get_public_feed(int, timestamptz, uuid, text);
DROP FUNCTION IF EXISTS public.get_public_feed(int, timestamptz, uuid, text, uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.get_public_feed(
  p_limit int DEFAULT 20,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL,
  p_username text DEFAULT NULL
)
RETURNS TABLE (
  post_id uuid,
  text_content text,
  media_url text,
  feeling_id int,
  feeling_emoji text,
  feeling_label text,
  created_at timestamptz,
  author_id uuid,
  author_username text,
  author_avatar_url text,
  comment_count bigint,
  likes_count bigint,
  views_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS post_id,
    p.text_content,
    p.media_url,
    p.feeling_id,
    pf.emoji AS feeling_emoji,
    pf.label AS feeling_label,
    p.created_at,
    p.author_id,
    pr.username AS author_username,
    pr.avatar_url AS author_avatar_url,
    COALESCE((SELECT COUNT(*) FROM public.post_comments pc WHERE pc.post_id = p.id), 0) AS comment_count,
    COALESCE((SELECT COUNT(*) FROM public.post_likes pl WHERE pl.post_id = p.id), 0) AS likes_count,
    COALESCE((SELECT COUNT(*) FROM public.content_views cv WHERE cv.content_type = 'feed_post' AND cv.content_id = p.id), 0) AS views_count
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.author_id
  LEFT JOIN public.post_feelings pf ON pf.id = p.feeling_id
  WHERE p.visibility = 'public'
    AND (p_username IS NULL OR pr.username = p_username)
    AND (
      p_before_created_at IS NULL
      OR p.created_at < p_before_created_at
      OR (p.created_at = p_before_created_at AND p.id < p_before_id)
    )
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT LEAST(p_limit, 50);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_feed(int, timestamptz, uuid, text) TO anon, authenticated;

COMMIT;
