BEGIN;

-- ============================================================================
-- Team Pool Gifts → Presence Snapshot Integration
-- (Run only after 20260103_team_presence_model.sql is applied.)
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_send_team_pool_gift(UUID, BIGINT, BIGINT, VARCHAR);
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
SET row_security = off
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
  v_snapshot_tx_id UUID;
  v_snapshot_hash text;
  v_snapshot_version timestamptz;
  v_live_session_id uuid;

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

  IF EXISTS (
    SELECT 1
    FROM public.ledger_entries
    WHERE idempotency_key = v_sender_idempotency_key
  ) THEN
    RAISE EXCEPTION 'inconsistent_state: sender ledger exists but team_pool_gifts row is missing';
  END IF;

  IF to_regprocedure('public.rpc_assert_team_member_approved(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'missing_required_function: public.rpc_assert_team_member_approved(uuid,uuid)';
  END IF;

  IF to_regprocedure('public.rpc_assert_team_live_binding(uuid,bigint)') IS NULL THEN
    RAISE EXCEPTION 'missing_required_function: public.rpc_assert_team_live_binding(uuid,bigint)';
  END IF;

  EXECUTE 'SELECT public.rpc_assert_team_member_approved($1,$2)' USING p_team_id, v_sender_id;
  EXECUTE 'SELECT public.rpc_assert_team_live_binding($1,$2)' USING p_team_id, p_live_stream_id;

  IF to_regprocedure('public.rpc_get_active_team_members(uuid,uuid,numeric,uuid)') IS NULL THEN
    RAISE EXCEPTION 'missing_required_function: public.rpc_get_active_team_members(uuid,uuid,numeric,uuid)';
  END IF;

  SELECT tls.id
  INTO v_live_session_id
  FROM public.team_live_sessions tls
  WHERE tls.live_stream_id = p_live_stream_id
  ORDER BY tls.started_at DESC
  LIMIT 1;

  IF v_live_session_id IS NULL THEN
    RAISE EXCEPTION 'live_session_not_found_for_stream';
  END IF;

  v_snapshot_hash := md5(v_request_id);
  v_snapshot_tx_id := (
    substr(v_snapshot_hash, 1, 8) || '-' ||
    substr(v_snapshot_hash, 9, 4) || '-' ||
    substr(v_snapshot_hash, 13, 4) || '-' ||
    substr(v_snapshot_hash, 17, 4) || '-' ||
    substr(v_snapshot_hash, 21, 12)
  )::uuid;

  SELECT
    array_agg(member_id ORDER BY member_id),
    MIN(snapshot_version)
  INTO v_active_ids,
       v_snapshot_version
  FROM public.rpc_get_active_team_members(
    p_team_id,
    v_live_session_id,
    0,
    v_snapshot_tx_id
  );

  v_active_count := COALESCE(array_length(v_active_ids, 1), 0);

  IF v_active_count <= 0 THEN
    RAISE EXCEPTION 'no_active_team_members';
  END IF;

  IF v_snapshot_version IS NULL THEN
    RAISE EXCEPTION 'missing_snapshot_version';
  END IF;

  IF (p_diamonds_amount % v_active_count) <> 0 THEN
    RAISE EXCEPTION 'diamonds_amount must be divisible by active_count';
  END IF;

  v_each := p_diamonds_amount / v_active_count;

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
    p_live_stream_id,
    v_sender_id,
    p_diamonds_amount,
    v_active_count,
    v_request_id,
    v_snapshot_version
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
      'live_session_id', v_live_session_id,
      'request_id', v_request_id,
      'snapshot_version', v_snapshot_version,
      'active_count', v_active_count,
      'diamonds_amount', p_diamonds_amount
    )
  );

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
      'live_session_id', v_live_session_id,
      'request_id', v_request_id,
      'gift_id', v_gift_id,
      'split_recipient_id', r,
      'diamonds_amount_each', v_each,
      'snapshot_version', v_snapshot_version
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

REVOKE ALL ON FUNCTION public.rpc_send_team_pool_gift(UUID, BIGINT, BIGINT, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_send_team_pool_gift(UUID, BIGINT, BIGINT, VARCHAR) TO authenticated;

COMMIT;
