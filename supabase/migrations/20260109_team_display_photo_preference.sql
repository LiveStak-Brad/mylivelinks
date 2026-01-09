-- Add display_photo_preference to teams table
-- Allows team admins to choose between banner or icon for home/landing page display

ALTER TABLE teams
ADD COLUMN IF NOT EXISTS display_photo_preference TEXT DEFAULT 'banner' CHECK (display_photo_preference IN ('banner', 'icon'));

COMMENT ON COLUMN teams.display_photo_preference IS 'Photo to display on home/team landing page: banner or icon';
