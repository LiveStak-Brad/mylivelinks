-- ============================================================================
-- WORKAROUND: Create NEW function with different name to bypass cache
-- ============================================================================
-- Since PostgREST is caching the old broken version of rpc_get_team_chat_messages,
-- we'll create a NEW function with a slightly different name.
-- Then update your frontend to call this new function temporarily.
-- ============================================================================

BEGIN;

-- Create the FIXED version with a new name
CREATE OR REPLACE FUNCTION public.rpc_get_team_chat_messages_v2(
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
      COALESCE(tm.role::text, 'Team_Member') as role_text  -- FIX: Cast enum to text in CTE
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
            SELECT tcr.emoji, COUNT(*) as cnt
            FROM public.team_chat_reactions tcr
            WHERE tcr.message_id = wr.id
            GROUP BY tcr.emoji
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
    wr.role_text AS author_role,  -- FIX: Using pre-cast text field
    CASE WHEN wr.is_deleted THEN '[Message deleted]' ELSE wr.content END AS content,
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.rpc_get_team_chat_messages_v2(uuid, int, timestamptz, uuid) TO authenticated;

COMMIT;

SELECT 'NEW function rpc_get_team_chat_messages_v2 created successfully!' AS result;
SELECT 'Now update hooks/useTeam.ts to call this function instead' AS next_step;
