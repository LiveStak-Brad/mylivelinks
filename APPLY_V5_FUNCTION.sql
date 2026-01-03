-- ============================================================================
-- V5 FUNCTION - FINAL PostgREST Cache Bypass
-- ============================================================================
-- V4 got cached with wrong signature too. V5 = fresh start.
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.rpc_get_team_chat_messages_v5(uuid, int, timestamptz, uuid);

CREATE OR REPLACE FUNCTION public.rpc_get_team_chat_messages_v5(
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
  SELECT
    m.id AS message_id,
    m.team_id,
    m.author_id,
    p.username AS author_username,
    p.display_name AS author_display_name,
    p.avatar_url AS author_avatar_url,
    CASE WHEN m.is_deleted THEN '[Message deleted]' ELSE m.content END AS content,
    m.reply_to_id,
    CASE
      WHEN m.reply_to_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'id', rm.id,
          'author_username', rp.username,
          'content', CASE WHEN rm.is_deleted THEN '[deleted]' ELSE LEFT(rm.content, 100) END
        )
        FROM public.team_chat_messages rm
        JOIN public.profiles rp ON rp.id = rm.author_id
        WHERE rm.id = m.reply_to_id
      )
      ELSE NULL
    END AS reply_to_preview,
    m.is_system,
    m.is_deleted,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('emoji', r.emoji, 'count', r.cnt))
        FROM (
          SELECT tcr.emoji, COUNT(*) as cnt
          FROM public.team_chat_reactions tcr
          WHERE tcr.message_id = m.id
          GROUP BY tcr.emoji
          ORDER BY cnt DESC
          LIMIT 5
        ) r
      ),
      '[]'::jsonb
    ) AS reactions,
    m.created_at
  FROM public.team_chat_messages m
  JOIN public.profiles p ON p.id = m.author_id
  WHERE m.team_id = p_team_id
    AND (
      p_before_created_at IS NULL
      OR (m.created_at, m.id) < (p_before_created_at, p_before_id)
    )
  ORDER BY m.created_at ASC, m.id ASC
  LIMIT v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_team_chat_messages_v5(uuid, int, timestamptz, uuid) TO authenticated;

COMMIT;

SELECT 'V5 created - Update client to use v5' AS result;
