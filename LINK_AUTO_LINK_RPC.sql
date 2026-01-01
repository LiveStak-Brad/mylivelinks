-- ============================================================================
-- AUTO-LINK CANDIDATES RPC
-- Returns candidates who have auto_link_on_follow = true
-- ============================================================================

CREATE OR REPLACE FUNCTION rpc_get_auto_link_candidates(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_result jsonb;
BEGIN
  v_profile_id := auth.uid();
  
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get enabled link profiles with auto_link_on_follow = true
  -- Exclude self, already decided, and already mutual
  SELECT jsonb_agg(candidate_data)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'profile_id', lp.profile_id,
      'enabled', lp.enabled,
      'bio', lp.bio,
      'location_text', lp.location_text,
      'photos', lp.photos,
      'tags', lp.tags,
      'created_at', lp.created_at,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'auto_link_enabled', true
    ) as candidate_data
    FROM link_profiles lp
    JOIN profiles p ON p.id = lp.profile_id
    JOIN link_settings ls ON ls.profile_id = lp.profile_id
    WHERE lp.enabled = true
      AND ls.auto_link_on_follow = true
      AND lp.profile_id != v_profile_id
      AND NOT EXISTS (
        SELECT 1 FROM link_decisions ld
        WHERE ld.from_profile_id = v_profile_id
          AND ld.to_profile_id = lp.profile_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM link_mutuals lm
        WHERE (lm.profile_a = LEAST(v_profile_id, lp.profile_id)
           AND lm.profile_b = GREATEST(v_profile_id, lp.profile_id))
      )
    ORDER BY lp.updated_at DESC, lp.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) candidates;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Grant permissions (same pattern as regular candidates)
REVOKE ALL ON FUNCTION rpc_get_auto_link_candidates(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_get_auto_link_candidates(int, int) TO anon, authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test RPC exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'rpc_get_auto_link_candidates';

-- Expected: 1 row with routine_type = 'FUNCTION'

-- Test permissions
SELECT routine_name, grantee
FROM information_schema.role_routine_grants
WHERE routine_name = 'rpc_get_auto_link_candidates'
ORDER BY grantee;

-- Expected:
-- rpc_get_auto_link_candidates | anon
-- rpc_get_auto_link_candidates | authenticated
