BEGIN;

DROP FUNCTION IF EXISTS public.rpc_get_team_pool_gift_quote_24h(uuid);
CREATE OR REPLACE FUNCTION public.rpc_get_team_pool_gift_quote_24h(
  p_team_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_active_count int;
  v_base bigint;
  v_suggestions bigint[];
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_team_id IS NULL THEN
    RAISE EXCEPTION 'team_id_required';
  END IF;

  IF public.is_team_banned(p_team_id, v_actor) THEN
    RAISE EXCEPTION 'banned';
  END IF;

  IF NOT public.is_team_approved_member(p_team_id, v_actor) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*)::int
  INTO v_active_count
  FROM public.rpc_get_active_team_members_24h(p_team_id)
  WHERE member_id <> v_actor;

  IF COALESCE(v_active_count, 0) <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'team_id', p_team_id,
      'active_count', 0,
      'suggestions', '[]'::jsonb
    );
  END IF;

  v_base := v_active_count::bigint;
  v_suggestions := ARRAY[
    v_base,
    v_base * 10,
    v_base * 100,
    v_base * 1000,
    v_base * 10000,
    v_base * 100000
  ];

  RETURN jsonb_build_object(
    'success', true,
    'team_id', p_team_id,
    'active_count', v_active_count,
    'suggestions', (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM unnest(v_suggestions) x)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_get_team_pool_gift_quote_24h(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_team_pool_gift_quote_24h(uuid) TO authenticated;

COMMIT;
