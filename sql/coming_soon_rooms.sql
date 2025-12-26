-- Coming Soon Rooms Table
-- Stores themed room ideas that users can express interest in

CREATE TABLE IF NOT EXISTS coming_soon_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_key TEXT UNIQUE NOT NULL, -- URL-friendly identifier (e.g., 'cod-room')
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('gaming', 'music', 'entertainment')),
  image_url TEXT, -- URL to room cover image
  fallback_gradient TEXT DEFAULT 'from-purple-600 to-pink-600', -- Tailwind gradient classes
  interest_threshold INTEGER DEFAULT 5000, -- How many interested users to open
  current_interest_count INTEGER DEFAULT 0, -- Cached count (updated by trigger)
  status TEXT DEFAULT 'interest' CHECK (status IN ('draft', 'interest', 'opening_soon', 'live', 'paused')),
  display_order INTEGER DEFAULT 0,
  disclaimer_required BOOLEAN DEFAULT false, -- For rooms like Roast Room
  disclaimer_text TEXT,
  special_badge TEXT, -- e.g., "Comedy / Roast"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Room Interest Table - tracks which users are interested in which rooms
CREATE TABLE IF NOT EXISTS room_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES coming_soon_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  notify_on_open BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_room_interests_room ON room_interests(room_id);
CREATE INDEX IF NOT EXISTS idx_room_interests_user ON room_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_coming_soon_rooms_status ON coming_soon_rooms(status);

-- Function to update interest count when interests change
CREATE OR REPLACE FUNCTION update_room_interest_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE coming_soon_rooms 
    SET current_interest_count = current_interest_count + 1,
        updated_at = now()
    WHERE id = NEW.room_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE coming_soon_rooms 
    SET current_interest_count = GREATEST(current_interest_count - 1, 0),
        updated_at = now()
    WHERE id = OLD.room_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update interest count
DROP TRIGGER IF EXISTS trigger_room_interest_count ON room_interests;
CREATE TRIGGER trigger_room_interest_count
  AFTER INSERT OR DELETE ON room_interests
  FOR EACH ROW EXECUTE FUNCTION update_room_interest_count();

-- RLS Policies
ALTER TABLE coming_soon_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_interests ENABLE ROW LEVEL SECURITY;

-- Anyone can view rooms that are not drafts
CREATE POLICY "Public can view active rooms" ON coming_soon_rooms
  FOR SELECT USING (status != 'draft');

-- Only admins can modify rooms
CREATE POLICY "Admins can manage rooms" ON coming_soon_rooms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_owner = true
    )
  );

-- Users can see their own interests
CREATE POLICY "Users can view own interests" ON room_interests
  FOR SELECT USING (user_id = auth.uid());

-- Users can add/remove their own interests
CREATE POLICY "Users can manage own interests" ON room_interests
  FOR ALL USING (user_id = auth.uid());

-- Seed initial rooms
INSERT INTO coming_soon_rooms (room_key, name, description, category, image_url, fallback_gradient, display_order, disclaimer_required, special_badge, disclaimer_text) VALUES
  ('cod-room', 'Call of Duty Room', 'Join the ultimate CoD community. Watch epic plays, discuss loadouts, and compete with fellow soldiers.', 'gaming', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&h=400&fit=crop', 'from-stone-800 via-zinc-900 to-black', 1, false, NULL, NULL),
  ('fortnite-room', 'Fortnite Room', 'Drop in with the Fortnite community! Watch victory royales, discuss strategies, and flex your skins.', 'gaming', 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=600&h=400&fit=crop', 'from-purple-600 via-blue-500 to-cyan-400', 2, false, NULL, NULL),
  ('gta-rp-room', 'GTA RP Room', 'Roleplay with the best. Watch cinematic storylines, bank heists, and the craziest RP moments.', 'gaming', 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&h=400&fit=crop', 'from-purple-900 via-pink-700 to-orange-500', 3, false, NULL, NULL),
  ('valorant-room', 'Valorant Room', 'Tactical shooters unite! Discuss agents, watch clutch plays, and learn from the pros.', 'gaming', 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=600&h=400&fit=crop', 'from-red-600 via-rose-500 to-pink-400', 4, false, NULL, NULL),
  ('2k-madden-room', '2K / Madden Room', 'Sports gaming at its finest. NBA 2K, Madden, FIFA — all the sports gaming content in one place.', 'gaming', 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&h=400&fit=crop', 'from-orange-500 via-red-600 to-rose-700', 5, false, NULL, NULL),
  ('rap-battle-room', 'Rap Battle Room', 'Bars on bars. Watch live rap battles, freestyle sessions, and discover raw talent.', 'music', 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=600&h=400&fit=crop', 'from-yellow-600 via-amber-700 to-orange-800', 6, false, NULL, NULL),
  ('open-mic-room', 'Open Mic Room', 'Your stage awaits. Singers, musicians, poets — share your art with a live audience.', 'music', 'https://images.unsplash.com/photo-1478147427282-58a87a120781?w=600&h=400&fit=crop', 'from-violet-600 via-purple-700 to-indigo-800', 7, false, NULL, NULL),
  ('roast-room', 'Roast Room', 'Think you can handle the heat? Watch and participate in comedy roasts with consenting participants.', 'entertainment', 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=600&h=400&fit=crop', 'from-red-700 via-orange-600 to-yellow-500', 8, true, 'Comedy / Roast', 'All participants must provide consent. Community guidelines apply.')
ON CONFLICT (room_key) DO NOTHING;

