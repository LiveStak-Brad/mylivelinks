/*

BEGIN;

-- ============================================================================
-- Team Pool Gifts (Diamonds-only): ledger-canonical split to ACTIVE team members
-- Parallel path; does not touch public.gifts or public.send_gift_v2.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) DDL
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.team_pool_gifts (
  id BIGSERIAL PRIMARY KEY,
  team_id UUID NOT NULL,
  live_stream_id BIGINT NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
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

-- ---------------------------------------------------------------------------
-- 2) RLS (read-only via policies; writes happen through SECURITY DEFINER RPC)
-- ---------------------------------------------------------------------------

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

-- OPTIONAL (default OFF): team transparency policy for approved team members.
-- Enable only if product wants team-wide visibility.
--
-- DROP POLICY IF EXISTS "Approved team members read team_pool_gifts" ON public.team_pool_gifts;
-- CREATE POLICY "Approved team members read team_pool_gifts"
-- ON public.team_pool_gifts
-- FOR SELECT
-- USING (
--   EXISTS (
--     SELECT 1
--     FROM public.team_members tm
--     WHERE tm.team_id = team_pool_gifts.team_id
--       AND tm.profile_id = auth.uid()
--       AND tm.status = 'approved'
--   )
-- );
--
-- DROP POLICY IF EXISTS "Approved team members read team_pool_gift_splits" ON public.team_pool_gift_splits;
-- CREATE POLICY "Approved team members read team_pool_gift_splits"
-- ON public.team_pool_gift_splits
-- FOR SELECT
-- USING (
--   EXISTS (
--     SELECT 1
--     FROM public.team_pool_gifts g
--     JOIN public.team_members tm
--       ON tm.team_id = g.team_id
--     WHERE g.id = team_pool_gift_splits.gift_id
--       AND tm.profile_id = auth.uid()
--       AND tm.status = 'approved'
--   )
-- );

-- ---------------------------------------------------------------------------
-- 3) RPCs (overload hygiene)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.rpc_send_team_pool_gift(UUID, BIGINT, BIGINT, VARCHAR);
DROP FUNCTION IF EXISTS public.rpc_get_team_pool_status(UUID, BIGINT);

CREATE OR REPLACE FUNCTION public.rpc_send_team_pool_gift(
  p_team_id UUID,
  p_live_stream_id BIGINT,
  p_diamonds_amount BIGINT,
  p_request_id VARCHAR(255) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_request_id VARCHAR(255);
  v_sender_idempotency_key VARCHAR(255);

  v_gift public.team_pool_gifts%ROWTYPE;
  v_gift_id BIGINT;

  v_sender_balance BIGINT;

  v_active_ids UUID[];
  v_active_count INT;
  v_each BIGINT;

  v_splits_count INT;
  v_bad_splits_count INT;
  v_sender_ledger_id BIGINT;
  v_recipient_ledger_count INT;
BEGIN
  v_sender_id := auth.uid();
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_team_id IS NULL OR p_live_stream_id IS NULL THEN
    RAISE EXCEPTION 'team_id and live_stream_id are required';
  END IF;

  IF p_diamonds_amount IS NULL OR p_diamonds_amount <= 0 THEN
    RAISE EXCEPTION 'diamonds_amount must be positive';
  END IF;

  v_request_id := COALESCE(p_request_id, gen_random_uuid()::text);
  v_sender_idempotency_key := 'team_pool_gift:sender:' || v_request_id;

  PERFORM pg_advisory_xact_lock(hashtext(v_sender_idempotency_key)::bigint);

  -- Canonical idempotency check: team_pool_gifts.request_id
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
    WHERE idempotency_key LIKE ('team_pool_gift:recipient:' || v_request_id || ':%');

    IF v_recipient_ledger_count <> v_gift.active_count THEN
      RAISE EXCEPTION 'inconsistent_state: recipient ledger entries % does not match active_count %', v_recipient_ledger_count, v_gift.active_count;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'gift_id', v_gift.id,
      'team_id', v_gift.team_id,
      'live_stream_id', v_gift.live_stream_id,
      'diamonds_amount', v_gift.diamonds_amount,
      'active_count', v_gift.active_count,
      'diamonds_amount_each', v_each,
      'request_id', v_gift.request_id,
      'snapshot_taken_at', v_gift.snapshot_taken_at,
      'created_at', v_gift.created_at,
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

  -- Fail-closed guard: if ledger indicates prior processing but event row is missing, do not proceed.
  IF EXISTS (
    SELECT 1
    FROM public.ledger_entries
    WHERE idempotency_key = v_sender_idempotency_key
  ) THEN
    RAISE EXCEPTION 'inconsistent_state: sender ledger exists but team_pool_gifts row is missing';
  END IF;

  -- Fail-closed: required assertion functions MUST exist and MUST throw if not allowed.
  IF to_regprocedure('public.rpc_assert_team_member_approved(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'missing_required_function: public.rpc_assert_team_member_approved(uuid,uuid)';
  END IF;

  IF to_regprocedure('public.rpc_assert_team_live_binding(uuid,bigint)') IS NULL THEN
    RAISE EXCEPTION 'missing_required_function: public.rpc_assert_team_live_binding(uuid,bigint)';
  END IF;

  EXECUTE 'SELECT public.rpc_assert_team_member_approved($1,$2)' USING p_team_id, v_sender_id;
  EXECUTE 'SELECT public.rpc_assert_team_live_binding($1,$2)' USING p_team_id, p_live_stream_id;

  -- Presence snapshot contract MUST exist.
  IF to_regprocedure('public.rpc_get_active_team_members_snapshot(uuid,bigint,integer)') IS NULL THEN
    RAISE EXCEPTION 'missing_required_function: public.rpc_get_active_team_members_snapshot(uuid,bigint,integer)';
  END IF;

  SELECT array_agg(profile_id ORDER BY profile_id)
  INTO v_active_ids
  FROM (
    SELECT DISTINCT s.profile_id
    FROM public.rpc_get_active_team_members_snapshot(p_team_id, p_live_stream_id, 45) s
  ) q;

  v_active_count := COALESCE(array_length(v_active_ids, 1), 0);

  IF v_active_count <= 0 THEN
    RAISE EXCEPTION 'no_active_team_members';
  END IF;

  IF (p_diamonds_amount % v_active_count) <> 0 THEN
    RAISE EXCEPTION 'diamonds_amount must be divisible by active_count';
  END IF;

  v_each := p_diamonds_amount / v_active_count;

  -- Sender balance check (diamonds wallet = profiles.earnings_balance)
  SELECT earnings_balance
  INTO v_sender_balance
  FROM public.profiles
  WHERE id = v_sender_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sender profile not found';
  END IF;

  IF v_sender_balance < p_diamonds_amount THEN
    RAISE EXCEPTION 'Insufficient diamonds balance. Have: %, Need: %', v_sender_balance, p_diamonds_amount;
  END IF;

  -- Create canonical gift event
  INSERT INTO public.team_pool_gifts(
    team_id,
    live_stream_id,
    gifter_profile_id,
    diamonds_amount,
    active_count,
    request_id
  )
  VALUES (
    p_team_id,
    p_live_stream_id,
    v_sender_id,
    p_diamonds_amount,
    v_active_count,
    v_request_id
  )
  RETURNING * INTO v_gift;

  v_gift_id := v_gift.id;

  -- Create immutable split snapshot
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

  -- Ledger A) sender spend
  INSERT INTO public.ledger_entries(
    idempotency_key,
    user_id,
    entry_type,
    delta_diamonds,
    provider_ref,
    metadata
  )
  VALUES (
    v_sender_idempotency_key,
    v_sender_id,
    'diamond_spend_team_pool_gift',
    -p_diamonds_amount,
    'team_pool_gift:' || v_gift_id,
    jsonb_build_object(
      'team_id', p_team_id,
      'live_stream_id', p_live_stream_id,
      'request_id', v_request_id,
      'active_count', v_active_count,
      'diamonds_amount', p_diamonds_amount
    )
  );

  -- Ledger B) recipient credits
  INSERT INTO public.ledger_entries(
    idempotency_key,
    user_id,
    entry_type,
    delta_diamonds,
    provider_ref,
    metadata
  )
  SELECT
    ('team_pool_gift:recipient:' || v_request_id || ':' || r::text),
    r,
    'diamond_earn_team_pool_gift',
    v_each,
    'team_pool_gift:' || v_gift_id,
    jsonb_build_object(
      'team_id', p_team_id,
      'live_stream_id', p_live_stream_id,
      'request_id', v_request_id,
      'gift_id', v_gift_id,
      'split_recipient_id', r,
      'diamonds_amount_each', v_each
    )
  FROM unnest(v_active_ids) AS r;

  RETURN jsonb_build_object(
    'success', true,
    'gift_id', v_gift.id,
    'team_id', v_gift.team_id,
    'live_stream_id', v_gift.live_stream_id,
    'diamonds_amount', v_gift.diamonds_amount,
    'active_count', v_gift.active_count,
    'diamonds_amount_each', v_each,
    'request_id', v_gift.request_id,
    'snapshot_taken_at', v_gift.snapshot_taken_at,
    'created_at', v_gift.created_at,
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

CREATE OR REPLACE FUNCTION public.rpc_get_team_pool_status(
  p_team_id UUID,
  p_live_stream_id BIGINT
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'team_id', p_team_id,
    'live_stream_id', p_live_stream_id,
    'last_gifts', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'gift_id', g.id,
        'gifter_profile_id', g.gifter_profile_id,
        'diamonds_amount', g.diamonds_amount,
        'active_count', g.active_count,
        'snapshot_taken_at', g.snapshot_taken_at,
        'created_at', g.created_at
      ) ORDER BY g.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT *
        FROM public.team_pool_gifts
        WHERE team_id = p_team_id
          AND live_stream_id = p_live_stream_id
        ORDER BY created_at DESC
        LIMIT 25
      ) g
    )
  );
$$;

REVOKE ALL ON FUNCTION public.rpc_send_team_pool_gift(UUID, BIGINT, BIGINT, VARCHAR) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_team_pool_status(UUID, BIGINT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rpc_send_team_pool_gift(UUID, BIGINT, BIGINT, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_team_pool_status(UUID, BIGINT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Verification SQL (manual / dev-only)
-- ---------------------------------------------------------------------------

-- DEV-ONLY STUB (ONLY if presence contract not yet implemented). Delete before prod.
--
-- CREATE OR REPLACE FUNCTION public.rpc_get_active_team_members_snapshot(
--   p_team_id UUID,
--   p_live_stream_id BIGINT,
--   p_freshness_seconds INT DEFAULT 45
-- )
-- RETURNS TABLE(profile_id UUID)
-- LANGUAGE sql
-- STABLE
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
--   SELECT unnest(ARRAY[
--     '11111111-1111-1111-1111-111111111111'::uuid,
--     '22222222-2222-2222-2222-222222222222'::uuid
--   ]);
-- $$;
--
-- GRANT EXECUTE ON FUNCTION public.rpc_get_active_team_members_snapshot(UUID, BIGINT, INT) TO authenticated;

-- Step-by-step verification (requires assertion functions + presence snapshot to exist):
--
-- 1) Fund sender diamonds via ledger (earnings_balance)
--    INSERT INTO public.ledger_entries(idempotency_key, user_id, entry_type, delta_diamonds, provider_ref)
--    VALUES ('test:team_pool:fund_sender', '<SENDER_UUID>'::uuid, 'diamond_earn', 1000, 'test')
--    ON CONFLICT (idempotency_key) DO NOTHING;
--
-- 2) Call send twice with same request_id (idempotent)
--    SELECT public.rpc_send_team_pool_gift('<TEAM_UUID>'::uuid, <LIVE_STREAM_ID>::bigint, 200::bigint, 'req_test_1');
--    SELECT public.rpc_send_team_pool_gift('<TEAM_UUID>'::uuid, <LIVE_STREAM_ID>::bigint, 999::bigint, 'req_test_1');
--    -- second call must return canonical stored values (200) or throw if inconsistent state.
--
-- 3) Verify splits count == active_count
--    SELECT g.id, g.active_count, (
--      SELECT COUNT(*) FROM public.team_pool_gift_splits s WHERE s.gift_id = g.id
--    ) AS splits_count
--    FROM public.team_pool_gifts g
--    WHERE g.request_id = 'req_test_1';
--
-- 4) Verify ledger entries: 1 sender spend + N recipient earns
--    SELECT COUNT(*) FROM public.ledger_entries WHERE idempotency_key = 'team_pool_gift:sender:req_test_1';
--    SELECT COUNT(*) FROM public.ledger_entries WHERE idempotency_key LIKE 'team_pool_gift:recipient:req_test_1:%';
--
-- 5) Divisibility rejection
--    -- If active_count is 2, this should throw
--    SELECT public.rpc_send_team_pool_gift('<TEAM_UUID>'::uuid, <LIVE_STREAM_ID>::bigint, 201::bigint, 'req_test_bad_div');
--
-- 6) active_count=0 rejection
--    -- Configure snapshot to return 0 and expect exception 'no_active_team_members'
--
-- 7) Binding failure test (should throw)
--    -- Provide invalid live_stream_id for team, expect rpc_assert_team_live_binding to throw.

COMMIT;

*/
