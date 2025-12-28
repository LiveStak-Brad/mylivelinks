BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-media', 'profile-media', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DO $$
BEGIN
  -- Public read for music track audio + covers under profile-media
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Profile media music tracks are publicly readable'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Profile media music tracks are publicly readable"
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'profile-media'
        AND name LIKE '%/music/tracks/%'
      )
    $pol$;
  END IF;

  -- Owner insert limited to their profile folder + music/tracks subtree.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Users can upload own music tracks to profile-media'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can upload own music tracks to profile-media"
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'profile-media'
        AND auth.uid() IS NOT NULL
        AND name LIKE (auth.uid()::text || '/music/tracks/%')
      )
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Users can update own music tracks in profile-media'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can update own music tracks in profile-media"
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'profile-media'
        AND auth.uid() IS NOT NULL
        AND name LIKE (auth.uid()::text || '/music/tracks/%')
      )
      WITH CHECK (
        bucket_id = 'profile-media'
        AND auth.uid() IS NOT NULL
        AND name LIKE (auth.uid()::text || '/music/tracks/%')
      )
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Users can delete own music tracks in profile-media'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can delete own music tracks in profile-media"
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'profile-media'
        AND auth.uid() IS NOT NULL
        AND name LIKE (auth.uid()::text || '/music/tracks/%')
      )
    $pol$;
  END IF;
END;
$$;

COMMIT;
