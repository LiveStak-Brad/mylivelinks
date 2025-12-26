-- ============================================================================
-- Room Templates Schema
-- Allows owners to create reusable room templates for quick room creation
-- ============================================================================

-- Create room_templates table
CREATE TABLE IF NOT EXISTS room_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template Identity
    name TEXT NOT NULL,
    description TEXT,
    
    -- Layout Settings
    layout_type TEXT NOT NULL DEFAULT 'grid' CHECK (layout_type IN ('grid', 'versus', 'panel')),
    
    -- Default Room Settings
    default_max_participants INTEGER DEFAULT 12,
    default_status TEXT DEFAULT 'interest' CHECK (default_status IN ('draft', 'interest', 'opening_soon', 'live', 'paused')),
    default_interest_threshold INTEGER DEFAULT 5000,
    default_category TEXT DEFAULT 'entertainment',
    
    -- Disclaimer Settings
    default_disclaimer_required BOOLEAN DEFAULT FALSE,
    default_disclaimer_text TEXT,
    
    -- Feature Flags (for future expansion)
    gifts_enabled BOOLEAN DEFAULT TRUE,
    chat_enabled BOOLEAN DEFAULT TRUE,
    
    -- Appearance Defaults
    default_fallback_gradient TEXT DEFAULT 'from-purple-600 to-pink-600',
    default_theme_color TEXT,  -- hex color
    
    -- Metadata
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Soft delete
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Add template_id column to coming_soon_rooms if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coming_soon_rooms' AND column_name = 'template_id'
    ) THEN
        ALTER TABLE coming_soon_rooms ADD COLUMN template_id UUID REFERENCES room_templates(id);
    END IF;
END $$;

-- Add layout_type column to coming_soon_rooms if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coming_soon_rooms' AND column_name = 'layout_type'
    ) THEN
        ALTER TABLE coming_soon_rooms ADD COLUMN layout_type TEXT DEFAULT 'grid' CHECK (layout_type IN ('grid', 'versus', 'panel'));
    END IF;
END $$;

-- Add max_participants column to coming_soon_rooms if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coming_soon_rooms' AND column_name = 'max_participants'
    ) THEN
        ALTER TABLE coming_soon_rooms ADD COLUMN max_participants INTEGER DEFAULT 12;
    END IF;
END $$;

-- Add theme_color column to coming_soon_rooms if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coming_soon_rooms' AND column_name = 'theme_color'
    ) THEN
        ALTER TABLE coming_soon_rooms ADD COLUMN theme_color TEXT;
    END IF;
END $$;

-- Add background_image column to coming_soon_rooms if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coming_soon_rooms' AND column_name = 'background_image'
    ) THEN
        ALTER TABLE coming_soon_rooms ADD COLUMN background_image TEXT;
    END IF;
END $$;

-- Add subtitle column to coming_soon_rooms if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coming_soon_rooms' AND column_name = 'subtitle'
    ) THEN
        ALTER TABLE coming_soon_rooms ADD COLUMN subtitle TEXT;
    END IF;
END $$;

-- Add gifts_enabled column to coming_soon_rooms if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coming_soon_rooms' AND column_name = 'gifts_enabled'
    ) THEN
        ALTER TABLE coming_soon_rooms ADD COLUMN gifts_enabled BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Add chat_enabled column to coming_soon_rooms if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coming_soon_rooms' AND column_name = 'chat_enabled'
    ) THEN
        ALTER TABLE coming_soon_rooms ADD COLUMN chat_enabled BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_room_templates_created_by ON room_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_room_templates_is_deleted ON room_templates(is_deleted);
CREATE INDEX IF NOT EXISTS idx_coming_soon_rooms_template_id ON coming_soon_rooms(template_id);

-- Enable RLS
ALTER TABLE room_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for room_templates
-- Only app admins can read templates
CREATE POLICY "App admins can read templates" ON room_templates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND (p.is_admin = TRUE OR p.is_owner = TRUE)
        )
    );

-- Only app admins can insert templates
CREATE POLICY "App admins can insert templates" ON room_templates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND (p.is_admin = TRUE OR p.is_owner = TRUE)
        )
    );

-- Only app admins can update templates
CREATE POLICY "App admins can update templates" ON room_templates
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND (p.is_admin = TRUE OR p.is_owner = TRUE)
        )
    );

-- Only owners can delete templates
CREATE POLICY "Owners can delete templates" ON room_templates
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.is_owner = TRUE
        )
    );

-- Comment
COMMENT ON TABLE room_templates IS 'Reusable room templates for quick room creation. Owner Panel feature.';

