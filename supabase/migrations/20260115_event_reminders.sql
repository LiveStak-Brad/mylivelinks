-- ============================================================================
-- EVENT REMINDERS SYSTEM
-- ============================================================================
-- Allows users to set reminders for events on other users' calendars.
-- Reminders trigger notifications on the day of the event.
-- ============================================================================

BEGIN;

-- 1) Create event_reminders table
CREATE TABLE IF NOT EXISTS public.event_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.profile_events(id) ON DELETE CASCADE,
  remind_at timestamptz NOT NULL,
  notified boolean NOT NULL DEFAULT false,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT event_reminders_unique UNIQUE (user_id, event_id)
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_event_reminders_user
  ON public.event_reminders(user_id);

CREATE INDEX IF NOT EXISTS idx_event_reminders_remind_at
  ON public.event_reminders(remind_at)
  WHERE notified = false;

CREATE INDEX IF NOT EXISTS idx_event_reminders_event
  ON public.event_reminders(event_id);

-- 3) RLS
ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reminders" ON public.event_reminders;
CREATE POLICY "Users can view own reminders"
  ON public.event_reminders
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reminders" ON public.event_reminders;
CREATE POLICY "Users can insert own reminders"
  ON public.event_reminders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reminders" ON public.event_reminders;
CREATE POLICY "Users can delete own reminders"
  ON public.event_reminders
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4) RPC: set_event_reminder
-- Sets a reminder for an event (defaults to day-of at 9am local, but we store UTC)
DROP FUNCTION IF EXISTS public.set_event_reminder(uuid);
CREATE OR REPLACE FUNCTION public.set_event_reminder(
  p_event_id uuid
)
RETURNS public.event_reminders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_event public.profile_events;
  v_remind_at timestamptz;
  v_result public.event_reminders;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  -- Get the event
  SELECT * INTO v_event
  FROM public.profile_events
  WHERE id = p_event_id;
  
  IF v_event.id IS NULL THEN
    RAISE EXCEPTION 'event not found';
  END IF;
  
  -- Set reminder for 9am on the day of the event (in UTC, user's app can adjust display)
  v_remind_at := date_trunc('day', v_event.start_at) + interval '9 hours';
  
  -- If event is today and already past 9am, remind 1 hour before event
  IF v_remind_at < now() THEN
    v_remind_at := v_event.start_at - interval '1 hour';
  END IF;
  
  -- If still in the past, set to now
  IF v_remind_at < now() THEN
    v_remind_at := now();
  END IF;
  
  INSERT INTO public.event_reminders (
    user_id,
    event_id,
    remind_at
  )
  VALUES (
    v_uid,
    p_event_id,
    v_remind_at
  )
  ON CONFLICT (user_id, event_id) DO UPDATE
  SET remind_at = EXCLUDED.remind_at,
      notified = false,
      notified_at = NULL
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_event_reminder(uuid) TO authenticated;

-- 5) RPC: remove_event_reminder
DROP FUNCTION IF EXISTS public.remove_event_reminder(uuid);
CREATE OR REPLACE FUNCTION public.remove_event_reminder(
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
  
  DELETE FROM public.event_reminders
  WHERE user_id = v_uid
    AND event_id = p_event_id;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'reminder not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_event_reminder(uuid) TO authenticated;

-- 6) RPC: get_my_event_reminders
-- Returns all reminders for the current user with event details
DROP FUNCTION IF EXISTS public.get_my_event_reminders();
CREATE OR REPLACE FUNCTION public.get_my_event_reminders()
RETURNS TABLE (
  reminder_id uuid,
  event_id uuid,
  event_title text,
  event_start_at timestamptz,
  event_location text,
  event_url text,
  profile_id uuid,
  profile_username text,
  remind_at timestamptz,
  notified boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  
  RETURN QUERY
  SELECT
    er.id AS reminder_id,
    pe.id AS event_id,
    pe.title AS event_title,
    pe.start_at AS event_start_at,
    pe.location AS event_location,
    pe.url AS event_url,
    pe.profile_id,
    p.username AS profile_username,
    er.remind_at,
    er.notified
  FROM public.event_reminders er
  JOIN public.profile_events pe ON pe.id = er.event_id
  JOIN public.profiles p ON p.id = pe.profile_id
  WHERE er.user_id = v_uid
  ORDER BY pe.start_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_event_reminders() TO authenticated;

-- 7) RPC: check_event_reminder_exists
-- Check if user has a reminder set for an event
DROP FUNCTION IF EXISTS public.check_event_reminder_exists(uuid);
CREATE OR REPLACE FUNCTION public.check_event_reminder_exists(
  p_event_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_exists boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM public.event_reminders
    WHERE user_id = v_uid AND event_id = p_event_id
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_event_reminder_exists(uuid) TO authenticated;

-- 8) RPC: get_pending_event_reminders (for cron/notification service)
-- Returns reminders that need to be sent
DROP FUNCTION IF EXISTS public.get_pending_event_reminders();
CREATE OR REPLACE FUNCTION public.get_pending_event_reminders()
RETURNS TABLE (
  reminder_id uuid,
  user_id uuid,
  event_id uuid,
  event_title text,
  event_start_at timestamptz,
  event_location text,
  profile_id uuid,
  profile_username text,
  remind_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    er.id AS reminder_id,
    er.user_id,
    pe.id AS event_id,
    pe.title AS event_title,
    pe.start_at AS event_start_at,
    pe.location AS event_location,
    pe.profile_id,
    p.username AS profile_username,
    er.remind_at
  FROM public.event_reminders er
  JOIN public.profile_events pe ON pe.id = er.event_id
  JOIN public.profiles p ON p.id = pe.profile_id
  WHERE er.notified = false
    AND er.remind_at <= now()
  ORDER BY er.remind_at ASC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_event_reminders() TO service_role;

-- 9) RPC: mark_reminder_notified
DROP FUNCTION IF EXISTS public.mark_reminder_notified(uuid);
CREATE OR REPLACE FUNCTION public.mark_reminder_notified(
  p_reminder_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  UPDATE public.event_reminders
  SET notified = true,
      notified_at = now()
  WHERE id = p_reminder_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_reminder_notified(uuid) TO service_role;

-- 10) Grants
GRANT SELECT ON TABLE public.event_reminders TO authenticated;
GRANT INSERT, DELETE ON TABLE public.event_reminders TO authenticated;

COMMIT;
