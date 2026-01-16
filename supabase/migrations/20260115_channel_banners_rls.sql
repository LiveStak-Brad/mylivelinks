-- Add RLS policies for channel_banners storage bucket
-- Allows authenticated users to upload channel banners to their own folder

BEGIN;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload own channel banner" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own channel banner" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own channel banner" ON storage.objects;
DROP POLICY IF EXISTS "Channel banners are publicly viewable" ON storage.objects;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own channel banner"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'channel_banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own channel banner"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'channel_banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'channel_banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own channel banner"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'channel_banners'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (bucket is public)
CREATE POLICY "Channel banners are publicly viewable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'channel_banners');

COMMIT;
