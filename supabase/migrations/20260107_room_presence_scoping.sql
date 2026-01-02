-- ============================================================================
-- Room Presence Scoping
-- Adds per-room scoping for room_presence and related RPCs
-- ============================================================================

BEGIN;

-- Ensure room_presence has room_id column
ALTER TABLE public.room_presence
ADD COLUMN IF NOT EXISTS room_id text;

-- Backfill existing presence rows to the legacy global room id
UPDATE public.room_presence
SET room_id = COALESCE(room_id, 'live_central')
WHERE room_id IS NULL;

-- Require room_id and switch primary key to (profile_id, room_id)
ALTER TABLE public.room_presence
ALTER COLUMN room_id SET NOT NULL;

ALTER TABLE public.room_presence
DROP CONSTRAINT IF EXISTS room_presence_pkey;

ALTER TABLE public.room_presence
ADD CONSTRAINT room_presence_pkey PRIMARY KEY (profile_id, room_id);

-- Helpful indexes for per-room queries
CREATE INDEX IF NOT EXISTS idx_room_presence_room_last_seen
ON public.room_presence(room_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_room_presence_room_live
ON public.room_presence(room_id, is_live_available)
WHERE is_live_available IS TRUE;

-- ============================================================================
-- upsert_room_presence(room scoped)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_room_presence(
  p_profile_id uuid,
  p_username text,
  p_room_id text DEFAULT 'live_central',
  p_is_live_available boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.room_presence (profile_id, username, room_id, is_live_available, last_seen_at)
  VALUES (p_profile_id, p_username, COALESCE(NULLIF(p_room_id, ''), 'live_central'), p_is_live_available, CURRENT_TIMESTAMP)
  ON CONFLICT (profile_id, room_id)
  DO UPDATE SET
    username = EXCLUDED.username,
    is_live_available = EXCLUDED.is_live_available,
    last_seen_at = CURRENT_TIMESTAMP;
END;
$$;

-- ============================================================================
-- get_room_presence_count with optional room scope
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_room_presence_count(
  p_profile_id uuid DEFAULT NULL,
  p_room_id text DEFAULT 'live_central'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.room_presence
  WHERE last_seen_at > CURRENT_TIMESTAMP - INTERVAL '60 seconds'
    AND (p_profile_id IS NULL OR profile_id != p_profile_id)
    AND (p_room_id IS NULL OR room_id = p_room_id);

  RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_room_presence_count_minus_self(
  p_room_id text DEFAULT 'live_central'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_count integer;
BEGIN
  v_profile_id := auth.uid();
  SELECT get_room_presence_count(v_profile_id, p_room_id) INTO v_count;
  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_room_presence(uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_presence_count(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_presence_count_minus_self(text) TO authenticated;

COMMIT;
