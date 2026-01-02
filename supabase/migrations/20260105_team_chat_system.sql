-- ============================================================================
-- TEAM CHAT SYSTEM
-- ============================================================================
-- Real-time team chat with messages, replies, and reactions.
-- ============================================================================

BEGIN;

-- 1) Create team_chat_messages table
CREATE TABLE IF NOT EXISTS public.team_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(trim(content)) > 0 AND length(content) <= 2000),
  reply_to_id uuid REFERENCES public.team_chat_messages(id) ON DELETE SET NULL,
  is_system boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_team_chat_messages_team_created
  ON public.team_chat_messages(team_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_team_chat_messages_author
  ON public.team_chat_messages(author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_chat_messages_reply_to
  ON public.team_chat_messages(reply_to_id)
  WHERE reply_to_id IS NOT NULL;

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_team_chat_messages_updated_at ON public.team_chat_messages;
CREATE TRIGGER trg_team_chat_messages_updated_at
BEFORE UPDATE ON public.team_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 2) Create team_chat_reactions table
CREATE TABLE IF NOT EXISTS public.team_chat_reactions (
  message_id uuid NOT NULL REFERENCES public.team_chat_messages(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (length(emoji) BETWEEN 1 AND 8),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, profile_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_team_chat_reactions_message
  ON public.team_chat_reactions(message_id);

-- 3) Enable RLS
ALTER TABLE public.team_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_chat_reactions ENABLE ROW LEVEL SECURITY;

-- 4) RLS Policies for team_chat_messages

-- Select: Team members can read messages
DROP POLICY IF EXISTS "Team members can read chat messages" ON public.team_chat_messages;
CREATE POLICY "Team members can read chat messages"
  ON public.team_chat_messages
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND public.is_team_approved_member(team_id, auth.uid())
    AND NOT public.is_team_banned(team_id, auth.uid())
  );

-- Insert: Team members can send messages (if not muted)
DROP POLICY IF EXISTS "Team members can send messages" ON public.team_chat_messages;
CREATE POLICY "Team members can send messages"
  ON public.team_chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND author_id = auth.uid()
    AND public.is_team_approved_member(team_id, auth.uid())
    AND NOT public.is_team_banned(team_id, auth.uid())
    AND NOT public.is_team_muted(team_id, auth.uid(), 0)
  );

-- Update: Authors can edit their own messages, mods can soft-delete
DROP POLICY IF EXISTS "Authors and mods can update messages" ON public.team_chat_messages;
CREATE POLICY "Authors and mods can update messages"
  ON public.team_chat_messages
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND public.is_team_approved_member(team_id, auth.uid())
    AND (author_id = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.is_team_approved_member(team_id, auth.uid())
    AND (author_id = auth.uid() OR public.team_can_moderate(team_id, auth.uid()))
  );

-- Delete: Only mods can hard delete
DROP POLICY IF EXISTS "Mods can delete messages" ON public.team_chat_messages;
CREATE POLICY "Mods can delete messages"
  ON public.team_chat_messages
  FOR DELETE
  USING (public.team_can_moderate(team_id, auth.uid()));

-- 5) RLS Policies for team_chat_reactions

DROP POLICY IF EXISTS "Team members can view reactions" ON public.team_chat_reactions;
CREATE POLICY "Team members can view reactions"
  ON public.team_chat_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_chat_messages m
      WHERE m.id = message_id
        AND public.is_team_approved_member(m.team_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Team members can add reactions" ON public.team_chat_reactions;
CREATE POLICY "Team members can add reactions"
  ON public.team_chat_reactions
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.team_chat_messages m
      WHERE m.id = message_id
        AND public.is_team_approved_member(m.team_id, auth.uid())
        AND NOT public.is_team_muted(m.team_id, auth.uid(), 0)
    )
  );

DROP POLICY IF EXISTS "Users can remove own reactions" ON public.team_chat_reactions;
CREATE POLICY "Users can remove own reactions"
  ON public.team_chat_reactions
  FOR DELETE
  USING (profile_id = auth.uid());

