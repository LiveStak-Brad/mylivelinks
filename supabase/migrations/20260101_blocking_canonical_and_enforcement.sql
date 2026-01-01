BEGIN;

-- -----------------------------------------------------------------------------
-- Canonical Blocking System (production)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.blocks (
  id bigserial PRIMARY KEY,
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  reason text NULL,
  CONSTRAINT blocks_no_self_block CHECK (blocker_id <> blocked_id),
  CONSTRAINT blocks_unique_pair UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON public.blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON public.blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_at_desc ON public.blocks(blocked_at DESC);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own blocks" ON public.blocks;
CREATE POLICY "Users can view own blocks"
  ON public.blocks FOR SELECT
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

DROP POLICY IF EXISTS "Users can insert own blocks" ON public.blocks;
CREATE POLICY "Users can insert own blocks"
  ON public.blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can delete own blocks" ON public.blocks;
CREATE POLICY "Users can delete own blocks"
  ON public.blocks FOR DELETE
  USING (auth.uid() = blocker_id);

GRANT SELECT, INSERT, DELETE ON TABLE public.blocks TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.blocks_id_seq TO authenticated;

-- -----------------------------------------------------------------------------
-- RPCs
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.block_user(
  p_blocker_id uuid,
  p_blocked_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_blocker_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_blocker_id IS NULL OR p_blocked_id IS NULL THEN
    RAISE EXCEPTION 'blocker_id and blocked_id are required';
  END IF;

  IF p_blocker_id = p_blocked_id THEN
    RAISE EXCEPTION 'cannot block yourself';
  END IF;

  INSERT INTO public.blocks(blocker_id, blocked_id, reason)
  VALUES (p_blocker_id, p_blocked_id, p_reason)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.block_user(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.unblock_user(
  p_blocker_id uuid,
  p_blocked_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_blocker_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  DELETE FROM public.blocks
  WHERE blocker_id = p_blocker_id
    AND blocked_id = p_blocked_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unblock_user(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_blocked(
  p_user_id uuid,
  p_other_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_other_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.blocks b
    WHERE (b.blocker_id = p_user_id AND b.blocked_id = p_other_user_id)
       OR (b.blocker_id = p_other_user_id AND b.blocked_id = p_user_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_blocked(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid, uuid) TO anon;

CREATE OR REPLACE FUNCTION public.get_blocked_users(
  p_user_id uuid
)
RETURNS TABLE (
  blocked_id uuid,
  blocked_username varchar,
  blocked_display_name varchar,
  blocked_avatar_url text,
  blocked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    b.blocked_id,
    p.username,
    p.display_name,
    p.avatar_url,
    b.blocked_at
  FROM public.blocks b
  JOIN public.profiles p ON p.id = b.blocked_id
  WHERE b.blocker_id = p_user_id
  ORDER BY b.blocked_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_blocked_users(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- Enforcement (DM + Gifts)
-- -----------------------------------------------------------------------------

-- DM conversation creation: block prevents create.
DO $$
BEGIN
  PERFORM 1
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_or_create_dm_conversation';

  IF FOUND THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.get_or_create_dm_conversation(p_other_profile_id uuid)
      RETURNS uuid
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_me uuid;
        v_conversation_id uuid;
        v_candidate uuid;
        v_candidate_count int;
      BEGIN
        v_me := auth.uid();

        IF v_me IS NULL THEN
          RAISE EXCEPTION 'unauthorized';
        END IF;

        IF p_other_profile_id IS NULL THEN
          RAISE EXCEPTION 'otherProfileId required';
        END IF;

        IF p_other_profile_id = v_me THEN
          RAISE EXCEPTION 'cannot message yourself';
        END IF;

        IF public.is_blocked(v_me, p_other_profile_id) THEN
          RAISE EXCEPTION 'blocked';
        END IF;

        -- Find existing 1:1 conversation
        FOR v_candidate IN
          SELECT cp.conversation_id
          FROM public.conversation_participants cp
          WHERE cp.profile_id IN (v_me, p_other_profile_id)
          GROUP BY cp.conversation_id
          HAVING COUNT(DISTINCT cp.profile_id) = 2
        LOOP
          SELECT COUNT(*) INTO v_candidate_count
          FROM public.conversation_participants cp2
          WHERE cp2.conversation_id = v_candidate;

          IF v_candidate_count = 2 THEN
            v_conversation_id := v_candidate;
            EXIT;
          END IF;
        END LOOP;

        IF v_conversation_id IS NOT NULL THEN
          RETURN v_conversation_id;
        END IF;

        -- Create conversation + participants
        INSERT INTO public.conversations DEFAULT VALUES
        RETURNING id INTO v_conversation_id;

        INSERT INTO public.conversation_participants (conversation_id, profile_id)
        VALUES
          (v_conversation_id, v_me),
          (v_conversation_id, p_other_profile_id);

        RETURN v_conversation_id;
      END;
      $$;
    $fn$;

    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_or_create_dm_conversation(uuid) TO authenticated';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- DM message send: enforce at RLS policy where possible.
DO $$
BEGIN
  PERFORM 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'messages';

  IF FOUND THEN
    DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;

    CREATE POLICY "Participants can send messages"
      ON public.messages FOR INSERT
      WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
          SELECT 1
          FROM public.conversation_participants cp
          WHERE cp.conversation_id = messages.conversation_id
            AND cp.profile_id = auth.uid()
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.conversation_participants cp_other
          WHERE cp_other.conversation_id = messages.conversation_id
            AND cp_other.profile_id <> auth.uid()
            AND public.is_blocked(auth.uid(), cp_other.profile_id)
        )
      );
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- Gifts: enforce inside RPCs (defense-in-depth; these are invoked with admin/service clients).
DO $$
BEGIN
  PERFORM 1
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name = 'send_gift_v2';

  IF FOUND THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.send_gift_v2(
        p_sender_id UUID,
        p_recipient_id UUID,
        p_coins_amount BIGINT,
        p_gift_type_id BIGINT DEFAULT NULL,
        p_stream_id BIGINT DEFAULT NULL,
        p_request_id VARCHAR(255) DEFAULT NULL
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
        IF public.is_blocked(p_sender_id, p_recipient_id) THEN
          RAISE EXCEPTION 'blocked';
        END IF;

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

        IF p_sender_id = p_recipient_id THEN
          RAISE EXCEPTION 'Cannot send gift to yourself';
        END IF;

        IF p_coins_amount IS NULL OR p_coins_amount <= 0 THEN
          RAISE EXCEPTION 'coins amount must be positive';
        END IF;

        SELECT coin_balance
        INTO v_sender_balance
        FROM public.profiles
        WHERE id = p_sender_id
        FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'sender profile not found';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_recipient_id) THEN
          RAISE EXCEPTION 'recipient profile not found';
        END IF;

        IF v_sender_balance < p_coins_amount THEN
          RAISE EXCEPTION 'Insufficient coin balance. Have: %, Need: %', v_sender_balance, p_coins_amount;
        END IF;

        SELECT value_num INTO v_gift_rate
        FROM public.money_config
        WHERE key = 'gift_diamond_rate';

        v_diamonds_awarded := FLOOR(p_coins_amount * COALESCE(v_gift_rate, 1.0));

        IF v_diamonds_awarded <= 0 THEN
          RAISE EXCEPTION 'Invalid gift award rate';
        END IF;

        IF p_gift_type_id IS NOT NULL THEN
          v_gift_type_id := p_gift_type_id;
        ELSE
          SELECT id
          INTO v_gift_type_id
          FROM public.gift_types
          WHERE COALESCE(is_active, true) = true
          ORDER BY COALESCE(display_order, 0) ASC, id ASC
          LIMIT 1;

          IF v_gift_type_id IS NULL THEN
            RAISE EXCEPTION 'No active gift_types found';
          END IF;
        END IF;

        INSERT INTO public.gifts (
          sender_id,
          recipient_id,
          gift_type_id,
          coin_amount,
          platform_revenue,
          streamer_revenue,
          live_stream_id
        )
        VALUES (
          p_sender_id,
          p_recipient_id,
          v_gift_type_id,
          p_coins_amount,
          0,
          v_diamonds_awarded,
          p_stream_id
        )
        RETURNING id INTO v_gift_id;

        INSERT INTO public.ledger_entries (
          idempotency_key,
          user_id,
          entry_type,
          delta_coins,
          provider_ref
        )
        VALUES (
          v_sender_idempotency_key,
          p_sender_id,
          'coin_spend_gift',
          -p_coins_amount,
          'gift:' || v_gift_id
        )
        ON CONFLICT (idempotency_key) DO NOTHING;

        INSERT INTO public.ledger_entries (
          idempotency_key,
          user_id,
          entry_type,
          delta_diamonds,
          provider_ref
        )
        VALUES (
          v_recipient_idempotency_key,
          p_recipient_id,
          'diamond_earn',
          v_diamonds_awarded,
          'gift:' || v_gift_id
        )
        ON CONFLICT (idempotency_key) DO NOTHING;

        RETURN jsonb_build_object(
          'gift_id', v_gift_id,
          'coins_spent', p_coins_amount,
          'diamonds_awarded', v_diamonds_awarded,
          'platform_fee', 0
        );
      END;
      $$;
    $fn$;

    EXECUTE 'GRANT EXECUTE ON FUNCTION public.send_gift_v2 TO authenticated';
  END IF;
END $$;

DO $$
BEGIN
  PERFORM 1
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name = 'send_gift_v2_with_message';

  IF FOUND THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.send_gift_v2_with_message(
        p_sender_id uuid,
        p_recipient_id uuid,
        p_conversation_id uuid,
        p_coins_amount bigint,
        p_gift_type_id bigint DEFAULT NULL,
        p_stream_id bigint DEFAULT NULL,
        p_request_id varchar DEFAULT NULL
      )
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_result jsonb;
        v_gift_id bigint;
        v_message_id uuid;
        v_request_id varchar;
      BEGIN
        IF public.is_blocked(p_sender_id, p_recipient_id) THEN
          RAISE EXCEPTION 'blocked';
        END IF;

        v_request_id := COALESCE(p_request_id, gen_random_uuid()::text);

        v_result := public.send_gift_v2(
          p_sender_id,
          p_recipient_id,
          p_coins_amount,
          p_gift_type_id,
          p_stream_id,
          v_request_id
        );

        v_gift_id := (v_result->>'gift_id')::bigint;
        IF v_gift_id IS NULL THEN
          RAISE EXCEPTION 'Gift failed (no gift_id)';
        END IF;

        INSERT INTO public.messages(
          conversation_id,
          sender_id,
          type,
          gift_id,
          gift_name,
          gift_coins,
          gift_tx_id,
          request_id
        )
        VALUES (
          p_conversation_id,
          p_sender_id,
          'gift',
          v_gift_id,
          'Gift',
          p_coins_amount::int,
          v_request_id,
          v_request_id
        )
        ON CONFLICT (conversation_id, request_id)
        DO UPDATE SET gift_id = EXCLUDED.gift_id
        RETURNING id INTO v_message_id;

        IF v_message_id IS NULL THEN
          RAISE EXCEPTION 'Gift message insert failed';
        END IF;

        RETURN jsonb_build_object(
          'message_id', v_message_id,
          'gift', v_result,
          'request_id', v_request_id
        );
      END;
      $$;
    $fn$;
  END IF;
END $$;

COMMIT;
