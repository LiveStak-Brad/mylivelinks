-- ============================================================================
-- LINK PHOTOS STORAGE POLICIES
-- Apply after creating 'link-photos' bucket (public)
-- ============================================================================

-- Allow authenticated users to upload their own link photos
-- Enforces path structure: {user_id}/{filename}
CREATE POLICY "link_photos_upload_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'link-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to link photos
-- Required for swipe cards, profile views, etc.
CREATE POLICY "link_photos_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'link-photos');

-- Optional: Allow users to delete their own photos
CREATE POLICY "link_photos_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'link-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check policies exist
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'link_photos%'
ORDER BY policyname;

-- Expected output:
-- link_photos_delete_own    | DELETE | {authenticated}
-- link_photos_public_read   | SELECT | {public}
-- link_photos_upload_own    | INSERT | {authenticated}

-- ============================================================================
-- PATH STRUCTURE ENFORCED
-- ============================================================================
-- ✅ Correct:   link-photos/{user_uuid}/1714672123-abc123.jpg
-- ❌ Wrong:     link-photos/link_photos/{user_uuid}/file.jpg
-- ❌ Wrong:     link-photos/shared/file.jpg
-- ============================================================================

-- Test upload path (for reference - use app to actually test):
-- const path = `${user.id}/${Date.now()}-${file.name}`;
-- await supabase.storage.from('link-photos').upload(path, file);
-- const url = supabase.storage.from('link-photos').getPublicUrl(path).data.publicUrl;
