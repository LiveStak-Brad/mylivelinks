-- ============================================================================
-- Fix Supabase Storage Policies for Avatars Bucket
-- ============================================================================
-- This migration adds proper RLS policies to allow authenticated users
-- to upload, update, and delete their own files in the avatars bucket
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE STORAGE BUCKET (if it doesn't exist)
-- ============================================================================

-- Insert bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- ============================================================================
-- 2. DROP EXISTING POLICIES (to avoid conflicts)
-- ============================================================================

DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their files" ON storage.objects;

-- ============================================================================
-- 3. CREATE NEW POLICIES
-- ============================================================================

-- Policy: Allow anyone to view/download files in avatars bucket
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy: Allow authenticated users to upload to avatars bucket
-- Files must be named with their user ID prefix or contain their user ID
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
  OR name LIKE (auth.uid())::text || '%'
  OR name LIKE '%' || (auth.uid())::text || '%'
);

-- Policy: Allow users to update their own files
CREATE POLICY "Authenticated users can update their files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  OR name LIKE (auth.uid())::text || '%'
  OR name LIKE '%' || (auth.uid())::text || '%'
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  OR name LIKE (auth.uid())::text || '%'
  OR name LIKE '%' || (auth.uid())::text || '%'
);

-- Policy: Allow users to delete their own files
CREATE POLICY "Authenticated users can delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  OR name LIKE (auth.uid())::text || '%'
  OR name LIKE '%' || (auth.uid())::text || '%'
);

COMMIT;

-- ============================================================================
-- ALTERNATIVE: If the above is too restrictive, use this simpler version
-- ============================================================================
-- Uncomment the section below if you want to allow all authenticated users
-- to upload any file to the avatars bucket (less secure but simpler)

/*
BEGIN;

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their files" ON storage.objects;

-- Simple policy: Any authenticated user can upload
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Simple policy: Any authenticated user can update files in avatars bucket
CREATE POLICY "Authenticated users can update their files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Simple policy: Any authenticated user can delete files in avatars bucket
CREATE POLICY "Authenticated users can delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

COMMIT;
*/

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this after the migration to verify policies are in place:
-- 
-- SELECT * FROM storage.buckets WHERE id = 'avatars';
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
-- ============================================================================

