-- ============================================================================
-- WATCH FEED SCHEMA + REPOSTS/FAVORITES/HIGHLIGHTS
-- ============================================================================
-- Extends posts table for video/vlog support
-- Creates post_reposts, post_favorites, profile_highlights tables
-- Creates RPCs for Watch feed and Profile tabs
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: EXTEND POSTS TABLE
-- ============================================================================

-- Add media_type enum-like column (video/image/text)
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'text';

-- Add is_vlog flag (vlog posts appear in both Videos and Vlogs tabs)
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS is_vlog boolean DEFAULT false;

-- Add title for video/vlog posts
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS title text;

-- Add hashtags array
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS hashtags text[];

-- Add location_text for display
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS location_text text;

-- Add share_count (cached)
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS share_count bigint DEFAULT 0;

-- Add repost_count (cached)
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS repost_count bigint DEFAULT 0;

-- Add favorite_count (cached)
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS favorite_count bigint DEFAULT 0;

-- Add thumbnail_url for video posts
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Add duration_seconds for video posts
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS duration_seconds integer;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_posts_media_type ON public.posts(media_type);
CREATE INDEX IF NOT EXISTS idx_posts_is_vlog ON public.posts(is_vlog) WHERE is_vlog = true;
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON public.posts USING GIN(hashtags);

-- ============================================================================
-- PART 2: POST REPOSTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.post_reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_reposts_unique UNIQUE(profile_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reposts_profile ON public.post_reposts(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reposts_post ON public.post_reposts(post_id);

-- Enable RLS
ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can view reposts
DROP POLICY IF EXISTS "Reposts are viewable by everyone" ON public.post_reposts;
CREATE POLICY "Reposts are viewable by everyone"
  ON public.post_reposts FOR SELECT USING (true);

-- RLS: Users can insert own reposts
DROP POLICY IF EXISTS "Users can repost" ON public.post_reposts;
CREATE POLICY "Users can repost"
  ON public.post_reposts FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- RLS: Users can delete own reposts
DROP POLICY IF EXISTS "Users can unrepost" ON public.post_reposts;
CREATE POLICY "Users can unrepost"
  ON public.post_reposts FOR DELETE
  USING (auth.uid() = profile_id);

GRANT SELECT ON TABLE public.post_reposts TO anon, authenticated;
GRANT INSERT, DELETE ON TABLE public.post_reposts TO authenticated;

-- ============================================================================
-- PART 3: POST FAVORITES (BOOKMARKS) TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.post_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_favorites_unique UNIQUE(profile_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_favorites_profile ON public.post_favorites(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_favorites_post ON public.post_favorites(post_id);

-- Enable RLS
ALTER TABLE public.post_favorites ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only view their own favorites
DROP POLICY IF EXISTS "Users can view own favorites" ON public.post_favorites;
CREATE POLICY "Users can view own favorites"
  ON public.post_favorites FOR SELECT
  USING (auth.uid() = profile_id);

-- RLS: Users can insert own favorites
DROP POLICY IF EXISTS "Users can favorite posts" ON public.post_favorites;
CREATE POLICY "Users can favorite posts"
  ON public.post_favorites FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- RLS: Users can delete own favorites
DROP POLICY IF EXISTS "Users can unfavorite posts" ON public.post_favorites;
CREATE POLICY "Users can unfavorite posts"
  ON public.post_favorites FOR DELETE
  USING (auth.uid() = profile_id);

GRANT SELECT, INSERT, DELETE ON TABLE public.post_favorites TO authenticated;

-- ============================================================================
-- PART 4: PROFILE HIGHLIGHTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profile_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  cover_url text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_highlights_profile ON public.profile_highlights(profile_id, sort_order);

-- Enable RLS
ALTER TABLE public.profile_highlights ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can view highlights
DROP POLICY IF EXISTS "Highlights are viewable by everyone" ON public.profile_highlights;
CREATE POLICY "Highlights are viewable by everyone"
  ON public.profile_highlights FOR SELECT USING (true);

-- RLS: Users can manage own highlights
DROP POLICY IF EXISTS "Users can manage own highlights" ON public.profile_highlights;
CREATE POLICY "Users can manage own highlights"
  ON public.profile_highlights FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

GRANT SELECT ON TABLE public.profile_highlights TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.profile_highlights TO authenticated;

-- ============================================================================
-- PART 5: PROFILE HIGHLIGHT ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profile_highlight_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id uuid NOT NULL REFERENCES public.profile_highlights(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_highlight_items_unique UNIQUE(highlight_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_highlight_items_highlight ON public.profile_highlight_items(highlight_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_profile_highlight_items_post ON public.profile_highlight_items(post_id);

-- Enable RLS
ALTER TABLE public.profile_highlight_items ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can view highlight items
DROP POLICY IF EXISTS "Highlight items are viewable by everyone" ON public.profile_highlight_items;
CREATE POLICY "Highlight items are viewable by everyone"
  ON public.profile_highlight_items FOR SELECT USING (true);

-- RLS: Users can manage items in own highlights
DROP POLICY IF EXISTS "Users can manage own highlight items" ON public.profile_highlight_items;
CREATE POLICY "Users can manage own highlight items"
  ON public.profile_highlight_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_highlights h
      WHERE h.id = highlight_id AND h.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profile_highlights h
      WHERE h.id = highlight_id AND h.profile_id = auth.uid()
    )
  );

GRANT SELECT ON TABLE public.profile_highlight_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.profile_highlight_items TO authenticated;

-- ============================================================================
-- PART 6: TRIGGER FOR REPOST COUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_post_repost_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET repost_count = repost_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET repost_count = GREATEST(repost_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_repost_count ON public.post_reposts;
CREATE TRIGGER trg_update_repost_count
  AFTER INSERT OR DELETE ON public.post_reposts
  FOR EACH ROW EXECUTE FUNCTION public.update_post_repost_count();

-- ============================================================================
-- PART 7: TRIGGER FOR FAVORITE COUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_post_favorite_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET favorite_count = favorite_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_favorite_count ON public.post_favorites;
CREATE TRIGGER trg_update_favorite_count
  AFTER INSERT OR DELETE ON public.post_favorites
  FOR EACH ROW EXECUTE FUNCTION public.update_post_favorite_count();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.post_reposts IS 'Tracks when users repost content to their profile';
COMMENT ON TABLE public.post_favorites IS 'User bookmarks/favorites for posts';
COMMENT ON TABLE public.profile_highlights IS 'Highlight collections on user profiles';
COMMENT ON TABLE public.profile_highlight_items IS 'Posts within a highlight collection';

COMMIT;
