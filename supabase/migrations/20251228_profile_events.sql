BEGIN;

-- ============================================================================
-- LOGIC AGENT 1 — Profile Events System (Upcoming Events)
-- ============================================================================
-- Creates dedicated profile_events table with timestamptz fields,
-- RPCs for CRUD + reordering, and RLS policies.
-- Replaces mock data for "Upcoming Events" section in musician/comedian profiles.
-- ============================================================================

-- 1) Create profile_events table
CREATE TABLE IF NOT EXISTS public.profile_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Event details
  title text NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NULL,
  location text NULL,
  url text NULL,
  notes text NULL,
  
  -- Ordering
  sort_order int NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT profile_events_end_after_start CHECK (
    end_at IS NULL OR end_at >= start_at
  )
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_profile_events_profile_sort
  ON public.profile_events(profile_id, sort_order, start_at);

CREATE INDEX IF NOT EXISTS idx_profile_events_profile_start_desc
  ON public.profile_events(profile_id, start_at DESC);

-- 3) Updated_at trigger
DROP TRIGGER IF EXISTS trg_profile_events_set_updated_at ON public.profile_events;
CREATE TRIGGER trg_profile_events_set_updated_at
BEFORE UPDATE ON public.profile_events
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE public.profile_events ENABLE ROW LEVEL SECURITY;

-- SELECT: public readable (anyone can view events)
DROP POLICY IF EXISTS "Profile events are viewable by everyone" ON public.profile_events;
CREATE POLICY "Profile events are viewable by everyone"
  ON public.profile_events
  FOR SELECT
  USING (true);

-- INSERT: owner only
DROP POLICY IF EXISTS "Users can insert own profile events" ON public.profile_events;
CREATE POLICY "Users can insert own profile events"
  ON public.profile_events
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- UPDATE: owner only
DROP POLICY IF EXISTS "Users can update own profile events" ON public.profile_events;
CREATE POLICY "Users can update own profile events"
  ON public.profile_events
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- DELETE: owner only
DROP POLICY IF EXISTS "Users can delete own profile events" ON public.profile_events;
CREATE POLICY "Users can delete own profile events"
  ON public.profile_events
  FOR DELETE
  USING (auth.uid() = profile_id);

-- ============================================================================
-- RPCs (Canonical for Web + Mobile)
-- ============================================================================

