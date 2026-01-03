-- ============================================================================
-- MINIMAL TEST RPC - Simplified version to test data flow
-- ============================================================================
-- Purpose: Create a minimal RPC to isolate whether the issue is with:
--   1. Complex query logic
--   2. Type casting
--   3. Data retrieval
-- ============================================================================

BEGIN;

-- Drop existing test function if it exists
DROP FUNCTION IF EXISTS public.test_get_team_messages(uuid);

-- Create minimal test function with basic types only
CREATE OR REPLACE FUNCTION public.test_get_team_messages(p_team_id uuid)
RETURNS TABLE (
  message_id uuid,
  author_username text,
  content text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id AS message_id,
    COALESCE(p.username, 'unknown') AS author_username,
    m.content,
    m.created_at
  FROM public.team_chat_messages m
  LEFT JOIN public.profiles p ON p.id = m.author_id
  WHERE m.team_id = p_team_id
  ORDER BY m.created_at ASC
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.test_get_team_messages(uuid) TO authenticated;

COMMIT;

-- Test the function immediately
SELECT * FROM public.test_get_team_messages('b1c67fa9-3eff-4313-9c95-1498d28725dd'::uuid);

SELECT 'Minimal test function created. If this works but v3 fails, the issue is with v3 query complexity.' AS result;

-- ============================================================================
-- INSTRUCTIONS FOR CLIENT-SIDE TESTING:
-- ============================================================================
-- If this function returns data successfully:
--   1. Update hooks/useTeam.ts line 833 temporarily to:
--      await supabase.rpc('test_get_team_messages', { p_team_id: teamId })
--   2. Adjust the message mapping to match the simpler return structure
--   3. If messages appear in UI, the problem is with the v3 function logic
-- ============================================================================
