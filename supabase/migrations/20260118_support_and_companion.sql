-- ============================================================================
-- AI Support + Companion Foundations
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- SUPPORT TICKETS
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES public.profiles(id),
  message text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  ai_summary jsonb,
  ai_error text,
  ai_model text,
  ai_duration_ms int,
  status text NOT NULL DEFAULT 'open',
  source text NOT NULL DEFAULT 'support',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS trg_support_tickets_set_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_set_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_support_tickets_reporter ON public.support_tickets(reporter_profile_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_tickets_insert_own
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_profile_id);

CREATE POLICY support_tickets_update_own
  ON public.support_tickets
  FOR UPDATE
  USING (auth.uid() = reporter_profile_id)
  WITH CHECK (auth.uid() = reporter_profile_id);

CREATE POLICY support_tickets_read_own
  ON public.support_tickets
  FOR SELECT
  USING (auth.uid() = reporter_profile_id);

CREATE POLICY support_tickets_staff_full_access
  ON public.support_tickets
  FOR ALL
  USING (public.is_owner(auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()) OR public.is_admin(auth.uid()));

-- --------------------------------------------------------------------------
-- SUPPORT MESSAGES (THREADS ON TICKETS)
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_profile_id uuid REFERENCES public.profiles(id),
  role text NOT NULL DEFAULT 'user',
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_sender ON public.support_messages(sender_profile_id);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_messages_read_own_ticket
  ON public.support_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (t.reporter_profile_id = auth.uid() OR public.is_owner(auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY support_messages_insert_participants
  ON public.support_messages
  FOR INSERT
  WITH CHECK (
    (sender_profile_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.reporter_profile_id = auth.uid()
    ))
    OR public.is_owner(auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY support_messages_update_staff
  ON public.support_messages
  FOR UPDATE
  USING (public.is_owner(auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()) OR public.is_admin(auth.uid()));

-- --------------------------------------------------------------------------
-- COMPANION CHAT LOGS
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.support_companion_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id uuid NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL DEFAULT 'user',
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_support_companion_profile_created_at
  ON public.support_companion_messages(profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_companion_session
  ON public.support_companion_messages(session_id);

ALTER TABLE public.support_companion_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY companion_messages_read_own
  ON public.support_companion_messages
  FOR SELECT
  USING (auth.uid() = profile_id OR public.is_owner(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY companion_messages_insert_own
  ON public.support_companion_messages
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY companion_messages_staff_manage
  ON public.support_companion_messages
  FOR ALL
  USING (public.is_owner(auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()) OR public.is_admin(auth.uid()));

COMMIT;
