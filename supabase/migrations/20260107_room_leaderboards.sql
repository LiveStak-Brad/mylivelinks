-- ============================================================================
-- Room-Specific Leaderboards
-- Adds room_id tracking to ledger_entries and updates get_leaderboard RPC
-- ============================================================================

-- Add room_id column to ledger_entries to track which room gifts/earnings occurred in
ALTER TABLE public.ledger_entries 
ADD COLUMN IF NOT EXISTS room_id text;

-- Add index for room-based queries
CREATE INDEX IF NOT EXISTS idx_ledger_entries_room_id 
ON public.ledger_entries(room_id) 
WHERE room_id IS NOT NULL;

-- Composite index for room + type queries
CREATE INDEX IF NOT EXISTS idx_ledger_entries_room_type_created
ON public.ledger_entries(room_id, entry_type, created_at DESC)
WHERE room_id IS NOT NULL;

-- ============================================================================
-- Update get_leaderboard RPC to support room filtering
-- Drop all existing overloads to avoid conflicts
-- ============================================================================

-- Drop old function signatures to prevent overload conflicts
DROP FUNCTION IF EXISTS public.get_leaderboard(text, text, integer);
DROP FUNCTION IF EXISTS public.get_leaderboard(text, text, integer, text);

CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_type text,
  p_period text,
  p_limit integer DEFAULT 100,
  p_room_id text DEFAULT NULL  -- Optional room filter (NULL = global)
)
RETURNS TABLE (
  profile_id uuid,
  username text,
  avatar_url text,
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
    -- TOP GIFTERS: Sum of coins spent on gifts
    RETURN QUERY
    WITH sums AS (
      SELECT
        le.user_id AS profile_id,
        SUM(ABS(le.delta_coins))::bigint AS metric_value
      FROM public.ledger_entries le
      WHERE le.entry_type = 'coin_spend_gift'
        AND le.delta_coins <> 0
        AND (v_start IS NULL OR le.created_at >= v_start)
        -- Room filter: if p_room_id provided, only count gifts in that room
        AND (p_room_id IS NULL OR le.room_id = p_room_id)
      GROUP BY le.user_id
    )
    SELECT
      s.profile_id,
      p.username,
      p.avatar_url,
      COALESCE(p.gifter_level, 0)::integer,
      s.metric_value,
      ROW_NUMBER() OVER (ORDER BY s.metric_value DESC)::integer AS rank
    FROM sums s
    JOIN public.profiles p ON p.id = s.profile_id
    ORDER BY s.metric_value DESC
    LIMIT p_limit;

  ELSE
    -- TOP STREAMERS: Sum of diamonds earned
    RETURN QUERY
    WITH sums AS (
      SELECT
        le.user_id AS profile_id,
        SUM(le.delta_diamonds)::bigint AS metric_value
      FROM public.ledger_entries le
      WHERE le.entry_type = 'diamond_earn'
        AND le.delta_diamonds > 0
        AND (v_start IS NULL OR le.created_at >= v_start)
        -- Room filter: if p_room_id provided, only count earnings in that room
        AND (p_room_id IS NULL OR le.room_id = p_room_id)
      GROUP BY le.user_id
    )
    SELECT
      s.profile_id,
      p.username,
      p.avatar_url,
      COALESCE(p.gifter_level, 0)::integer,
      s.metric_value,
      ROW_NUMBER() OVER (ORDER BY s.metric_value DESC)::integer AS rank
    FROM sums s
    JOIN public.profiles p ON p.id = s.profile_id
    ORDER BY s.metric_value DESC
    LIMIT p_limit;

  END IF;
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text, integer, text) TO anon;

