-- ============================================================================
-- 20251225_dm_backend.sql
-- MyLiveLinks Direct Messaging (DM) Backend
-- Supports text/image/video/gift + read receipts + 24h auto-delete after seen
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NULL,
  last_message_preview text NULL,
  last_message_type text NULL
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('text','image','video','gift','system')),

  body_text text NULL,

  media_url text NULL,
  media_mime text NULL,
  media_width int NULL,
  media_height int NULL,
  media_duration_ms int NULL,

  gift_id bigint NULL REFERENCES public.gifts(id) ON DELETE SET NULL,
  gift_name text NULL,
  gift_coins int NULL,
  gift_tx_id text NULL,

  request_id text NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz NULL,
  delete_at timestamptz NULL,
  deleted_at timestamptz NULL
);

-- Optional future-proofing for group chats
CREATE TABLE IF NOT EXISTS public.message_reads (
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, profile_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at_desc
  ON public.messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_deleted_at
  ON public.messages (conversation_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_messages_delete_at
  ON public.messages (delete_at)
  WHERE delete_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_messages_conversation_request_id
  ON public.messages (conversation_id, request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_participants_profile
  ON public.conversation_participants (profile_id);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation
  ON public.conversation_participants (conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
  ON public.conversations (last_message_at DESC NULLS LAST);

-- ============================================================================
-- Helper functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid, p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.profile_id = p_profile_id
  );
$$;

-- Keep conversations.updated_at fresh
CREATE OR REPLACE FUNCTION public.set_conversations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON public.conversations;
CREATE TRIGGER trg_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.set_conversations_updated_at();

-- Update conversation preview/last_message fields on message insert
CREATE OR REPLACE FUNCTION public.after_message_insert_update_conversation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_preview text;
BEGIN
  IF NEW.type = 'text' THEN
    v_preview := COALESCE(NEW.body_text, '');
  ELSIF NEW.type = 'image' THEN
    v_preview := '📷 Photo';
  ELSIF NEW.type = 'video' THEN
    v_preview := '🎥 Video';
  ELSIF NEW.type = 'gift' THEN
    v_preview := '🎁 Gift';
  ELSE
    v_preview := 'System';
  END IF;

  UPDATE public.conversations
  SET last_message_at = NEW.created_at,
      last_message_preview = v_preview,
      last_message_type = NEW.type
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_after_insert_conversation ON public.messages;
CREATE TRIGGER trg_messages_after_insert_conversation
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.after_message_insert_update_conversation();

-- Create or get an existing 1:1 conversation between caller and other participant
CREATE OR REPLACE FUNCTION public.get_or_create_dm_conversation(p_other_profile_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid;
  v_conversation_id uuid;
  v_candidate uuid;
  v_candidate_count int;
BEGIN
  v_me := auth.uid();

  IF v_me IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_other_profile_id IS NULL THEN
    RAISE EXCEPTION 'otherProfileId required';
  END IF;

  IF p_other_profile_id = v_me THEN
    RAISE EXCEPTION 'cannot message yourself';
  END IF;

  -- Find existing 1:1 conversation
  FOR v_candidate IN
    SELECT cp.conversation_id
    FROM public.conversation_participants cp
    WHERE cp.profile_id IN (v_me, p_other_profile_id)
    GROUP BY cp.conversation_id
    HAVING COUNT(DISTINCT cp.profile_id) = 2
  LOOP
    SELECT COUNT(*) INTO v_candidate_count
    FROM public.conversation_participants cp2
    WHERE cp2.conversation_id = v_candidate;

    IF v_candidate_count = 2 THEN
      v_conversation_id := v_candidate;
      EXIT;
    END IF;
  END LOOP;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create conversation + participants
  INSERT INTO public.conversations DEFAULT VALUES
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.conversation_participants (conversation_id, profile_id)
  VALUES
    (v_conversation_id, v_me),
    (v_conversation_id, p_other_profile_id);

  RETURN v_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_dm_conversation(uuid) TO authenticated;

-- List conversations for the current user (1:1 only)
CREATE OR REPLACE FUNCTION public.get_dm_conversations()
RETURNS TABLE (
  conversation_id uuid,
  other_profile_id uuid,
  other_username text,
  other_avatar_url text,
  other_display_name text,
  last_message_preview text,
  last_message_type text,
  last_message_at timestamptz,
  unread_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_conversations AS (
    SELECT cp.conversation_id
    FROM public.conversation_participants cp
    WHERE cp.profile_id = auth.uid()
  ),
  others AS (
    SELECT cp.conversation_id, cp.profile_id AS other_profile_id
    FROM public.conversation_participants cp
    JOIN my_conversations mc ON mc.conversation_id = cp.conversation_id
    WHERE cp.profile_id <> auth.uid()
  )
  SELECT
    c.id AS conversation_id,
    o.other_profile_id,
    p.username::text AS other_username,
    p.avatar_url::text AS other_avatar_url,
    p.display_name::text AS other_display_name,
    c.last_message_preview,
    c.last_message_type,
    c.last_message_at,
    (
      SELECT COUNT(*)
      FROM public.messages m
      WHERE m.conversation_id = c.id
        AND m.deleted_at IS NULL
        AND m.sender_id <> auth.uid()
        AND m.seen_at IS NULL
    ) AS unread_count
  FROM public.conversations c
  JOIN others o ON o.conversation_id = c.id
  JOIN public.profiles p ON p.id = o.other_profile_id
  ORDER BY COALESCE(c.last_message_at, c.updated_at, c.created_at) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_dm_conversations() TO authenticated;

-- Mark messages seen by the recipient; starts 24h delete timer
CREATE OR REPLACE FUNCTION public.mark_dm_seen(
  p_conversation_id uuid,
  p_message_ids uuid[] DEFAULT NULL,
  p_up_to_created_at timestamptz DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid;
  v_updated int;
BEGIN
  v_me := auth.uid();

  IF v_me IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF NOT public.is_conversation_participant(p_conversation_id, v_me) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.messages m
  SET seen_at = now(),
      delete_at = now() + interval '24 hours'
  WHERE m.conversation_id = p_conversation_id
    AND m.deleted_at IS NULL
    AND m.sender_id <> v_me
    AND m.seen_at IS NULL
    AND (
      (p_message_ids IS NOT NULL AND m.id = ANY(p_message_ids))
      OR (p_message_ids IS NULL AND p_up_to_created_at IS NOT NULL AND m.created_at <= p_up_to_created_at)
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_dm_seen(uuid, uuid[], timestamptz) TO authenticated;

-- Soft-delete messages whose delete_at has passed
CREATE OR REPLACE FUNCTION public.cfm_prune_seen_messages()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE public.messages
  SET deleted_at = now()
  WHERE deleted_at IS NULL
    AND delete_at IS NOT NULL
    AND delete_at <= now();

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cfm_prune_seen_messages() TO service_role;

-- ============================================================================
-- Realtime publication (optional)
-- ============================================================================

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN others THEN
    -- ignore if publication/table already configured or publication missing
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
  EXCEPTION WHEN others THEN
    NULL;
  END;
END;
$$;

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- conversations
DROP POLICY IF EXISTS "Participants can read conversations" ON public.conversations;
CREATE POLICY "Participants can read conversations"
  ON public.conversations FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
      AND cp.profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Deny direct conversation writes" ON public.conversations;
CREATE POLICY "Deny direct conversation writes"
  ON public.conversations FOR ALL
  USING (false)
  WITH CHECK (false);

-- conversation_participants
DROP POLICY IF EXISTS "Participants can read conversation participants" ON public.conversation_participants;
CREATE POLICY "Participants can read conversation participants"
  ON public.conversation_participants FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Deny direct participant writes" ON public.conversation_participants;
CREATE POLICY "Deny direct participant writes"
  ON public.conversation_participants FOR ALL
  USING (false)
  WITH CHECK (false);

-- messages
DROP POLICY IF EXISTS "Participants can read messages" ON public.messages;
CREATE POLICY "Participants can read messages"
  ON public.messages FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.profile_id = auth.uid()
    )
  );

-- Prevent direct updates (seen is via RPC)
REVOKE UPDATE ON public.messages FROM authenticated;

-- message_reads (optional future)
DROP POLICY IF EXISTS "Participants can read message_reads" ON public.message_reads;
CREATE POLICY "Participants can read message_reads"
  ON public.message_reads FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversation_participants cp
      ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reads.message_id
      AND cp.profile_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Deny direct message_reads writes" ON public.message_reads;
CREATE POLICY "Deny direct message_reads writes"
  ON public.message_reads FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- Optional: pg_cron schedule (run every 15 minutes if extension exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'mylivelinks_prune_seen_messages',
      '*/15 * * * *',
      $$SELECT public.cfm_prune_seen_messages();$$
    );
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END;
$$;
