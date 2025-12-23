-- ============================================================================
-- Phase 1.3: Storage Buckets Setup
-- MyLiveLinks - Avatar and Pinned Post Media Storage
-- ============================================================================
-- 
-- IMPORTANT: This SQL file ONLY creates RLS policies.
-- Storage buckets MUST be created manually in Supabase Dashboard first.
--
-- Step 1: Create buckets in Dashboard (see instructions below)
-- Step 2: Run this SQL to create RLS policies
--
-- Buckets needed:
-- - avatars: User profile avatars
-- - pinned-posts: Pinned post media (images/videos)
--
-- Path structure:
-- - avatars/{profile_id}/avatar.{ext}
-- - pinned-posts/{profile_id}/pinned.{ext}
--
-- RLS Rules:
-- - Write: Only auth.uid() = profile_id (users can upload their own)
-- - Read: Public (anyone can read)
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE BUCKETS IN SUPABASE DASHBOARD
-- ============================================================================
-- 
-- Go to: Supabase Dashboard > Storage > New Bucket
--
-- Bucket 1: "avatars"
--   - Name: avatars
--   - Public bucket: YES (checked)
--   - File size limit: 5 MB (recommended)
--   - Allowed MIME types: image/* (optional, for validation)
--   - Click "Create bucket"
--
-- Bucket 2: "pinned-posts"
--   - Name: pinned-posts
--   - Public bucket: YES (checked)
--   - File size limit: 50 MB (for videos)
--   - Allowed MIME types: image/*, video/* (optional, for validation)
--   - Click "Create bucket"
--
-- ============================================================================
-- STEP 2: RUN THIS SQL TO CREATE RLS POLICIES
-- ============================================================================
-- 
-- After buckets are created, run this SQL file in Supabase SQL Editor
-- to set up Row Level Security policies.
--
-- ============================================================================

-- ============================================================================
-- AVATARS BUCKET POLICIES
-- ============================================================================

-- Drop existing policies if they exist (allows re-running this SQL)
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- Policy: Public read (anyone can read avatars)
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Policy: Authenticated users can upload their own avatar only
-- Path must match: avatars/{profile_id}/avatar.{ext}
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can update their own avatar only
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can delete their own avatar only
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- PINNED-POSTS BUCKET POLICIES
-- ============================================================================

-- Drop existing policies if they exist (allows re-running this SQL)
DROP POLICY IF EXISTS "Public read pinned posts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own pinned post" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own pinned post" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own pinned post" ON storage.objects;

-- Policy: Public read (anyone can read pinned post media)
CREATE POLICY "Public read pinned posts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pinned-posts');

-- Policy: Authenticated users can upload their own pinned post media only
-- Path must match: pinned-posts/{profile_id}/pinned.{ext}
CREATE POLICY "Users can upload own pinned post"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pinned-posts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can update their own pinned post media only
CREATE POLICY "Users can update own pinned post"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pinned-posts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'pinned-posts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can delete their own pinned post media only
CREATE POLICY "Users can delete own pinned post"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pinned-posts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- SETUP INSTRUCTIONS
-- ============================================================================
-- 
-- 1. Go to Supabase Dashboard > Storage
-- 2. Create bucket: "avatars"
--    - Public: Yes
--    - File size limit: 5MB (recommended)
--    - Allowed MIME types: image/* (optional)
-- 3. Create bucket: "pinned-posts"
--    - Public: Yes
--    - File size limit: 50MB (for videos)
--    - Allowed MIME types: image/*, video/* (optional)
-- 4. Run this SQL file to create RLS policies
-- 5. Verify policies in Dashboard > Storage > Policies
-- ============================================================================

