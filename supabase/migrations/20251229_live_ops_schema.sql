-- Live Ops Schema Migration
-- Agent C (P0): Live stream operations, controls, and join metrics
-- Creates: live_streams enhancements, live_controls, live_join_events

BEGIN;

-- Ensure live_streams table exists (adapt if present)
CREATE TABLE IF NOT EXISTS public.live_streams (
  id bigserial PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_name text,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  status text DEFAULT 'live' CHECK (status IN ('live', 'ended', 'error')),
  region text,
  live_available boolean DEFAULT true,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  unpublished_at timestamptz,
  total_viewer_minutes bigint DEFAULT 0,
  webrtc_channel text,
  webrtc_token text,
  webrtc_uid bigint,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new columns if table already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'live_streams' AND column_name = 'room_name'
  ) THEN
    ALTER TABLE public.live_streams ADD COLUMN room_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'live_streams' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.live_streams ADD COLUMN status text DEFAULT 'live' CHECK (status IN ('live', 'ended', 'error'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'live_streams' AND column_name = 'region'
  ) THEN
    ALTER TABLE public.live_streams ADD COLUMN region text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'live_streams' AND column_name = 'host_profile_id'
  ) THEN
    -- Map profile_id to host_profile_id (keep profile_id as well for backward compat)
    -- host_profile_id is just an alias
    NULL;
  END IF;
END $$;