-- RPC: get_profile_events
-- Returns all events for a profile, ordered by sort_order then start_at
DROP FUNCTION IF EXISTS public.get_profile_events(uuid);
CREATE OR REPLACE FUNCTION public.get_profile_events(
  p_profile_id uuid
)
RETURNS TABLE (
  id uuid,
  profile_id uuid,
  title text,
  start_at timestamptz,
  end_at timestamptz,
  location text,
  url text,
  notes text,
  sort_order int,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.id,
    pe.profile_id,
    pe.title,
    pe.start_at,
    pe.end_at,
    pe.location,
    pe.url,
    pe.notes,
    pe.sort_order,
    pe.created_at,
    pe.updated_at
  FROM public.profile_events pe
  WHERE pe.profile_id = p_profile_id
  ORDER BY pe.sort_order ASC, pe.start_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_events(uuid) TO anon, authenticated;

-- RPC: upsert_profile_event
-- Owner only: insert new event or update existing event
DROP FUNCTION IF EXISTS public.upsert_profile_event(jsonb);
CREATE OR REPLACE FUNCTION public.upsert_profile_event(
  p_event jsonb
)
RETURNS public.profile_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_event_id uuid;
  v_result public.profile_events;
BEGIN
  v_uid := auth.uid();
  
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  -- Extract id if present
  v_event_id := (p_event->>'id')::uuid;
  
  IF v_event_id IS NOT NULL THEN
    -- UPDATE existing event
    UPDATE public.profile_events
    SET
      title = COALESCE(p_event->>'title', title),
      start_at = COALESCE((p_event->>'start_at')::timestamptz, start_at),
      end_at = CASE
        WHEN p_event ? 'end_at' THEN (p_event->>'end_at')::timestamptz
        ELSE end_at
      END,
      location = CASE
        WHEN p_event ? 'location' THEN p_event->>'location'
        ELSE location
      END,
      url = CASE
        WHEN p_event ? 'url' THEN p_event->>'url'
        ELSE url
      END,
      notes = CASE
        WHEN p_event ? 'notes' THEN p_event->>'notes'
        ELSE notes
      END,
      sort_order = COALESCE((p_event->>'sort_order')::int, sort_order)
    WHERE id = v_event_id
      AND profile_id = v_uid
    RETURNING * INTO v_result;
    
    IF v_result.id IS NULL THEN
      RAISE EXCEPTION 'event not found or unauthorized';
    END IF;
  ELSE
    -- INSERT new event
    INSERT INTO public.profile_events (
      profile_id,
      title,
      start_at,
      end_at,
      location,
      url,
      notes,
      sort_order
    )
    VALUES (
      v_uid,
      p_event->>'title',
      (p_event->>'start_at')::timestamptz,
      (p_event->>'end_at')::timestamptz,
      p_event->>'location',
      p_event->>'url',
      p_event->>'notes',
      COALESCE((p_event->>'sort_order')::int, 0)
    )
    RETURNING * INTO v_result;
  END IF;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_profile_event(jsonb) TO authenticated;

-- RPC: delete_profile_event
-- Owner only: delete event by id
DROP FUNCTION IF EXISTS public.delete_profile_event(uuid);
CREATE OR REPLACE FUNCTION public.delete_profile_event(
  p_event_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_deleted int;
BEGIN
  v_uid := auth.uid();
  
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  DELETE FROM public.profile_events
  WHERE id = p_event_id
    AND profile_id = v_uid;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'event not found or unauthorized';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_profile_event(uuid) TO authenticated;

-- RPC: reorder_profile_events
-- Owner only: reorder events by providing ordered array of IDs
DROP FUNCTION IF EXISTS public.reorder_profile_events(uuid, uuid[]);
CREATE OR REPLACE FUNCTION public.reorder_profile_events(
  p_profile_id uuid,
  p_ordered_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_expected int;
  v_distinct int;
  v_nulls int;
  v_owned int;
BEGIN
  v_uid := auth.uid();
  
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  -- Verify ownership
  IF v_uid != p_profile_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  WITH input AS (
    SELECT x.id, x.ord
    FROM unnest(p_ordered_ids) WITH ORDINALITY AS x(id, ord)
  )
  SELECT
    count(*)::int,
    count(distinct id)::int,
    count(*) FILTER (WHERE id IS NULL)::int
  INTO v_expected, v_distinct, v_nulls
  FROM input;

  IF COALESCE(v_expected, 0) = 0 THEN
    RETURN;
  END IF;
  IF COALESCE(v_nulls, 0) > 0 THEN
    RAISE EXCEPTION 'null ids in reorder list';
  END IF;
  IF v_expected <> v_distinct THEN
    RAISE EXCEPTION 'duplicate ids in reorder list';
  END IF;

  SELECT count(*)::int
  INTO v_owned
  FROM public.profile_events
  WHERE profile_id = p_profile_id
    AND id = ANY(p_ordered_ids);

  IF v_owned <> v_expected THEN
    RAISE EXCEPTION 'invalid reorder set';
  END IF;

  WITH input AS (
    SELECT x.id, x.ord
    FROM unnest(p_ordered_ids) WITH ORDINALITY AS x(id, ord)
  )
  UPDATE public.profile_events t
  SET sort_order = (input.ord - 1)
  FROM input
  WHERE t.id = input.id
    AND t.profile_id = p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_profile_events(uuid, uuid[]) TO authenticated;

-- ============================================================================
-- Grants
-- ============================================================================

GRANT SELECT ON TABLE public.profile_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.profile_events TO authenticated;

COMMIT;



