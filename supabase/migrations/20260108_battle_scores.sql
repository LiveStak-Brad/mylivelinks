-- ============================================================================
-- Battle Scores Schema & RPCs
-- ============================================================================
-- Responsible for persisting battle-specific scoring data separate from
-- monetization ledgers. Tracks points, supporters, participant state, and
-- boost metadata for each live battle session.
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLE: battle_scores
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.battle_scores (
  session_id UUID PRIMARY KEY REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  points_a BIGINT NOT NULL DEFAULT 0,
  points_b BIGINT NOT NULL DEFAULT 0,
  supporter_stats JSONB NOT NULL DEFAULT '{"supporters": []}'::jsonb,
  participant_states JSONB NOT NULL DEFAULT '{}'::jsonb,
  boost_active BOOLEAN NOT NULL DEFAULT FALSE,
  boost_multiplier NUMERIC(6,2) NOT NULL DEFAULT 1.00,
  boost_started_at TIMESTAMPTZ,
  boost_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_battle_scores_updated_at
  ON public.battle_scores(updated_at DESC);

-- Maintain updated_at automatically
CREATE OR REPLACE FUNCTION public.battle_scores_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS battle_scores_set_updated_at ON public.battle_scores;
CREATE TRIGGER battle_scores_set_updated_at
BEFORE UPDATE ON public.battle_scores
FOR EACH ROW
EXECUTE FUNCTION public.battle_scores_touch();

-- Helper structure for supporter updates
CREATE TYPE public.battle_supporter_delta AS (
  profile_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  side TEXT,
  points_delta BIGINT,
  chat_award BOOLEAN
);

-- ============================================================================
-- RPC: rpc_battle_score_snapshot
-- ============================================================================
-- Returns the persisted snapshot for a battle session. Viewers rely on this for
-- initial hydration while realtime updates stream in through Supabase channel.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_battle_score_snapshot(
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row battle_scores%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.battle_scores
  WHERE session_id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'session_id', p_session_id,
      'points', jsonb_build_object('A', 0, 'B', 0),
      'supporters', jsonb_build_array(),
      'participantStates', jsonb_build_object(),
      'boost', jsonb_build_object(
        'active', FALSE,
        'multiplier', 1,
        'started_at', NULL,
        'ends_at', NULL
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'session_id', v_row.session_id,
    'points', jsonb_build_object('A', v_row.points_a, 'B', v_row.points_b),
    'supporters', COALESCE(v_row.supporter_stats -> 'supporters', jsonb_build_array()),
    'participantStates', v_row.participant_states,
    'boost', jsonb_build_object(
      'active', v_row.boost_active,
      'multiplier', v_row.boost_multiplier,
      'started_at', v_row.boost_started_at,
      'ends_at', v_row.boost_ends_at
    )
  );
END;
$$;

-- ============================================================================
-- RPC: rpc_battle_score_apply
-- ============================================================================
-- Service role RPC that applies scoring deltas (coins, chat, boost updates).
-- Updates supporter stats and participant map atomically. This DOES NOT touch
-- coin/diamond ledgers.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_battle_score_apply(
  p_session_id UUID,
  p_side TEXT,
  p_points_delta BIGINT,
  p_supporter battle_supporter_delta DEFAULT NULL,
  p_participant_states JSONB DEFAULT NULL,
  p_boost JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_side TEXT;
  v_row battle_scores%ROWTYPE;
  v_supporters JSONB;
  v_supporter_array JSONB;
  v_existing JSONB;
  v_updated JSONB;
BEGIN
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'session_id required';
  END IF;

  v_side := upper(trim(p_side));
  IF v_side NOT IN ('A', 'B') THEN
    RAISE EXCEPTION 'Invalid side %', p_side;
  END IF;

  -- Upsert base row
  INSERT INTO public.battle_scores(session_id)
  VALUES (p_session_id)
  ON CONFLICT (session_id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.battle_scores
  WHERE session_id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to lock battle_scores row for session %', p_session_id;
  END IF;

  -- Update points for appropriate side
  IF p_points_delta <> 0 THEN
    IF v_side = 'A' THEN
      v_row.points_a := GREATEST(0, v_row.points_a + p_points_delta);
    ELSE
      v_row.points_b := GREATEST(0, v_row.points_b + p_points_delta);
    END IF;
  END IF;

  -- Update supporters list (stored as array ordered by total points desc)
  IF p_supporter IS NOT NULL THEN
    v_supporter_array := COALESCE(v_row.supporter_stats -> 'supporters', jsonb_build_array());
    v_existing := NULL;

    FOR v_existing IN SELECT value FROM jsonb_array_elements(v_supporter_array)
    LOOP
      EXIT WHEN (v_existing ->> 'profile_id')::UUID = p_supporter.profile_id;
    END LOOP;

    IF v_existing IS NULL THEN
      v_supporter_array := v_supporter_array || jsonb_build_object(
        'profile_id', p_supporter.profile_id,
        'username', p_supporter.username,
        'display_name', p_supporter.display_name,
        'avatar_url', p_supporter.avatar_url,
        'side', v_side,
        'points', p_points_delta,
        'chat_awarded', p_supporter.chat_award
      );
    ELSE
      v_supporter_array := jsonb_agg(
        CASE
          WHEN (elem ->> 'profile_id')::UUID = p_supporter.profile_id THEN
            elem || jsonb_build_object(
              'side', v_side,
              'points', GREATEST(0, (elem ->> 'points')::BIGINT + p_points_delta),
              'chat_awarded', (elem ->> 'chat_awarded')::BOOLEAN OR p_supporter.chat_award
            )
          ELSE
            elem
        END
      )
      FROM jsonb_array_elements(v_supporter_array) elem;
    END IF;

    -- Sort supporters by points desc, limit to 100 retained entries
    v_supporter_array := (
      SELECT jsonb_agg(elem ORDER BY (elem ->> 'points')::BIGINT DESC)
      FROM (
        SELECT elem
        FROM jsonb_array_elements(v_supporter_array) elem
        ORDER BY (elem ->> 'points')::BIGINT DESC
        LIMIT 100
      ) AS limited
    );

    v_row.supporter_stats := jsonb_build_object('supporters', v_supporter_array);
  END IF;

  -- Optionally merge participant state payload from caller
  IF p_participant_states IS NOT NULL THEN
    v_row.participant_states := p_participant_states;
  END IF;

  -- Update boost metadata if provided
  IF p_boost IS NOT NULL THEN
    v_row.boost_active := COALESCE((p_boost ->> 'active')::BOOLEAN, v_row.boost_active);
    v_row.boost_multiplier := COALESCE((p_boost ->> 'multiplier')::NUMERIC, v_row.boost_multiplier);
    v_row.boost_started_at := COALESCE((p_boost ->> 'started_at')::TIMESTAMPTZ, v_row.boost_started_at);
    v_row.boost_ends_at := COALESCE((p_boost ->> 'ends_at')::TIMESTAMPTZ, v_row.boost_ends_at);
  END IF;

  UPDATE public.battle_scores
  SET points_a = v_row.points_a,
      points_b = v_row.points_b,
      supporter_stats = v_row.supporter_stats,
      participant_states = v_row.participant_states,
      boost_active = v_row.boost_active,
      boost_multiplier = v_row.boost_multiplier,
      boost_started_at = v_row.boost_started_at,
      boost_ends_at = v_row.boost_ends_at
  WHERE session_id = p_session_id;

  RETURN public.rpc_battle_score_snapshot(p_session_id);
END;
$$;

-- ============================================================================
-- RLS + Permissions
-- ============================================================================

ALTER TABLE public.battle_scores ENABLE ROW LEVEL SECURITY;

-- Viewers can select (read-only)
CREATE POLICY "battle_scores_select" ON public.battle_scores
  FOR SELECT USING (true);

-- Hosts (participants) can update via RPC through security definer; direct
-- updates remain blocked to avoid RLS bypass.
CREATE POLICY "battle_scores_no_direct_write" ON public.battle_scores
  FOR INSERT WITH CHECK (false);
CREATE POLICY "battle_scores_no_direct_update" ON public.battle_scores
  FOR UPDATE USING (false);

COMMIT;
