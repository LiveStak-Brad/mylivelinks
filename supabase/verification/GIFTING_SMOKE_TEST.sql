BEGIN;

DO $tests$
DECLARE
  v_sender constant uuid := '00000000-0000-0000-0000-00000000a501'::uuid;
  v_recipient constant uuid := '00000000-0000-0000-0000-00000000a502'::uuid;
  v_fund_key constant text := 'test:gifting:fund_sender';
  v_req_id constant text := 'test_gift_req_1';

  v_rate numeric;
  v_expected_diamonds bigint;

  v_sender_before bigint;
  v_sender_after bigint;
  v_recipient_before bigint;
  v_recipient_after bigint;

  v_result jsonb;
  v_gift_id bigint;

  v_sender_ledger_count int;
  v_recipient_ledger_count int;
BEGIN
  -- Ensure canonical function exists
  IF to_regprocedure('public.send_gift_v2(uuid,uuid,bigint,bigint,bigint,character varying,text)') IS NULL THEN
    RAISE EXCEPTION 'FAIL: public.send_gift_v2(uuid,uuid,bigint,bigint,bigint,varchar,text) missing';
  END IF;

  -- Seed profiles (best effort; runs as SQL editor / service role typically)
  INSERT INTO public.profiles (id)
  VALUES (v_sender)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id)
  VALUES (v_recipient)
  ON CONFLICT (id) DO NOTHING;

  -- Fund sender with coins via ledger (trigger should update coin_balance)
  INSERT INTO public.ledger_entries(idempotency_key, user_id, entry_type, delta_coins, delta_diamonds, provider_ref, metadata)
  VALUES (v_fund_key, v_sender, 'coin_purchase', 100, 0, 'test', jsonb_build_object('purpose','gifting_smoke_test'))
  ON CONFLICT (idempotency_key) DO NOTHING;

  SELECT value_num
  INTO v_rate
  FROM public.money_config
  WHERE key = 'gift_diamond_rate';

  v_rate := COALESCE(v_rate, 1.0);
  v_expected_diamonds := FLOOR(10 * v_rate)::bigint;

  SELECT COALESCE(coin_balance, 0), COALESCE(earnings_balance, 0)
  INTO v_sender_before, v_recipient_before
  FROM public.profiles
  WHERE id = v_sender;

  SELECT COALESCE(earnings_balance, 0)
  INTO v_recipient_before
  FROM public.profiles
  WHERE id = v_recipient;

  -- Call gift RPC
  v_result := public.send_gift_v2(
    v_sender,
    v_recipient,
    10,
    NULL,
    NULL,
    v_req_id,
    'smoke_room'
  );

  v_gift_id := NULLIF(v_result->>'gift_id', '')::bigint;
  IF v_gift_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: send_gift_v2 did not return gift_id (%)', v_result;
  END IF;

  -- Verify gifts row exists
  IF NOT EXISTS (SELECT 1 FROM public.gifts g WHERE g.id = v_gift_id) THEN
    RAISE EXCEPTION 'FAIL: gifts row missing for gift_id %', v_gift_id;
  END IF;

  -- Verify ledger entries were created and are idempotent
  SELECT COUNT(*)::int
  INTO v_sender_ledger_count
  FROM public.ledger_entries
  WHERE idempotency_key = ('gift:sender:' || v_req_id);

  SELECT COUNT(*)::int
  INTO v_recipient_ledger_count
  FROM public.ledger_entries
  WHERE idempotency_key = ('gift:recipient:' || v_req_id);

  IF v_sender_ledger_count <> 1 OR v_recipient_ledger_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: expected 1 sender+1 recipient ledger entry, got sender %, recipient %', v_sender_ledger_count, v_recipient_ledger_count;
  END IF;

  -- Re-run with same request_id (retry). Must not create extra ledger entries.
  PERFORM public.send_gift_v2(
    v_sender,
    v_recipient,
    10,
    NULL,
    NULL,
    v_req_id,
    'smoke_room'
  );

  SELECT COUNT(*)::int
  INTO v_sender_ledger_count
  FROM public.ledger_entries
  WHERE idempotency_key = ('gift:sender:' || v_req_id);

  SELECT COUNT(*)::int
  INTO v_recipient_ledger_count
  FROM public.ledger_entries
  WHERE idempotency_key = ('gift:recipient:' || v_req_id);

  IF v_sender_ledger_count <> 1 OR v_recipient_ledger_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: retry created duplicate ledger entries (sender %, recipient %)', v_sender_ledger_count, v_recipient_ledger_count;
  END IF;

  -- Verify balances changed as expected (coins -10, diamonds +10 assuming 1:1 rate)
  SELECT COALESCE(coin_balance, 0)
  INTO v_sender_after
  FROM public.profiles
  WHERE id = v_sender;

  SELECT COALESCE(earnings_balance, 0)
  INTO v_recipient_after
  FROM public.profiles
  WHERE id = v_recipient;

  IF v_sender_after > v_sender_before - 10 THEN
    RAISE EXCEPTION 'FAIL: sender coin_balance did not decrease by expected amount (before %, after %)', v_sender_before, v_sender_after;
  END IF;

  IF v_recipient_after < v_recipient_before + v_expected_diamonds THEN
    RAISE EXCEPTION 'FAIL: recipient earnings_balance did not increase by expected amount (before %, after %, expected_delta %)', v_recipient_before, v_recipient_after, v_expected_diamonds;
  END IF;

  RAISE NOTICE 'PASS: GIFTING_SMOKE_TEST (gift_id %, sender coins %->%, recipient diamonds %->% (rate %, expected_delta %))', v_gift_id, v_sender_before, v_sender_after, v_recipient_before, v_recipient_after, v_rate, v_expected_diamonds;
END;
$tests$;

ROLLBACK;
