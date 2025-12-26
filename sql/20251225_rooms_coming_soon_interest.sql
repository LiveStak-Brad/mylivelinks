CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_key text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('gaming','music','entertainment')),
  status text NOT NULL DEFAULT 'interest' CHECK (status IN ('draft','interest','opening_soon','live','paused')),
  description text,
  image_url text,
  interest_threshold int NOT NULL DEFAULT 500,
  current_interest_count int NOT NULL DEFAULT 0,
  layout_type text NOT NULL DEFAULT 'grid' CHECK (layout_type IN ('grid','versus','panel')),
  max_participants int NOT NULL DEFAULT 12,
  disclaimer_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooms_category ON public.rooms(category);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_interest_count ON public.rooms(current_interest_count DESC);

CREATE TABLE IF NOT EXISTS public.room_interest (
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_room_interest_profile_id ON public.room_interest(profile_id);

CREATE OR REPLACE FUNCTION public.rooms_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_rooms_set_updated_at ON public.rooms;
CREATE TRIGGER trigger_rooms_set_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.rooms_set_updated_at();

CREATE OR REPLACE FUNCTION public.rooms_apply_interest_count_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.rooms
    SET current_interest_count = current_interest_count + 1,
        updated_at = now()
    WHERE id = NEW.room_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.rooms
    SET current_interest_count = GREATEST(current_interest_count - 1, 0),
        updated_at = now()
    WHERE id = OLD.room_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_rooms_interest_count_insert ON public.room_interest;
CREATE TRIGGER trigger_rooms_interest_count_insert
AFTER INSERT ON public.room_interest
FOR EACH ROW
EXECUTE FUNCTION public.rooms_apply_interest_count_change();

DROP TRIGGER IF EXISTS trigger_rooms_interest_count_delete ON public.room_interest;
CREATE TRIGGER trigger_rooms_interest_count_delete
AFTER DELETE ON public.room_interest
FOR EACH ROW
EXECUTE FUNCTION public.rooms_apply_interest_count_change();

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_interest ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='rooms' AND policyname='Rooms are publicly readable'
  ) THEN
    EXECUTE 'CREATE POLICY "Rooms are publicly readable" ON public.rooms FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='rooms' AND policyname='Admins can manage rooms'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can manage rooms" ON public.rooms FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='room_interest' AND policyname='Room interest is viewable by owner'
  ) THEN
    EXECUTE 'CREATE POLICY "Room interest is viewable by owner" ON public.room_interest FOR SELECT USING (auth.uid() = profile_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='room_interest' AND policyname='Users can express interest'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can express interest" ON public.room_interest FOR INSERT WITH CHECK (auth.uid() = profile_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='room_interest' AND policyname='Users can remove interest'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can remove interest" ON public.room_interest FOR DELETE USING (auth.uid() = profile_id)';
  END IF;
END $$;

INSERT INTO public.rooms (room_key, name, category, status, description, image_url, interest_threshold, layout_type, max_participants, disclaimer_required)
VALUES
  ('cod', 'Call of Duty', 'gaming', 'interest', NULL, NULL, 500, 'grid', 12, false),
  ('fortnite', 'Fortnite', 'gaming', 'interest', NULL, NULL, 500, 'grid', 12, false),
  ('gta_rp', 'GTA RP', 'gaming', 'interest', NULL, NULL, 500, 'grid', 12, false),
  ('valorant', 'Valorant', 'gaming', 'interest', NULL, NULL, 500, 'grid', 12, false),
  ('nba2k_madden', 'NBA 2K / Madden', 'gaming', 'interest', NULL, NULL, 500, 'grid', 12, false),
  ('rap_battle', 'Rap Battle', 'music', 'interest', NULL, NULL, 500, 'panel', 12, false),
  ('open_mic', 'Open Mic', 'music', 'interest', NULL, NULL, 500, 'panel', 12, false),
  ('roast_room', 'Roast Room', 'entertainment', 'interest', NULL, NULL, 500, 'panel', 12, true)
ON CONFLICT (room_key)
DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  interest_threshold = EXCLUDED.interest_threshold,
  layout_type = EXCLUDED.layout_type,
  max_participants = EXCLUDED.max_participants,
  disclaimer_required = EXCLUDED.disclaimer_required,
  updated_at = now();
