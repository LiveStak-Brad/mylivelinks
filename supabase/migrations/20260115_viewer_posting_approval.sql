-- Migration: Viewer Posting Approval System
-- Allows viewers to post to someone's Feed with page owner approval

-- Add target_profile_id to posts (for posts to someone else's page)
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS target_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add approval_status to posts (pending, approved, rejected)
-- Default to 'approved' for backward compatibility (own posts are auto-approved)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_approval_status') THEN
    CREATE TYPE post_approval_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END$$;

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS approval_status post_approval_status DEFAULT 'approved';

-- Create auto_approved_users table (for "Approve All" functionality)
CREATE TABLE IF NOT EXISTS public.auto_approved_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(page_owner_id, approved_user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_posts_target_profile_id ON public.posts(target_profile_id);
CREATE INDEX IF NOT EXISTS idx_posts_approval_status ON public.posts(approval_status);
CREATE INDEX IF NOT EXISTS idx_auto_approved_users_page_owner ON public.auto_approved_users(page_owner_id);
CREATE INDEX IF NOT EXISTS idx_auto_approved_users_lookup ON public.auto_approved_users(page_owner_id, approved_user_id);

-- RLS policies for auto_approved_users
ALTER TABLE public.auto_approved_users ENABLE ROW LEVEL SECURITY;

-- Page owners can view their auto-approved users
CREATE POLICY "Page owners can view their auto-approved users"
  ON public.auto_approved_users FOR SELECT
  USING (page_owner_id = auth.uid());

-- Page owners can insert auto-approved users
CREATE POLICY "Page owners can insert auto-approved users"
  ON public.auto_approved_users FOR INSERT
  WITH CHECK (page_owner_id = auth.uid());

-- Page owners can delete auto-approved users
CREATE POLICY "Page owners can delete auto-approved users"
  ON public.auto_approved_users FOR DELETE
  USING (page_owner_id = auth.uid());

-- RPC: Create post to someone's page (with approval logic)
CREATE OR REPLACE FUNCTION public.create_post_to_page(
  p_target_profile_id uuid,
  p_text_content text,
  p_media_url text DEFAULT NULL,
  p_visibility text DEFAULT 'public',
  p_feeling_id int DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid := auth.uid();
  v_is_own_page boolean;
  v_is_auto_approved boolean;
  v_approval_status post_approval_status;
  v_post_id uuid;
BEGIN
  IF v_author_id IS NULL THEN
    RETURN json_build_object('error', 'not_authenticated');
  END IF;

  -- Check if posting to own page
  v_is_own_page := (v_author_id = p_target_profile_id);
  
  -- Check if user is auto-approved for this page
  v_is_auto_approved := EXISTS (
    SELECT 1 FROM auto_approved_users
    WHERE page_owner_id = p_target_profile_id
      AND approved_user_id = v_author_id
  );

  -- Determine approval status
  IF v_is_own_page OR v_is_auto_approved THEN
    v_approval_status := 'approved';
  ELSE
    v_approval_status := 'pending';
  END IF;

  -- Insert the post
  INSERT INTO posts (
    author_id,
    target_profile_id,
    text_content,
    media_url,
    visibility,
    feeling_id,
    approval_status
  ) VALUES (
    v_author_id,
    CASE WHEN v_is_own_page THEN NULL ELSE p_target_profile_id END,
    p_text_content,
    p_media_url,
    p_visibility,
    p_feeling_id,
    v_approval_status
  )
  RETURNING id INTO v_post_id;

  RETURN json_build_object(
    'success', true,
    'post_id', v_post_id,
    'approval_status', v_approval_status::text,
    'requires_approval', v_approval_status = 'pending'
  );
END;
$$;

-- RPC: Approve a post (page owner only)
CREATE OR REPLACE FUNCTION public.approve_post(p_post_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_post record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'not_authenticated');
  END IF;

  -- Get the post
  SELECT * INTO v_post FROM posts WHERE id = p_post_id;
  
  IF v_post IS NULL THEN
    RETURN json_build_object('error', 'post_not_found');
  END IF;

  -- Check if user is the page owner
  IF v_post.target_profile_id IS NULL OR v_post.target_profile_id != v_user_id THEN
    RETURN json_build_object('error', 'not_authorized');
  END IF;

  -- Update approval status
  UPDATE posts SET approval_status = 'approved' WHERE id = p_post_id;

  RETURN json_build_object('success', true);
END;
$$;

-- RPC: Reject a post (page owner only)
CREATE OR REPLACE FUNCTION public.reject_post(p_post_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_post record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'not_authenticated');
  END IF;

  -- Get the post
  SELECT * INTO v_post FROM posts WHERE id = p_post_id;
  
  IF v_post IS NULL THEN
    RETURN json_build_object('error', 'post_not_found');
  END IF;

  -- Check if user is the page owner
  IF v_post.target_profile_id IS NULL OR v_post.target_profile_id != v_user_id THEN
    RETURN json_build_object('error', 'not_authorized');
  END IF;

  -- Update approval status
  UPDATE posts SET approval_status = 'rejected' WHERE id = p_post_id;

  RETURN json_build_object('success', true);
END;
$$;

-- RPC: Approve all future posts from a user (page owner only)
CREATE OR REPLACE FUNCTION public.approve_user_forever(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page_owner_id uuid := auth.uid();
BEGIN
  IF v_page_owner_id IS NULL THEN
    RETURN json_build_object('error', 'not_authenticated');
  END IF;

  -- Insert into auto_approved_users (idempotent)
  INSERT INTO auto_approved_users (page_owner_id, approved_user_id)
  VALUES (v_page_owner_id, p_user_id)
  ON CONFLICT (page_owner_id, approved_user_id) DO NOTHING;

  -- Also approve all pending posts from this user
  UPDATE posts
  SET approval_status = 'approved'
  WHERE target_profile_id = v_page_owner_id
    AND author_id = p_user_id
    AND approval_status = 'pending';

  RETURN json_build_object('success', true);
END;
$$;

-- RPC: Get pending posts for page owner
CREATE OR REPLACE FUNCTION public.get_pending_posts_for_approval()
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT json_build_object(
    'id', p.id,
    'text_content', p.text_content,
    'media_url', p.media_url,
    'created_at', p.created_at,
    'author_id', p.author_id,
    'author_username', pr.username,
    'author_display_name', pr.display_name,
    'author_avatar_url', pr.avatar_url
  )
  FROM posts p
  JOIN profiles pr ON pr.id = p.author_id
  WHERE p.target_profile_id = v_user_id
    AND p.approval_status = 'pending'
  ORDER BY p.created_at DESC;
END;
$$;

-- Update existing posts RLS to filter by approval_status for public viewing
-- Only show approved posts on someone's page (or own posts regardless of status)
-- Note: This should be added to existing RLS policies if they exist

COMMENT ON COLUMN public.posts.target_profile_id IS 'Profile ID of the page this post was made to (NULL if posting to own feed)';
COMMENT ON COLUMN public.posts.approval_status IS 'Approval status for posts to other pages: pending, approved, rejected';
COMMENT ON TABLE public.auto_approved_users IS 'Users who are auto-approved to post to a page without moderation';
