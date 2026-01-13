-- ============================================================================
-- Allow service_role to call admin_live_health
-- Needed for owner dashboard health checks via service role key
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_live_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_requests bigint;
  v_success_requests bigint;
  v_failed_requests bigint;
  v_connected_requests bigint;
  v_token_success_rate numeric;
  v_connection_success_rate numeric;
  v_avg_join_time_ms numeric;
  v_live_count bigint;
  v_error_rate numeric;
BEGIN
  -- Allow service_role OR admin users
  IF auth.role() <> 'service_role' AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Count live streams
  SELECT COUNT(*) INTO v_live_count
  FROM public.live_streams
  WHERE status = 'live' AND live_available = true;

  -- Analyze join events from last 1 hour (if table exists)
  IF to_regclass('public.live_join_events') IS NOT NULL THEN
    SELECT
      COUNT(*) FILTER (WHERE phase = 'token_request'),
      COUNT(*) FILTER (WHERE phase = 'token_ok'),
      COUNT(*) FILTER (WHERE phase = 'room_failed'),
      COUNT(*) FILTER (WHERE phase = 'room_connected'),
      AVG(ms) FILTER (WHERE phase = 'room_connected' AND ms IS NOT NULL)
    INTO
      v_total_requests,
      v_success_requests,
      v_failed_requests,
      v_connected_requests,
      v_avg_join_time_ms
    FROM public.live_join_events
    WHERE created_at >= now() - interval '1 hour';
  ELSE
    v_total_requests := 0;
    v_success_requests := 0;
    v_failed_requests := 0;
    v_connected_requests := 0;
    v_avg_join_time_ms := NULL;
  END IF;

  -- Calculate rates
  IF v_total_requests > 0 THEN
    v_token_success_rate := ROUND((v_success_requests::numeric / v_total_requests::numeric) * 100, 2);
  ELSE
    v_token_success_rate := 100; -- Default to 100% if no data
  END IF;

  IF v_success_requests > 0 THEN
    v_connection_success_rate := ROUND((v_connected_requests::numeric / v_success_requests::numeric) * 100, 2);
  ELSE
    v_connection_success_rate := 100; -- Default to 100% if no data
  END IF;

  IF v_total_requests > 0 THEN
    v_error_rate := ROUND((v_failed_requests::numeric / v_total_requests::numeric) * 100, 2);
  ELSE
    v_error_rate := 0;
  END IF;

  RETURN jsonb_build_object(
    'live_count', COALESCE(v_live_count, 0),
    'token_success_rate', COALESCE(v_token_success_rate, 100),
    'connection_success_rate', COALESCE(v_connection_success_rate, 100),
    'avg_join_time_ms', COALESCE(ROUND(v_avg_join_time_ms, 2), 0),
    'error_rate', COALESCE(v_error_rate, 0),
    'total_requests_1h', COALESCE(v_total_requests, 0),
    'successful_connections_1h', COALESCE(v_connected_requests, 0),
    'failed_connections_1h', COALESCE(v_failed_requests, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_live_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_live_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_live_health() TO service_role;
