-- ============================================================================
-- TEAM ASSETS STORAGE BUCKET + RLS
-- Run this in the Supabase SQL Editor
-- ============================================================================

-- 1) Create the bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-assets',
  'team-assets',
  true,  -- public read access
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 2) Drop old policies if they exist
DROP POLICY IF EXISTS "Team admins can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "team_assets_insert" ON storage.objects;
DROP POLICY IF EXISTS "team_assets_select" ON storage.objects;
DROP POLICY IF EXISTS "team_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "team_assets_delete" ON storage.objects;

-- 3) Simple INSERT policy: Authenticated team admins can upload to their team folder
CREATE POLICY "team_assets_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'team-assets'
  AND EXISTS (
    SELECT 1 FROM team_memberships tm
    WHERE tm.profile_id = auth.uid()
      AND tm.role = 'Team_Admin'
      AND tm.status = 'approved'
      AND (
        -- Path format: icons/{team_id}.ext or banners/{team_id}.ext
        name LIKE 'icons/' || tm.team_id::text || '.%'
        OR name LIKE 'banners/' || tm.team_id::text || '.%'
      )
  )
);

-- 4) UPDATE policy: Same as insert (for upsert)
CREATE POLICY "team_assets_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'team-assets'
  AND EXISTS (
    SELECT 1 FROM team_memberships tm
    WHERE tm.profile_id = auth.uid()
      AND tm.role = 'Team_Admin'
      AND tm.status = 'approved'
      AND (
        name LIKE 'icons/' || tm.team_id::text || '.%'
        OR name LIKE 'banners/' || tm.team_id::text || '.%'
      )
  )
);

-- 5) DELETE policy
CREATE POLICY "team_assets_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'team-assets'
  AND EXISTS (
    SELECT 1 FROM team_memberships tm
    WHERE tm.profile_id = auth.uid()
      AND tm.role = 'Team_Admin'
      AND tm.status = 'approved'
      AND (
        name LIKE 'icons/' || tm.team_id::text || '.%'
        OR name LIKE 'banners/' || tm.team_id::text || '.%'
      )
  )
);

-- 6) Public SELECT policy (anyone can view team assets)
CREATE POLICY "team_assets_select" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'team-assets');

-- Done!
SELECT 'team-assets bucket and policies created successfully' AS result;
