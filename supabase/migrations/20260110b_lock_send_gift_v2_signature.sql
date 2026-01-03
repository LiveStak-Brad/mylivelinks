BEGIN;

DO $$
DECLARE
  v_oid oid;
  v_args text;
  v_expected text := 'p_sender_id uuid, p_recipient_id uuid, p_coins_amount bigint, p_gift_type_id bigint, p_stream_id bigint, p_request_id character varying, p_room_id text';
BEGIN
  SELECT p.oid
  INTO v_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'send_gift_v2'
    AND pg_get_function_identity_arguments(p.oid) = v_expected
  LIMIT 1;

  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'DO_NOT_TOUCH: public.send_gift_v2 signature mismatch or missing. Expected identity args: %', v_expected;
  END IF;

  SELECT pg_get_function_identity_arguments(v_oid)
  INTO v_args;

  IF v_args IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'DO_NOT_TOUCH: public.send_gift_v2 identity args changed. Expected %, got %', v_expected, v_args;
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.send_gift_v2(uuid,uuid,bigint,bigint,bigint,character varying,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'DO_NOT_TOUCH: authenticated missing EXECUTE on public.send_gift_v2(uuid,uuid,bigint,bigint,bigint,varchar,text)';
  END IF;
END $$;

COMMIT;