-- Create index on status and started_at for efficient queries
CREATE INDEX IF NOT EXISTS idx_live_streams_status_started 
  ON public.live_streams(status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_streams_profile_id 
  ON public.live_streams(profile_id);

-- Live Controls Table
CREATE TABLE IF NOT EXISTS public.live_controls (
  stream_id bigint PRIMARY KEY REFERENCES public.live_streams(id) ON DELETE CASCADE,
  chat_muted boolean DEFAULT false,
  gifts_throttled boolean DEFAULT false,
  throttle_level text,
  updated_at timestamptz DEFAULT now()
);

-- Create index for updated_at
CREATE INDEX IF NOT EXISTS idx_live_controls_updated 
  ON public.live_controls(updated_at DESC);

-- Live Join Events Table (for health metrics)
CREATE TABLE IF NOT EXISTS public.live_join_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  stream_id bigint REFERENCES public.live_streams(id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (phase IN ('token_request', 'token_ok', 'room_connected', 'room_failed')),
  ms int,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for efficient health metric queries
CREATE INDEX IF NOT EXISTS idx_live_join_events_created 
  ON public.live_join_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_join_events_phase 
  ON public.live_join_events(phase);

CREATE INDEX IF NOT EXISTS idx_live_join_events_stream 
  ON public.live_join_events(stream_id);

-- RLS Policies for live_streams
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Admins can view all streams
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'live_streams' AND policyname = 'Admins can view all streams'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can view all streams" ON public.live_streams FOR SELECT USING (public.is_admin(auth.uid()))';
  END IF;

  -- Users can view their own streams
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'live_streams' AND policyname = 'Users can view own streams'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view own streams" ON public.live_streams FOR SELECT USING (profile_id = auth.uid())';
  END IF;

  -- Users can insert their own streams
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'live_streams' AND policyname = 'Users can create own streams'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can create own streams" ON public.live_streams FOR INSERT WITH CHECK (profile_id = auth.uid())';
  END IF;

  -- Users can update their own streams
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'live_streams' AND policyname = 'Users can update own streams'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own streams" ON public.live_streams FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid())';
  END IF;

  -- Admins can update any stream
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'live_streams' AND policyname = 'Admins can update any stream'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update any stream" ON public.live_streams FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))';
  END IF;
END $$;

-- RLS Policies for live_controls
ALTER TABLE public.live_controls ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Admins can manage all controls
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'live_controls' AND policyname = 'Admins can manage all controls'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can manage all controls" ON public.live_controls FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))';
  END IF;

  -- Stream owners can view their controls
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'live_controls' AND policyname = 'Stream owners can view controls'
  ) THEN
    EXECUTE 'CREATE POLICY "Stream owners can view controls" ON public.live_controls FOR SELECT USING (EXISTS (SELECT 1 FROM public.live_streams ls WHERE ls.id = stream_id AND ls.profile_id = auth.uid()))';
  END IF;
END $$;

-- RLS Policies for live_join_events
ALTER TABLE public.live_join_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Admins can read all join events
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'live_join_events' AND policyname = 'Admins can read join events'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can read join events" ON public.live_join_events FOR SELECT USING (public.is_admin(auth.uid()))';
  END IF;

  -- Users can insert their own join events
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'live_join_events' AND policyname = 'Users can log own join events'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can log own join events" ON public.live_join_events FOR INSERT WITH CHECK (profile_id = auth.uid() OR profile_id IS NULL)';
  END IF;
END $$;

-- RPC: Admin update stream controls
CREATE OR REPLACE FUNCTION public.admin_update_live_controls(
  p_stream_id bigint,
  p_chat_muted boolean DEFAULT NULL,
  p_gifts_throttled boolean DEFAULT NULL,
  p_throttle_level text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Verify stream exists
  IF NOT EXISTS (SELECT 1 FROM public.live_streams WHERE id = p_stream_id) THEN
    RAISE EXCEPTION 'stream_not_found';
  END IF;

  -- Insert or update controls
  INSERT INTO public.live_controls (stream_id, chat_muted, gifts_throttled, throttle_level, updated_at)
  VALUES (
    p_stream_id,
    COALESCE(p_chat_muted, false),
    COALESCE(p_gifts_throttled, false),
    p_throttle_level,
    now()
  )
  ON CONFLICT (stream_id) DO UPDATE SET
    chat_muted = COALESCE(p_chat_muted, live_controls.chat_muted),
    gifts_throttled = COALESCE(p_gifts_throttled, live_controls.gifts_throttled),
    throttle_level = COALESCE(p_throttle_level, live_controls.throttle_level),
    updated_at = now();

  -- Log the action
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_audit_logs') THEN
    PERFORM public.admin_log_action(
      'update_live_controls',
      'live_stream',
      p_stream_id::text,
      jsonb_build_object(
        'chat_muted', p_chat_muted,
        'gifts_throttled', p_gifts_throttled,
        'throttle_level', p_throttle_level
      )
    );
  END IF;
END;
$$;

-- RPC: Admin end stream (with audit logging)
CREATE OR REPLACE FUNCTION public.admin_end_live_stream(
  p_stream_id bigint,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Update stream status
  UPDATE public.live_streams
  SET
    status = 'ended',
    ended_at = now(),
    live_available = false,
    is_published = false,
    unpublished_at = now(),
    updated_at = now()
  WHERE id = p_stream_id AND ended_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'stream_not_found_or_already_ended';
  END IF;

  -- Clean up active viewers if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'active_viewers') THEN
    EXECUTE 'DELETE FROM public.active_viewers WHERE live_stream_id = $1' USING p_stream_id;
  END IF;

  -- Log the action
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_audit_logs') THEN
    PERFORM public.admin_log_action(
      'end_live_stream',
      'live_stream',
      p_stream_id::text,
      jsonb_build_object('reason', p_reason)
    );
  END IF;
END;
$$;

-- RPC: Get live health metrics (last 1 hour)
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
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Count live streams
  SELECT COUNT(*) INTO v_live_count
  FROM public.live_streams
  WHERE status = 'live' AND live_available = true;

  -- Analyze join events from last 1 hour
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

  -- Calculate rates
  IF v_total_requests > 0 THEN
    v_token_success_rate := ROUND((v_success_requests::numeric / v_total_requests::numeric) * 100, 2);
  ELSE
    v_token_success_rate := 0;
  END IF;

  IF v_success_requests > 0 THEN
    v_connection_success_rate := ROUND((v_connected_requests::numeric / v_success_requests::numeric) * 100, 2);
  ELSE
    v_connection_success_rate := 0;
  END IF;

  IF v_total_requests > 0 THEN
    v_error_rate := ROUND((v_failed_requests::numeric / v_total_requests::numeric) * 100, 2);
  ELSE
    v_error_rate := 0;
  END IF;

  RETURN jsonb_build_object(
    'live_count', COALESCE(v_live_count, 0),
    'token_success_rate', COALESCE(v_token_success_rate, 0),
    'connection_success_rate', COALESCE(v_connection_success_rate, 0),
    'avg_join_time_ms', COALESCE(ROUND(v_avg_join_time_ms, 2), 0),
    'error_rate', COALESCE(v_error_rate, 0),
    'total_requests_1h', COALESCE(v_total_requests, 0),
    'successful_connections_1h', COALESCE(v_connected_requests, 0),
    'failed_connections_1h', COALESCE(v_failed_requests, 0)
  );
END;
$$;

-- Grant execute permissions
REVOKE ALL ON FUNCTION public.admin_update_live_controls(bigint, boolean, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_live_controls(bigint, boolean, boolean, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_end_live_stream(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_end_live_stream(bigint, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_live_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_live_health() TO authenticated;

COMMIT;


