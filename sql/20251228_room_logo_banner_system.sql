-- ============================================================================
-- Room Logo & Banner System
-- Auto-generated banners for each room with logo, title, and presenter
-- ============================================================================

-- Add room logo and presenter fields to coming_soon_rooms (room instances)
DO $$
BEGIN
    -- Room Logo URL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coming_soon_rooms' AND column_name = 'room_logo_url'
    ) THEN
        ALTER TABLE coming_soon_rooms ADD COLUMN room_logo_url TEXT;
        COMMENT ON COLUMN coming_soon_rooms.room_logo_url IS 'URL to room logo image for banner display';
    END IF;

    -- Presented By Text (e.g., "Presented by MyLiveLinks Official")
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coming_soon_rooms' AND column_name = 'presented_by'
    ) THEN
        ALTER TABLE coming_soon_rooms ADD COLUMN presented_by TEXT;
        COMMENT ON COLUMN coming_soon_rooms.presented_by IS 'Presenter text for banner (e.g., owner/admin name or "MyLiveLinks Official")';
    END IF;

    -- Banner Style (for future expansion: 'default', 'minimal', 'card', 'gradient')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coming_soon_rooms' AND column_name = 'banner_style'
    ) THEN
        ALTER TABLE coming_soon_rooms ADD COLUMN banner_style TEXT DEFAULT 'default';
        COMMENT ON COLUMN coming_soon_rooms.banner_style IS 'Visual style for the room banner';
    END IF;
END $$;

-- Add default logo and presenter to room_templates
DO $$
BEGIN
    -- Default Room Logo URL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'room_templates' AND column_name = 'default_room_logo_url'
    ) THEN
        ALTER TABLE room_templates ADD COLUMN default_room_logo_url TEXT;
        COMMENT ON COLUMN room_templates.default_room_logo_url IS 'Default logo URL for rooms created from this template';
    END IF;

    -- Default Presented By Text
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'room_templates' AND column_name = 'default_presented_by'
    ) THEN
        ALTER TABLE room_templates ADD COLUMN default_presented_by TEXT;
        COMMENT ON COLUMN room_templates.default_presented_by IS 'Default presenter text for rooms created from this template';
    END IF;

    -- Default Banner Style
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'room_templates' AND column_name = 'default_banner_style'
    ) THEN
        ALTER TABLE room_templates ADD COLUMN default_banner_style TEXT DEFAULT 'default';
        COMMENT ON COLUMN room_templates.default_banner_style IS 'Default banner style for rooms created from this template';
    END IF;
END $$;

-- Update Live Central room (if it exists) with default branding
UPDATE coming_soon_rooms
SET 
    presented_by = 'Presented by MyLiveLinks Official',
    banner_style = 'default'
WHERE room_key = 'live-central' OR name = 'Live Central';

-- Create storage bucket for room logos if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('room-logos', 'room-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for room logos
DO $$
BEGIN
    -- Allow public read access
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Room logos are publicly accessible'
    ) THEN
        CREATE POLICY "Room logos are publicly accessible"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'room-logos');
    END IF;

    -- Allow owners/admins to upload
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Owners can upload room logos'
    ) THEN
        CREATE POLICY "Owners can upload room logos"
        ON storage.objects FOR INSERT
        WITH CHECK (
            bucket_id = 'room-logos' 
            AND auth.role() = 'authenticated'
            AND EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND (is_owner = true OR is_admin = true)
            )
        );
    END IF;

    -- Allow owners/admins to update
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Owners can update room logos'
    ) THEN
        CREATE POLICY "Owners can update room logos"
        ON storage.objects FOR UPDATE
        USING (
            bucket_id = 'room-logos' 
            AND auth.role() = 'authenticated'
            AND EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND (is_owner = true OR is_admin = true)
            )
        );
    END IF;

    -- Allow owners/admins to delete
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Owners can delete room logos'
    ) THEN
        CREATE POLICY "Owners can delete room logos"
        ON storage.objects FOR DELETE
        USING (
            bucket_id = 'room-logos' 
            AND auth.role() = 'authenticated'
            AND EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND (is_owner = true OR is_admin = true)
            )
        );
    END IF;
END $$;

-- Comment
COMMENT ON TABLE coming_soon_rooms IS 'Room instances with custom logo and banner branding';