-- 6) Grants
GRANT SELECT, INSERT, UPDATE ON TABLE public.team_chat_messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.team_chat_reactions TO authenticated;

-- ============================================================================
-- RPC: rpc_get_team_chat_messages
-- ============================================================================
DROP FUNCTION IF EXISTS public.rpc_get_team_chat_messages(uuid, int, timestamptz, uuid);
CREATE OR REPLACE FUNCTION public.rpc_get_team_chat_messages(
  p_team_id uuid,
  p_limit int DEFAULT 50,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL
)
RETURNS TABLE (
  message_id uuid,
  team_id uuid,
  author_id uuid,
  author_username text,
  author_display_name text,
  author_avatar_url text,
  author_role text,
  content text,
  reply_to_id uuid,
  reply_to_preview jsonb,
  is_system boolean,
  is_deleted boolean,
  reactions jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_limit int;
BEGIN
  -- Auth checks
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF NOT public.is_team_approved_member(p_team_id, v_user_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF public.is_team_banned(p_team_id, v_user_id) THEN
    RAISE EXCEPTION 'banned';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);

  RETURN QUERY
  WITH messages AS (
    SELECT
      m.id,
      m.team_id,
      m.author_id,
      m.content,
      m.reply_to_id,
      m.is_system,
      m.is_deleted,
      m.created_at
    FROM public.team_chat_messages m
    WHERE m.team_id = p_team_id
      AND (
        p_before_created_at IS NULL
        OR (m.created_at, m.id) < (p_before_created_at, p_before_id)
      )
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT v_limit
  ),
  with_authors AS (
    SELECT
      msg.*,
      p.username,
      p.display_name,
      p.avatar_url,
      tm.role
    FROM messages msg
    JOIN public.profiles p ON p.id = msg.author_id
    LEFT JOIN public.team_memberships tm ON tm.team_id = msg.team_id AND tm.profile_id = msg.author_id AND tm.status = 'approved'
  ),
  with_replies AS (
    SELECT
      wa.*,
      CASE
        WHEN wa.reply_to_id IS NOT NULL THEN (
          SELECT jsonb_build_object(
            'id', rm.id,
            'author_username', rp.username,
            'content', CASE WHEN rm.is_deleted THEN '[deleted]' ELSE LEFT(rm.content, 100) END
          )
          FROM public.team_chat_messages rm
          JOIN public.profiles rp ON rp.id = rm.author_id
          WHERE rm.id = wa.reply_to_id
        )
        ELSE NULL
      END AS reply_preview
    FROM with_authors wa
  ),
  with_reactions AS (
    SELECT
      wr.*,
      COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object('emoji', r.emoji, 'count', r.cnt))
          FROM (
            SELECT emoji, COUNT(*) as cnt
            FROM public.team_chat_reactions
            WHERE message_id = wr.id
            GROUP BY emoji
            ORDER BY cnt DESC
            LIMIT 5
          ) r
        ),
        '[]'::jsonb
      ) AS reactions_agg
    FROM with_replies wr
  )
  SELECT
    wr.id AS message_id,
    wr.team_id,
    wr.author_id,
    wr.username AS author_username,
    wr.display_name AS author_display_name,
    wr.avatar_url AS author_avatar_url,
    wr.role::text AS author_role,
    CASE WHEN wr.is_deleted THEN '[Message deleted]' ELSE wr.content END AS content,
    wr.reply_to_id,
    wr.reply_preview AS reply_to_preview,
    wr.is_system,
    wr.is_deleted,
    wr.reactions_agg AS reactions,
    wr.created_at
  FROM with_reactions wr
  ORDER BY wr.created_at ASC, wr.id ASC;  -- Return in ascending order for display
END;
$$;

