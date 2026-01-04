-- ============================================================================
-- Linkler Prompt RPC + Support Indexes
-- ============================================================================

BEGIN;

-- Helper indexes for support messaging workloads
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_created
  ON public.support_messages(ticket_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_companion_session_created
  ON public.support_companion_messages(session_id, created_at DESC);

-- ============================================================================
-- Read-only RPC for Linkler system prompts
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_system_prompt(text);

CREATE OR REPLACE FUNCTION public.get_system_prompt(p_key text)
RETURNS TABLE(key text, content text, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_requester uuid := auth.uid();
  v_is_allowed boolean := false;
BEGIN
  IF v_requester IS NULL THEN
    -- Service key / internal calls
    v_is_allowed := true;
  ELSE
    SELECT
      (public.is_admin(v_requester) OR public.is_owner(v_requester))
    INTO v_is_allowed;
  END IF;

  IF NOT COALESCE(v_is_allowed, false) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT sp.key, sp.content, sp.updated_at
  FROM public.system_prompts sp
  WHERE sp.key = p_key
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_system_prompt(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_prompt(text) TO service_role;

COMMIT;
