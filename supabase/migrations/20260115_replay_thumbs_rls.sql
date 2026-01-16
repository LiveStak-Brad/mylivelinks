-- Add RLS policies for replay_thumbs storage bucket
-- Allows authenticated users to upload thumbnails to their own folder

BEGIN;

-- Create the bucket if it doesn't exist (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('replay_thumbs', 'replay_thumbs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own replay thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own replay thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own replay thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view replay thumbnails" ON storage.objects;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own replay thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'replay_thumbs'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own replay thumbnails"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'replay_thumbs'
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'replay_thumbs'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own replay thumbnails"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'replay_thumbs'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (bucket is public)
CREATE POLICY "Anyone can view replay thumbnails"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'replay_thumbs');

COMMIT;
