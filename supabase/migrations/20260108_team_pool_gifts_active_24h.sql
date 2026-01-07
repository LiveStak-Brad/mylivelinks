BEGIN;

-- Ensure base pool gift tables exist (in case 20260102_team_pool_gifts.sql was not applied)
CREATE TABLE IF NOT EXISTS public.team_pool_gifts (
  id BIGSERIAL PRIMARY KEY,
  team_id UUID NOT NULL,
  live_stream_id BIGINT REFERENCES public.live_streams(id) ON DELETE CASCADE,
  gifter_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  diamonds_amount BIGINT NOT NULL CHECK (diamonds_amount > 0),
  active_count INT NOT NULL CHECK (active_count > 0),
  snapshot_taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_id VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_pool_gifts_team_stream_created
  ON public.team_pool_gifts(team_id, live_stream_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_pool_gifts_gifter_created
  ON public.team_pool_gifts(gifter_profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.team_pool_gift_splits (
  gift_id BIGINT NOT NULL REFERENCES public.team_pool_gifts(id) ON DELETE CASCADE,
  recipient_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  diamonds_amount_each BIGINT NOT NULL CHECK (diamonds_amount_each > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (gift_id, recipient_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_team_pool_gift_splits_recipient_created
  ON public.team_pool_gift_splits(recipient_profile_id, created_at DESC);

ALTER TABLE public.team_pool_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_pool_gift_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read team_pool_gifts" ON public.team_pool_gifts;
CREATE POLICY "Admin read team_pool_gifts"
ON public.team_pool_gifts
FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Gifter read own team_pool_gifts" ON public.team_pool_gifts;
CREATE POLICY "Gifter read own team_pool_gifts"
ON public.team_pool_gifts
FOR SELECT
USING (gifter_profile_id = auth.uid());

DROP POLICY IF EXISTS "Admin read team_pool_gift_splits" ON public.team_pool_gift_splits;
CREATE POLICY "Admin read team_pool_gift_splits"
ON public.team_pool_gift_splits
FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Recipient read own team_pool_gift_splits" ON public.team_pool_gift_splits;
CREATE POLICY "Recipient read own team_pool_gift_splits"
ON public.team_pool_gift_splits
FOR SELECT
USING (recipient_profile_id = auth.uid());

DO $$
DECLARE
  v_fk_name text;
BEGIN
  SELECT tc.constraint_name
  INTO v_fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name
   AND kcu.table_schema = tc.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'team_pool_gifts'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'live_stream_id'
  LIMIT 1;

  IF v_fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.team_pool_gifts DROP CONSTRAINT %I', v_fk_name);
  END IF;
END;
$$;

ALTER TABLE public.team_pool_gifts
ALTER COLUMN live_stream_id DROP NOT NULL;

ALTER TABLE public.team_pool_gifts
ADD CONSTRAINT team_pool_gifts_live_stream_id_fkey
FOREIGN KEY (live_stream_id) REFERENCES public.live_streams(id) ON DELETE CASCADE;

DROP FUNCTION IF EXISTS public.rpc_get_active_team_members_24h(uuid);
CREATE OR REPLACE FUNCTION public.rpc_get_active_team_members_24h(
  p_team_id uuid
)
RETURNS TABLE(member_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  WITH cutoff AS (
    SELECT (now() - interval '24 hours') AS since
  ),
  roster AS (
    SELECT tm.profile_id
    FROM public.team_memberships tm
    WHERE tm.team_id = p_team_id
      AND tm.status = 'approved'
  ),
  activity AS (
    SELECT p.author_id AS member_id
    FROM public.team_feed_posts p
    CROSS JOIN cutoff c
    WHERE p.team_id = p_team_id
      AND p.created_at >= c.since

    UNION

    SELECT c.author_id AS member_id
    FROM public.team_feed_comments c
    CROSS JOIN cutoff ct
    WHERE c.team_id = p_team_id
      AND c.created_at >= ct.since

    UNION

    SELECT m.author_id AS member_id
    FROM public.team_chat_messages m
    CROSS JOIN cutoff ctm
    WHERE m.team_id = p_team_id
      AND m.created_at >= ctm.since
      AND COALESCE(m.is_deleted, false) = false

    UNION

    SELECT e.member_id
    FROM public.team_presence_events e
    CROSS JOIN cutoff ce
    WHERE e.team_id = p_team_id
      AND e.heartbeat_at >= ce.since
  )
  SELECT DISTINCT a.member_id
  FROM activity a
  JOIN roster r ON r.profile_id = a.member_id;
$$;

REVOKE ALL ON FUNCTION public.rpc_get_active_team_members_24h(uuid) FROM PUBLIC;

DROP FUNCTION IF EXISTS public.rpc_send_team_pool_gift_24h(uuid, bigint, varchar);
CREATE OR REPLACE FUNCTION public.rpc_send_team_pool_gift_24h(
  p_team_id uuid,
  p_diamonds_amount bigint,
  p_request_id varchar(255) DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_sender_id uuid;
  v_request_id varchar(255);
  v_sender_idempotency_key varchar(255);

  v_gift public.team_pool_gifts%ROWTYPE;
  v_gift_id bigint;

  v_post_id uuid;
  v_sender_username text;
  v_team_name text;
  v_split_lines text;
  v_post_text text;

  v_sender_balance bigint;

  v_active_ids uuid[];
  v_active_count int;
  v_each bigint;

  v_splits_count int;
  v_bad_splits_count int;
  v_sender_ledger_id bigint;
  v_recipient_ledger_count int;
BEGIN
  v_sender_id := auth.uid();
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_team_id IS NULL THEN
    RAISE EXCEPTION 'team_id_required';
  END IF;

  IF p_diamonds_amount IS NULL OR p_diamonds_amount <= 0 THEN
    RAISE EXCEPTION 'diamonds_amount must be positive';
  END IF;

  IF public.is_team_banned(p_team_id, v_sender_id) THEN
    RAISE EXCEPTION 'banned';
  END IF;

  IF NOT public.is_team_approved_member(p_team_id, v_sender_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_request_id := COALESCE(p_request_id, gen_random_uuid()::text);
  v_sender_idempotency_key := 'team_pool_gift_24h:sender:' || v_request_id;

  PERFORM pg_advisory_xact_lock(hashtext(v_sender_idempotency_key)::bigint);

  SELECT * INTO v_gift
  FROM public.team_pool_gifts
  WHERE request_id = v_request_id;

  IF FOUND THEN
    v_gift_id := v_gift.id;

    IF (v_gift.diamonds_amount % v_gift.active_count) <> 0 THEN
      RAISE EXCEPTION 'inconsistent_state: stored diamonds_amount not divisible by active_count';
    END IF;

    v_each := v_gift.diamonds_amount / v_gift.active_count;

    SELECT COUNT(*)::int INTO v_splits_count
    FROM public.team_pool_gift_splits
    WHERE gift_id = v_gift_id;

    IF v_splits_count <> v_gift.active_count THEN
      RAISE EXCEPTION 'inconsistent_state: splits_count % does not match active_count %', v_splits_count, v_gift.active_count;
    END IF;

    SELECT COUNT(*)::int INTO v_bad_splits_count
    FROM public.team_pool_gift_splits
    WHERE gift_id = v_gift_id
      AND diamonds_amount_each <> v_each;

    IF v_bad_splits_count <> 0 THEN
      RAISE EXCEPTION 'inconsistent_state: split amounts do not match expected_each';
    END IF;

    SELECT id INTO v_sender_ledger_id
    FROM public.ledger_entries
    WHERE idempotency_key = v_sender_idempotency_key
    LIMIT 1;

    IF v_sender_ledger_id IS NULL THEN
      RAISE EXCEPTION 'inconsistent_state: missing sender ledger entry';
    END IF;

    SELECT COUNT(*)::int INTO v_recipient_ledger_count
    FROM public.ledger_entries
    WHERE idempotency_key LIKE ('team_pool_gift_24h:recipient:' || v_request_id || ':%');

    IF v_recipient_ledger_count <> v_gift.active_count THEN
      RAISE EXCEPTION 'inconsistent_state: recipient ledger entries % does not match active_count %', v_recipient_ledger_count, v_gift.active_count;
    END IF;

    SELECT id INTO v_post_id
    FROM public.team_feed_posts
    WHERE team_id = v_gift.team_id
      AND author_id = v_gift.gifter_profile_id
      AND is_pinned = true
      AND text_content LIKE ('%sent % diamonds to the Team%')
      AND created_at >= v_gift.created_at - interval '10 minutes'
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN jsonb_build_object(
      'success', true,
      'gift_id', v_gift.id,
      'team_id', v_gift.team_id,
      'diamonds_amount', v_gift.diamonds_amount,
      'active_count', v_gift.active_count,
      'diamonds_amount_each', v_each,
      'request_id', v_gift.request_id,
      'snapshot_taken_at', v_gift.snapshot_taken_at,
      'created_at', v_gift.created_at,
      'post_id', v_post_id,
      'splits', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'recipient_profile_id', s.recipient_profile_id,
          'diamonds_amount_each', s.diamonds_amount_each
        ) ORDER BY s.recipient_profile_id), '[]'::jsonb)
        FROM public.team_pool_gift_splits s
        WHERE s.gift_id = v_gift_id
      )
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.ledger_entries
    WHERE idempotency_key = v_sender_idempotency_key
  ) THEN
    RAISE EXCEPTION 'inconsistent_state: sender ledger exists but team_pool_gifts row is missing';
  END IF;

  SELECT array_agg(member_id ORDER BY member_id)
  INTO v_active_ids
  FROM public.rpc_get_active_team_members_24h(p_team_id)
  WHERE member_id <> v_sender_id;

  v_active_count := COALESCE(array_length(v_active_ids, 1), 0);

  IF v_active_count <= 0 THEN
    RAISE EXCEPTION 'no_active_team_members_24h';
  END IF;

  IF (p_diamonds_amount % v_active_count) <> 0 THEN
    RAISE EXCEPTION 'diamonds_amount must be divisible by active_count';
  END IF;

  v_each := p_diamonds_amount / v_active_count;

  SELECT coin_balance
  INTO v_sender_balance
  FROM public.profiles
  WHERE id = v_sender_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sender profile not found';
  END IF;

  IF v_sender_balance < p_diamonds_amount THEN
    RAISE EXCEPTION 'Insufficient coin balance. Have: %, Need: %', v_sender_balance, p_diamonds_amount;
  END IF;

  INSERT INTO public.team_pool_gifts(
    team_id,
    live_stream_id,
    gifter_profile_id,
    diamonds_amount,
    active_count,
    request_id,
    snapshot_taken_at
  )
  VALUES (
    p_team_id,
    NULL,
    v_sender_id,
    p_diamonds_amount,
    v_active_count,
    v_request_id,
    now()
  )
  RETURNING * INTO v_gift;

  v_gift_id := v_gift.id;

  INSERT INTO public.team_pool_gift_splits(
    gift_id,
    recipient_profile_id,
    diamonds_amount_each
  )
  SELECT
    v_gift_id,
    r,
    v_each
  FROM unnest(v_active_ids) AS r;

  -- Update global gifting counters so pool gifts appear in the same leaderboards.
  UPDATE public.profiles
  SET total_spent = COALESCE(total_spent, 0) + p_diamonds_amount,
      total_gifts_sent = COALESCE(total_gifts_sent, 0) + p_diamonds_amount
  WHERE id = v_sender_id;

  UPDATE public.profiles
  SET total_gifts_received = COALESCE(total_gifts_received, 0) + v_each
  WHERE id = ANY(v_active_ids);

  IF to_regclass('public.team_feed_posts') IS NULL THEN
    RAISE EXCEPTION 'missing_required_table: public.team_feed_posts';
  END IF;

  SELECT COALESCE(p.username, p.display_name, 'Someone')
  INTO v_sender_username
  FROM public.profiles p
  WHERE p.id = v_sender_id;

  SELECT COALESCE(t.name, 'Team')
  INTO v_team_name
  FROM public.teams t
  WHERE t.id = p_team_id;

  SELECT COALESCE(
    string_agg(
      (COALESCE(pp.display_name, '@' || COALESCE(pp.username, 'unknown')) || ' — ' || v_each::text),
      E'\n'
    ),
    ''
  )
  INTO v_split_lines
  FROM unnest(v_active_ids) AS rid
  JOIN public.profiles pp ON pp.id = rid;

  v_post_text :=
    COALESCE(v_sender_username, 'Someone') || ' sent ' || p_diamonds_amount::text ||
    ' diamonds to the Team, the points were added to the pool and split between active members within the last 24 hours.' ||
    E'\n\n' ||
    'Split:' || E'\n' ||
    v_split_lines;

  INSERT INTO public.team_feed_posts (
    team_id,
    author_id,
    text_content,
    media_url,
    is_pinned,
    pinned_at
  )
  VALUES (
    p_team_id,
    v_sender_id,
    v_post_text,
    NULL,
    true,
    now()
  )
  RETURNING id INTO v_post_id;

  INSERT INTO public.ledger_entries(
    idempotency_key,
    user_id,
    entry_type,
    delta_coins,
    delta_diamonds,
    provider_ref,
    metadata
  )
  VALUES (
    v_sender_idempotency_key,
    v_sender_id,
    'coin_spend_team_pool_gift',
    -p_diamonds_amount,
    0,
    'team_pool_gift:' || v_gift_id,
    jsonb_build_object(
      'team_id', p_team_id,
      'request_id', v_request_id,
      'active_count', v_active_count,
      'diamonds_amount', p_diamonds_amount,
      'window', '24h'
    )
  );

  INSERT INTO public.ledger_entries(
    idempotency_key,
    user_id,
    entry_type,
    delta_coins,
    delta_diamonds,
    provider_ref,
    metadata
  )
  SELECT
    ('team_pool_gift_24h:recipient:' || v_request_id || ':' || r::text),
    r,
    'diamond_earn_team_pool_gift',
    0,
    v_each,
    'team_pool_gift:' || v_gift_id,
    jsonb_build_object(
      'team_id', p_team_id,
      'request_id', v_request_id,
      'gift_id', v_gift_id,
      'split_recipient_id', r,
      'diamonds_amount_each', v_each,
      'window', '24h'
    )
  FROM unnest(v_active_ids) AS r;

  RETURN jsonb_build_object(
    'success', true,
    'gift_id', v_gift.id,
    'team_id', v_gift.team_id,
    'diamonds_amount', v_gift.diamonds_amount,
    'active_count', v_gift.active_count,
    'diamonds_amount_each', v_each,
    'request_id', v_gift.request_id,
    'snapshot_taken_at', v_gift.snapshot_taken_at,
    'created_at', v_gift.created_at,
    'post_id', v_post_id,
    'splits', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'recipient_profile_id', s.recipient_profile_id,
        'diamonds_amount_each', s.diamonds_amount_each
      ) ORDER BY s.recipient_profile_id), '[]'::jsonb)
      FROM public.team_pool_gift_splits s
      WHERE s.gift_id = v_gift_id
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_send_team_pool_gift_24h(uuid, bigint, varchar) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_send_team_pool_gift_24h(uuid, bigint, varchar) TO authenticated;

COMMIT;
