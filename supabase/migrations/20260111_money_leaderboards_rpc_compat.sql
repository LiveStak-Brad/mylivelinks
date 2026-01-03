BEGIN;

-- Ensure ledger_entries has room_id for room-scoped leaderboards
ALTER TABLE public.ledger_entries
ADD COLUMN IF NOT EXISTS room_id text;

-- Ensure balances remain derived from ledger_entries via trigger
CREATE OR REPLACE FUNCTION public.apply_ledger_entry_to_profile_balances()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET coin_balance = GREATEST(0, COALESCE(coin_balance, 0) + COALESCE(NEW.delta_coins, 0)),
      earnings_balance = GREATEST(0, COALESCE(earnings_balance, 0) + COALESCE(NEW.delta_diamonds, 0)),
      last_transaction_at = now()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_ledger_entry_to_profile_balances ON public.ledger_entries;
CREATE TRIGGER trg_apply_ledger_entry_to_profile_balances
AFTER INSERT ON public.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.apply_ledger_entry_to_profile_balances();

-- Canonical leaderboard RPC: supports both global and room-scoped leaderboards.
-- Drop all existing overloads to avoid PostgREST mismatch.
DROP FUNCTION IF EXISTS public.get_leaderboard(text, text, integer);
DROP FUNCTION IF EXISTS public.get_leaderboard(text, text, integer, text);

CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_type text,
  p_period text,
  p_limit integer DEFAULT 100,
  p_room_id text DEFAULT NULL
)
RETURNS TABLE (
  profile_id uuid,
  username text,
  avatar_url text,
  is_live boolean,
  gifter_level integer,
  metric_value bigint,
  rank integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_start timestamptz;
BEGIN
  v_start := CASE LOWER(COALESCE(p_period, 'alltime'))
    WHEN 'daily' THEN date_trunc('day', now())
    WHEN 'weekly' THEN date_trunc('week', now())
    WHEN 'monthly' THEN date_trunc('month', now())
    ELSE NULL
  END;

  IF LOWER(COALESCE(p_type, '')) IN ('top_gifters', 'gifters', 'gifter') THEN
    RETURN QUERY
    WITH sums AS (
      SELECT
        le.user_id AS profile_id,
        SUM(ABS(le.delta_coins))::bigint AS metric_value
      FROM public.ledger_entries le
      WHERE le.entry_type = 'coin_spend_gift'
        AND COALESCE(le.delta_coins, 0) <> 0
        AND (v_start IS NULL OR le.created_at >= v_start)
        AND (
          p_room_id IS NULL
          OR COALESCE(le.room_id, le.metadata->>'room_id') = p_room_id
        )
      GROUP BY le.user_id
    )
    SELECT
      s.profile_id AS profile_id,
      COALESCE(p.username::text, left(s.profile_id::text, 8))::text AS username,
      p.avatar_url::text AS avatar_url,
      COALESCE(p.is_live, false)::boolean AS is_live,
      COALESCE(p.gifter_level, 0)::integer AS gifter_level,
      s.metric_value,
      ROW_NUMBER() OVER (
        ORDER BY s.metric_value DESC, COALESCE(p.username, s.profile_id::text) ASC, s.profile_id ASC
      )::int AS rank
    FROM sums s
    LEFT JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.metric_value > 0
    ORDER BY s.metric_value DESC, COALESCE(p.username, s.profile_id::text) ASC, s.profile_id ASC
    LIMIT COALESCE(p_limit, 100);

  ELSIF LOWER(COALESCE(p_type, '')) IN ('top_streamers', 'streamers', 'streamer') THEN
    RETURN QUERY
    WITH sums AS (
      SELECT
        le.user_id AS profile_id,
        SUM(le.delta_diamonds)::bigint AS metric_value
      FROM public.ledger_entries le
      WHERE le.entry_type = 'diamond_earn'
        AND COALESCE(le.delta_diamonds, 0) > 0
        AND (v_start IS NULL OR le.created_at >= v_start)
        AND (
          p_room_id IS NULL
          OR COALESCE(le.room_id, le.metadata->>'room_id') = p_room_id
        )
      GROUP BY le.user_id
    )
    SELECT
      s.profile_id AS profile_id,
      COALESCE(p.username::text, left(s.profile_id::text, 8))::text AS username,
      p.avatar_url::text AS avatar_url,
      COALESCE(p.is_live, false)::boolean AS is_live,
      COALESCE(p.gifter_level, 0)::integer AS gifter_level,
      s.metric_value,
      ROW_NUMBER() OVER (
        ORDER BY s.metric_value DESC, COALESCE(p.username, s.profile_id::text) ASC, s.profile_id ASC
      )::int AS rank
    FROM sums s
    LEFT JOIN public.profiles p ON p.id = s.profile_id
    WHERE s.metric_value > 0
    ORDER BY s.metric_value DESC, COALESCE(p.username, s.profile_id::text) ASC, s.profile_id ASC
    LIMIT COALESCE(p_limit, 100);

  ELSE
    RAISE EXCEPTION 'Invalid leaderboard type: %', p_type;
  END IF;
END;
$$;

-- Back-compat wrapper (3-arg)
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_type text,
  p_period text,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  profile_id uuid,
  username text,
  avatar_url text,
  is_live boolean,
  gifter_level integer,
  metric_value bigint,
  rank integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.get_leaderboard(p_type, p_period, p_limit, NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard(text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_leaderboard(text, text, integer, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text, integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text, integer, text) TO authenticated;

-- Ensure PostgREST schema cache updates immediately
NOTIFY pgrst, 'reload schema';

COMMIT;
