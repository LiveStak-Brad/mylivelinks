-- ============================================================================
-- ROOM PRESENCE TABLE
-- Global room presence for /live page (separate from tile watching)
-- ============================================================================

CREATE TABLE IF NOT EXISTS room_presence (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    is_live_available BOOLEAN DEFAULT FALSE, -- Cached from live_streams
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_room_presence_last_seen_at ON room_presence(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_room_presence_is_live_available ON room_presence(is_live_available);

-- Enable RLS
ALTER TABLE room_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own presence
CREATE POLICY "Users can manage own room presence"
    ON room_presence FOR ALL
    USING (auth.uid() = profile_id)
    WITH CHECK (auth.uid() = profile_id);

-- RLS Policy: Everyone can view room presence (for viewer list)
CREATE POLICY "Room presence is viewable by everyone"
    ON room_presence FOR SELECT
    USING (true);

-- Function: Upsert room presence with live_available status
CREATE OR REPLACE FUNCTION upsert_room_presence(
    p_profile_id UUID,
    p_username VARCHAR(50),
    p_is_live_available BOOLEAN DEFAULT FALSE
)
RETURNS void AS $$
BEGIN
    INSERT INTO room_presence (profile_id, username, is_live_available, last_seen_at)
    VALUES (p_profile_id, p_username, p_is_live_available, CURRENT_TIMESTAMP)
    ON CONFLICT (profile_id) 
    DO UPDATE SET
        username = EXCLUDED.username,
        is_live_available = EXCLUDED.is_live_available,
        last_seen_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Function: Clean up stale presence (older than 60 seconds)
CREATE OR REPLACE FUNCTION cleanup_stale_room_presence()
RETURNS void AS $$
BEGIN
    DELETE FROM room_presence
    WHERE last_seen_at < CURRENT_TIMESTAMP - INTERVAL '60 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

