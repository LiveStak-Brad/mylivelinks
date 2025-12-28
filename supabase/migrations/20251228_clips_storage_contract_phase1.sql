BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('clips', 'clips', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Clip assets are publicly readable when clip is public and ready'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Clip assets are publicly readable when clip is public and ready"
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'clips'
        AND name ~ '^clips/[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/(source\\.mp4|thumb\\.jpg)$'
        AND EXISTS (
          SELECT 1
          FROM public.clips c
          WHERE c.id = (regexp_match(name, '^clips/([0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12})/'))[1]::uuid
            AND c.visibility = 'public'
            AND c.status = 'ready'
        )
      )
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Users can read own clip assets'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can read own clip assets"
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'clips'
        AND auth.uid() IS NOT NULL
        AND name ~ '^clips/[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/'
        AND EXISTS (
          SELECT 1
          FROM public.clips c
          WHERE c.id = (regexp_match(name, '^clips/([0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12})/'))[1]::uuid
            AND c.producer_profile_id = auth.uid()
        )
      )
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Users can upload own clip assets'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can upload own clip assets"
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'clips'
        AND auth.uid() IS NOT NULL
        AND name ~ '^clips/[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/(source\\.mp4|thumb\\.jpg)$'
        AND EXISTS (
          SELECT 1
          FROM public.clips c
          WHERE c.id = (regexp_match(name, '^clips/([0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12})/'))[1]::uuid
            AND c.producer_profile_id = auth.uid()
        )
      )
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Users can update own clip assets'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can update own clip assets"
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'clips'
        AND auth.uid() IS NOT NULL
        AND name ~ '^clips/[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/(source\\.mp4|thumb\\.jpg)$'
        AND EXISTS (
          SELECT 1
          FROM public.clips c
          WHERE c.id = (regexp_match(name, '^clips/([0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12})/'))[1]::uuid
            AND c.producer_profile_id = auth.uid()
        )
      )
      WITH CHECK (
        bucket_id = 'clips'
        AND auth.uid() IS NOT NULL
        AND name ~ '^clips/[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/(source\\.mp4|thumb\\.jpg)$'
        AND EXISTS (
          SELECT 1
          FROM public.clips c
          WHERE c.id = (regexp_match(name, '^clips/([0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12})/'))[1]::uuid
            AND c.producer_profile_id = auth.uid()
        )
      )
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Users can delete own clip assets'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can delete own clip assets"
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'clips'
        AND auth.uid() IS NOT NULL
        AND name ~ '^clips/[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}/(source\\.mp4|thumb\\.jpg)$'
        AND EXISTS (
          SELECT 1
          FROM public.clips c
          WHERE c.id = (regexp_match(name, '^clips/([0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12})/'))[1]::uuid
            AND c.producer_profile_id = auth.uid()
        )
      )
    $pol$;
  END IF;
END;
$$;

COMMIT;