-- ============================================================================
-- RPC: rpc_send_team_chat_message
-- ============================================================================
DROP FUNCTION IF EXISTS public.rpc_send_team_chat_message(uuid, text, uuid);
CREATE OR REPLACE FUNCTION public.rpc_send_team_chat_message(
  p_team_id uuid,
  p_content text,
  p_reply_to_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_message_id uuid;
  v_reply_team_id uuid;
BEGIN
  -- Auth checks
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF NOT public.is_team_approved_member(p_team_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a team member');
  END IF;

  IF public.is_team_banned(p_team_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are banned from this team');
  END IF;

  IF public.is_team_muted(p_team_id, v_user_id, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are muted in this team');
  END IF;

  -- Validate content
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message cannot be empty');
  END IF;

  IF length(p_content) > 2000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message too long (max 2000 characters)');
  END IF;

  -- Validate reply_to if provided
  IF p_reply_to_id IS NOT NULL THEN
    SELECT team_id INTO v_reply_team_id
    FROM public.team_chat_messages
    WHERE id = p_reply_to_id;

    IF v_reply_team_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Reply message not found');
    END IF;

    IF v_reply_team_id != p_team_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot reply to message from different team');
    END IF;
  END IF;

  -- Insert message
  INSERT INTO public.team_chat_messages (team_id, author_id, content, reply_to_id)
  VALUES (p_team_id, v_user_id, trim(p_content), p_reply_to_id)
  RETURNING id INTO v_message_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id
  );
END;
$$;

-- ============================================================================
-- RPC: rpc_delete_team_chat_message (soft delete)
-- ============================================================================
DROP FUNCTION IF EXISTS public.rpc_delete_team_chat_message(uuid);
CREATE OR REPLACE FUNCTION public.rpc_delete_team_chat_message(p_message_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_message record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_message
  FROM public.team_chat_messages
  WHERE id = p_message_id;

  IF v_message IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message not found');
  END IF;

  -- Check permissions: author can delete own, mods can delete any
  IF v_message.author_id != v_user_id AND NOT public.team_can_moderate(v_message.team_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  UPDATE public.team_chat_messages
  SET is_deleted = true, deleted_at = now(), deleted_by = v_user_id
  WHERE id = p_message_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- RPC: rpc_react_team_chat_message
-- ============================================================================
DROP FUNCTION IF EXISTS public.rpc_react_team_chat_message(uuid, text);
CREATE OR REPLACE FUNCTION public.rpc_react_team_chat_message(
  p_message_id uuid,
  p_emoji text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_existed boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get team_id from message
  SELECT team_id INTO v_team_id
  FROM public.team_chat_messages
  WHERE id = p_message_id;

  IF v_team_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message not found');
  END IF;

  IF NOT public.is_team_approved_member(v_team_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a team member');
  END IF;

  IF public.is_team_muted(v_team_id, v_user_id, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are muted');
  END IF;

  -- Toggle reaction: if exists, remove; otherwise, add
  DELETE FROM public.team_chat_reactions
  WHERE message_id = p_message_id AND profile_id = v_user_id AND emoji = p_emoji
  RETURNING true INTO v_existed;

  IF v_existed THEN
    RETURN jsonb_build_object('success', true, 'action', 'removed');
  END IF;

  INSERT INTO public.team_chat_reactions (message_id, profile_id, emoji)
  VALUES (p_message_id, v_user_id, p_emoji);

  RETURN jsonb_build_object('success', true, 'action', 'added');
END;
$$;

-- ============================================================================
-- Grants for RPCs
-- ============================================================================
REVOKE ALL ON FUNCTION public.rpc_get_team_chat_messages(uuid, int, timestamptz, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_send_team_chat_message(uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_delete_team_chat_message(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_react_team_chat_message(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rpc_get_team_chat_messages(uuid, int, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_send_team_chat_message(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_delete_team_chat_message(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_react_team_chat_message(uuid, text) TO authenticated;

-- ============================================================================
-- Enable Realtime for team_chat_messages
-- ============================================================================
DO $$
BEGIN
  -- Add table to realtime publication if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'team_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_chat_messages;
  END IF;
END $$;

COMMIT;

-- Done!
SELECT 'Team chat system created successfully' AS result;
