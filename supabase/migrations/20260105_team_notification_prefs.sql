-- ============================================================================
-- TEAM NOTIFICATION PREFERENCES
-- ============================================================================
-- Stores per-member notification settings for teams.
-- ============================================================================

BEGIN;

-- 1) Create team_notification_preferences table
CREATE TABLE IF NOT EXISTS public.team_notification_preferences (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Notification toggles
  all_activity boolean NOT NULL DEFAULT true,
  live_alerts boolean NOT NULL DEFAULT true,
  mentions_only boolean NOT NULL DEFAULT false,
  feed_posts boolean NOT NULL DEFAULT true,
  chat_messages boolean NOT NULL DEFAULT true,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  PRIMARY KEY (team_id, profile_id)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_team_notification_prefs_profile
  ON public.team_notification_preferences(profile_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_team_notification_preferences_updated_at ON public.team_notification_preferences;
CREATE TRIGGER trg_team_notification_preferences_updated_at
BEFORE UPDATE ON public.team_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 2) Enable RLS
ALTER TABLE public.team_notification_preferences ENABLE ROW LEVEL SECURITY;

-- 3) RLS Policies
DROP POLICY IF EXISTS "Users can view own notification prefs" ON public.team_notification_preferences;
CREATE POLICY "Users can view own notification prefs"
  ON public.team_notification_preferences
  FOR SELECT
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own notification prefs" ON public.team_notification_preferences;
CREATE POLICY "Users can insert own notification prefs"
  ON public.team_notification_preferences
  FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
    AND public.is_team_approved_member(team_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own notification prefs" ON public.team_notification_preferences;
CREATE POLICY "Users can update own notification prefs"
  ON public.team_notification_preferences
  FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own notification prefs" ON public.team_notification_preferences;
CREATE POLICY "Users can delete own notification prefs"
  ON public.team_notification_preferences
  FOR DELETE
  USING (profile_id = auth.uid());

-- 4) Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_notification_preferences TO authenticated;

-- ============================================================================
-- RPC: rpc_get_team_notification_prefs
-- ============================================================================
DROP FUNCTION IF EXISTS public.rpc_get_team_notification_prefs(uuid);
CREATE OR REPLACE FUNCTION public.rpc_get_team_notification_prefs(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_prefs record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_prefs
  FROM public.team_notification_preferences
  WHERE team_id = p_team_id AND profile_id = v_user_id;

  -- Return defaults if no prefs exist
  IF v_prefs IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'prefs', jsonb_build_object(
        'all_activity', true,
        'live_alerts', true,
        'mentions_only', false,
        'feed_posts', true,
        'chat_messages', true
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'prefs', jsonb_build_object(
      'all_activity', v_prefs.all_activity,
      'live_alerts', v_prefs.live_alerts,
      'mentions_only', v_prefs.mentions_only,
      'feed_posts', v_prefs.feed_posts,
      'chat_messages', v_prefs.chat_messages
    )
  );
END;
$$;

-- ============================================================================
-- RPC: rpc_update_team_notification_prefs
-- ============================================================================
DROP FUNCTION IF EXISTS public.rpc_update_team_notification_prefs(uuid, jsonb);
CREATE OR REPLACE FUNCTION public.rpc_update_team_notification_prefs(
  p_team_id uuid,
  p_prefs jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF NOT public.is_team_approved_member(p_team_id, v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a team member');
  END IF;

  -- Upsert preferences
  INSERT INTO public.team_notification_preferences (
    team_id,
    profile_id,
    all_activity,
    live_alerts,
    mentions_only,
    feed_posts,
    chat_messages
  )
  VALUES (
    p_team_id,
    v_user_id,
    COALESCE((p_prefs->>'all_activity')::boolean, true),
    COALESCE((p_prefs->>'live_alerts')::boolean, true),
    COALESCE((p_prefs->>'mentions_only')::boolean, false),
    COALESCE((p_prefs->>'feed_posts')::boolean, true),
    COALESCE((p_prefs->>'chat_messages')::boolean, true)
  )
  ON CONFLICT (team_id, profile_id) DO UPDATE SET
    all_activity = COALESCE((p_prefs->>'all_activity')::boolean, team_notification_preferences.all_activity),
    live_alerts = COALESCE((p_prefs->>'live_alerts')::boolean, team_notification_preferences.live_alerts),
    mentions_only = COALESCE((p_prefs->>'mentions_only')::boolean, team_notification_preferences.mentions_only),
    feed_posts = COALESCE((p_prefs->>'feed_posts')::boolean, team_notification_preferences.feed_posts),
    chat_messages = COALESCE((p_prefs->>'chat_messages')::boolean, team_notification_preferences.chat_messages),
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- Grants for RPCs
-- ============================================================================
REVOKE ALL ON FUNCTION public.rpc_get_team_notification_prefs(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_update_team_notification_prefs(uuid, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rpc_get_team_notification_prefs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_update_team_notification_prefs(uuid, jsonb) TO authenticated;

COMMIT;

SELECT 'Team notification preferences created successfully' AS result;
