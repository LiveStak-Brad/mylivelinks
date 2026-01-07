BEGIN;

-- Add media_url to team feed comments
ALTER TABLE public.team_feed_comments
ADD COLUMN IF NOT EXISTS media_url text;

-- Add media_url to team chat messages
ALTER TABLE public.team_chat_messages
ADD COLUMN IF NOT EXISTS media_url text;

-- ---------------------------------------------------------------------------
-- Extend rpc_get_post_comments to return media_url
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.rpc_get_post_comments(uuid, int, int);
CREATE OR REPLACE FUNCTION public.rpc_get_post_comments(
  p_post_id uuid,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  comment_id uuid,
  post_id uuid,
  author_id uuid,
  author_username text,
  author_display_name text,
  author_avatar_url text,
  text_content text,
  media_url text,
  parent_comment_id uuid,
  created_at timestamptz,
  gift_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_team_id uuid;
BEGIN
  SELECT p.team_id INTO v_team_id
  FROM public.team_feed_posts p
  WHERE p.id = p_post_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  IF NOT public.is_team_approved_member(v_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    c.id AS comment_id,
    c.post_id,
    c.author_id,
    pr.username::text AS author_username,
    pr.display_name::text AS author_display_name,
    pr.avatar_url::text AS author_avatar_url,
    c.text_content,
    c.media_url,
    c.parent_comment_id,
    c.created_at,
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM public.gifts g
      WHERE g.team_comment_id = c.id
    ), 0) AS gift_count
  FROM public.team_feed_comments c
  JOIN public.profiles pr ON pr.id = c.author_id
  WHERE c.post_id = p_post_id
  ORDER BY c.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ---------------------------------------------------------------------------
-- Extend rpc_create_team_comment to accept p_media_url
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.rpc_create_team_comment(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.rpc_create_team_comment(uuid, text, uuid, text);

CREATE OR REPLACE FUNCTION public.rpc_create_team_comment(
  p_post_id uuid,
  p_text_content text,
  p_parent_comment_id uuid DEFAULT NULL,
  p_media_url text DEFAULT NULL
)
RETURNS public.team_feed_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_post_team_id uuid;
  v_comment public.team_feed_comments;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT p.team_id INTO v_post_team_id
  FROM public.team_feed_posts p
  WHERE p.id = p_post_id;

  IF v_post_team_id IS NULL THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  IF public.is_team_banned(v_post_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'banned';
  END IF;

  IF NOT public.is_team_approved_member(v_post_team_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.team_feed_comments (team_id, post_id, author_id, text_content, media_url, parent_comment_id)
  VALUES (v_post_team_id, p_post_id, auth.uid(), p_text_content, p_media_url, p_parent_comment_id)
  RETURNING * INTO v_comment;

  UPDATE public.team_feed_posts
  SET comment_count = comment_count + 1,
      updated_at = now()
  WHERE id = p_post_id;

  RETURN v_comment;
END;
$$;

-- ---------------------------------------------------------------------------
-- Extend team chat RPCs to support media_url
-- ---------------------------------------------------------------------------
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
  media_url text,
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
      m.media_url,
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
    wr.media_url,
    wr.reply_to_id,
    wr.reply_preview AS reply_to_preview,
    wr.is_system,
    wr.is_deleted,
    wr.reactions_agg AS reactions,
    wr.created_at
  FROM with_reactions wr
  ORDER BY wr.created_at ASC, wr.id ASC;
END;
$$;

DROP FUNCTION IF EXISTS public.rpc_send_team_chat_message(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.rpc_send_team_chat_message(uuid, text, uuid, text);
CREATE OR REPLACE FUNCTION public.rpc_send_team_chat_message(
  p_team_id uuid,
  p_content text,
  p_reply_to_id uuid DEFAULT NULL,
  p_media_url text DEFAULT NULL
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

  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message cannot be empty');
  END IF;

  IF length(p_content) > 2000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message too long (max 2000 characters)');
  END IF;

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

  INSERT INTO public.team_chat_messages (team_id, author_id, content, media_url, reply_to_id)
  VALUES (p_team_id, v_user_id, trim(p_content), p_media_url, p_reply_to_id)
  RETURNING id INTO v_message_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_message_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_get_post_comments(uuid, int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_create_team_comment(uuid, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_team_chat_messages(uuid, int, timestamptz, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_send_team_chat_message(uuid, text, uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rpc_get_post_comments(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_team_comment(uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_team_chat_messages(uuid, int, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_send_team_chat_message(uuid, text, uuid, text) TO authenticated;

COMMIT;
