-- Replay Banner Setup
-- Run this in Supabase SQL Editor to enable the Replay banner feature
-- Uses the existing channel_banners bucket with a "global" folder

-- Allow owners to upload to channel_banners/global folder (for Replay banner)
DROP POLICY IF EXISTS "Owners can upload global banners" ON storage.objects;
CREATE POLICY "Owners can upload global banners"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'channel_banners'
    AND (storage.foldername(name))[1] = 'global'
    AND auth.uid() IN (
      '2b4a1178-3c39-4179-94ea-314dd824a818'::uuid,
      '0b47a2d7-43fb-4d38-b321-2d5d0619aabf'::uuid
    )
  );

-- Allow owners to update global banners
DROP POLICY IF EXISTS "Owners can update global banners" ON storage.objects;
CREATE POLICY "Owners can update global banners"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'channel_banners'
    AND (storage.foldername(name))[1] = 'global'
    AND auth.uid() IN (
      '2b4a1178-3c39-4179-94ea-314dd824a818'::uuid,
      '0b47a2d7-43fb-4d38-b321-2d5d0619aabf'::uuid
    )
  );

-- Allow owners to delete global banners
DROP POLICY IF EXISTS "Owners can delete global banners" ON storage.objects;
CREATE POLICY "Owners can delete global banners"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'channel_banners'
    AND (storage.foldername(name))[1] = 'global'
    AND auth.uid() IN (
      '2b4a1178-3c39-4179-94ea-314dd824a818'::uuid,
      '0b47a2d7-43fb-4d38-b321-2d5d0619aabf'::uuid
    )
  );

-- Verify channel_banners bucket exists
SELECT 'channel_banners bucket exists' AS status
WHERE EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'channel_banners');