-- ============================================================================
-- Room Leaderboard Cache (optional, for performance at scale)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.room_leaderboard_cache (
  id bigserial PRIMARY KEY,
  room_id text NOT NULL,
  leaderboard_type text NOT NULL, -- 'top_streamers' or 'top_gifters'
  period text NOT NULL, -- 'daily', 'weekly', 'monthly', 'alltime'
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  username text,
  avatar_url text,
  gifter_level integer DEFAULT 0,
  metric_value bigint NOT NULL DEFAULT 0,
  rank integer NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (room_id, leaderboard_type, period, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_room_leaderboard_cache_lookup
ON public.room_leaderboard_cache(room_id, leaderboard_type, period, rank);

CREATE INDEX IF NOT EXISTS idx_room_leaderboard_cache_computed
ON public.room_leaderboard_cache(computed_at);

-- RLS for room leaderboard cache
ALTER TABLE public.room_leaderboard_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read room leaderboard cache"
ON public.room_leaderboard_cache
FOR SELECT
USING (true);

-- Grant access
GRANT SELECT ON public.room_leaderboard_cache TO authenticated;
GRANT SELECT ON public.room_leaderboard_cache TO anon;

COMMENT ON TABLE public.room_leaderboard_cache IS 'Cached room-specific leaderboard data for performance';
COMMENT ON COLUMN public.ledger_entries.room_id IS 'Room where the transaction occurred (for room-specific leaderboards)';

-- ============================================================================
-- Update send_gift_v2 to accept room_id parameter
-- ============================================================================

CREATE OR REPLACE FUNCTION public.send_gift_v2(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_coins_amount BIGINT,
  p_gift_type_id BIGINT DEFAULT NULL,
  p_stream_id BIGINT DEFAULT NULL,
  p_request_id VARCHAR(255) DEFAULT NULL,
  p_room_id TEXT DEFAULT NULL  -- NEW: Room ID for room-specific leaderboards
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_balance BIGINT;
  v_request_id VARCHAR(255);
  v_sender_idempotency_key VARCHAR(255);
  v_recipient_idempotency_key VARCHAR(255);
  v_existing_provider_ref VARCHAR(255);
  v_existing_gift_id BIGINT;
  v_gift_id BIGINT;
  v_gift_type_id BIGINT;
  v_gift_rate NUMERIC;
  v_diamonds_awarded BIGINT;
BEGIN
  v_request_id := COALESCE(p_request_id, gen_random_uuid()::text);
  v_sender_idempotency_key := 'gift:sender:' || v_request_id;
  v_recipient_idempotency_key := 'gift:recipient:' || v_request_id;

  PERFORM pg_advisory_xact_lock(hashtext(v_sender_idempotency_key)::bigint);

  SELECT provider_ref
  INTO v_existing_provider_ref
  FROM public.ledger_entries
  WHERE idempotency_key = v_sender_idempotency_key
  LIMIT 1;

  IF v_existing_provider_ref IS NOT NULL THEN
    v_existing_gift_id := NULLIF(split_part(v_existing_provider_ref, ':', 2), '')::bigint;

    RETURN jsonb_build_object(
      'gift_id', v_existing_gift_id,
      'coins_spent', p_coins_amount,
      'diamonds_awarded', NULL,
      'platform_fee', 0
    );
  END IF;

  IF p_sender_id IS NULL OR p_recipient_id IS NULL THEN
    RAISE EXCEPTION 'sender_id and recipient_id are required';
  END IF;

  IF p_coins_amount IS NULL OR p_coins_amount <= 0 THEN
    RAISE EXCEPTION 'coins_amount must be positive';
  END IF;

  SELECT coin_balance INTO v_sender_balance
  FROM public.profiles
  WHERE id = p_sender_id
  FOR UPDATE;

  IF v_sender_balance IS NULL THEN
    RAISE EXCEPTION 'Sender profile not found';
  END IF;

  IF v_sender_balance < p_coins_amount THEN
    RAISE EXCEPTION 'Insufficient coin balance (have: %, need: %)', v_sender_balance, p_coins_amount;
  END IF;

  -- Get gift type info
  IF p_gift_type_id IS NOT NULL THEN
    SELECT id, creator_rate INTO v_gift_type_id, v_gift_rate
    FROM public.gift_types
    WHERE id = p_gift_type_id;
  END IF;
  
  v_gift_type_id := COALESCE(v_gift_type_id, 1);
  v_gift_rate := COALESCE(v_gift_rate, 0.6);
  v_diamonds_awarded := FLOOR(p_coins_amount * v_gift_rate)::bigint;

  -- Deduct coins from sender
  UPDATE public.profiles
  SET coin_balance = coin_balance - p_coins_amount,
      updated_at = now()
  WHERE id = p_sender_id;

  -- Award diamonds to recipient
  UPDATE public.profiles
  SET earnings_balance = COALESCE(earnings_balance, 0) + v_diamonds_awarded,
      updated_at = now()
  WHERE id = p_recipient_id;

  -- Create gift record
  INSERT INTO public.gifts(
    sender_id,
    recipient_id,
    gift_type_id,
    coins_amount,
    diamonds_amount,
    live_stream_id,
    request_id
  )
  VALUES (
    p_sender_id,
    p_recipient_id,
    v_gift_type_id,
    p_coins_amount,
    v_diamonds_awarded,
    p_stream_id,
    v_request_id
  )
  RETURNING id INTO v_gift_id;

  -- Ledger entry for sender (coin spend) - now includes room_id
  INSERT INTO public.ledger_entries(
    idempotency_key,
    user_id,
    entry_type,
    delta_coins,
    delta_diamonds,
    provider_ref,
    metadata,
    room_id  -- NEW
  )
  VALUES (
    v_sender_idempotency_key,
    p_sender_id,
    'coin_spend_gift',
    -p_coins_amount,
    0,
    'gift:' || v_gift_id,
    jsonb_build_object('recipient_id', p_recipient_id, 'gift_type_id', v_gift_type_id, 'stream_id', p_stream_id, 'room_id', p_room_id),
    p_room_id  -- NEW
  );

  -- Ledger entry for recipient (diamond earn) - now includes room_id
  INSERT INTO public.ledger_entries(
    idempotency_key,
    user_id,
    entry_type,
    delta_coins,
    delta_diamonds,
    provider_ref,
    metadata,
    room_id  -- NEW
  )
  VALUES (
    v_recipient_idempotency_key,
    p_recipient_id,
    'diamond_earn',
    0,
    v_diamonds_awarded,
    'gift:' || v_gift_id,
    jsonb_build_object('sender_id', p_sender_id, 'gift_type_id', v_gift_type_id, 'stream_id', p_stream_id, 'room_id', p_room_id),
    p_room_id  -- NEW
  );

  -- Update gifter stats
  UPDATE public.profiles
  SET gifter_level = COALESCE(gifter_level, 0) + 1,
      updated_at = now()
  WHERE id = p_sender_id;

  RETURN jsonb_build_object(
    'gift_id', v_gift_id,
    'coins_spent', p_coins_amount,
    'diamonds_awarded', v_diamonds_awarded,
    'platform_fee', p_coins_amount - v_diamonds_awarded,
    'room_id', p_room_id
  );
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.send_gift_v2(UUID, UUID, BIGINT, BIGINT, BIGINT, VARCHAR, TEXT) TO authenticated;
