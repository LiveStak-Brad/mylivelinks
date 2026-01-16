-- Add view_count column to replay_playlist_items table
-- Run this in Supabase SQL Editor

-- Add view_count column if it doesn't exist
ALTER TABLE replay_playlist_items 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_replay_playlist_items_view_count 
ON replay_playlist_items(view_count);

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'replay_playlist_items' 
AND column_name = 'view_count';
