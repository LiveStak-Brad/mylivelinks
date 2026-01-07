BEGIN;

-- 1. Ensure Team Pool Gift Tables Exist
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

-- 2. Helper: Get Active Team Members (Last 24h)
CREATE OR REPLACE FUNCTION public.rpc_get_active_team_members_24h(p_team_id uuid)
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
  activity AS (
    SELECT p.author_id AS member_id FROM public.team_feed_posts p, cutoff c WHERE p.team_id = p_team_id AND p.created_at >= c.since
    UNION
    SELECT c.author_id AS member_id FROM public.team_feed_comments c, cutoff c2 WHERE c.team_id = p_team_id AND c.created_at >= c2.since
    UNION
    SELECT m.author_id AS member_id FROM public.team_chat_messages m, cutoff c3 WHERE m.team_id = p_team_id AND m.created_at >= c3.since AND COALESCE(m.is_deleted, false) = false
    UNION
    SELECT e.member_id FROM public.team_presence_events e, cutoff c4 WHERE e.team_id = p_team_id AND e.heartbeat_at >= c4.since
  )
  SELECT DISTINCT a.member_id
  FROM activity a
  JOIN public.team_memberships tm ON tm.team_id = p_team_id AND tm.profile_id = a.member_id AND tm.status = 'approved';
$$;

-- 3. Quote RPC: Suggestions (N, 10N, 100N...) & Active Count (Excluding Self)
CREATE OR REPLACE FUNCTION public.rpc_get_team_pool_gift_quote_24h(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_active_count int;
  v_base bigint;
  v_suggestions bigint[];
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT COUNT(*)::int INTO v_active_count
  FROM public.rpc_get_active_team_members_24h(p_team_id)
  WHERE member_id <> v_actor; -- Exclude self

  IF COALESCE(v_active_count, 0) <= 0 THEN
    RETURN jsonb_build_object('success', true, 'team_id', p_team_id, 'active_count', 0, 'suggestions', '[]'::jsonb);
  END IF;

  v_base := v_active_count::bigint;
  v_suggestions := ARRAY[v_base, v_base * 10, v_base * 100, v_base * 1000, v_base * 10000];

  RETURN jsonb_build_object(
    'success', true,
    'team_id', p_team_id,
    'active_count', v_active_count,
    'suggestions', (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM unnest(v_suggestions) x)
  );
END;
$$;

-- 4. Send RPC: Debit Coins, Credit Diamonds, Create Post
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
  v_sender_id uuid := auth.uid();
  v_request_id varchar(255) := COALESCE(p_request_id, gen_random_uuid()::text);
  v_sender_idempotency_key varchar(255) := 'team_pool_gift_24h:sender:' || v_request_id;
  v_gift_id bigint;
  v_post_id uuid;
  v_active_ids uuid[];
  v_active_count int;
  v_each bigint;
  v_sender_balance bigint;
  v_sender_username text;
  v_split_lines text;
  v_post_text text;
BEGIN
  IF v_sender_id IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  
  -- Idempotency check (simplified)
  SELECT id INTO v_gift_id FROM public.team_pool_gifts WHERE request_id = v_request_id;
  IF FOUND THEN
     SELECT id INTO v_post_id FROM public.team_feed_posts WHERE text_content LIKE '%diamonds to the Team%' AND author_id = v_sender_id ORDER BY created_at DESC LIMIT 1;
     RETURN jsonb_build_object('success', true, 'gift_id', v_gift_id, 'post_id', v_post_id);
  END IF;

  -- 1. Get active members (excluding sender)
  SELECT array_agg(member_id ORDER BY member_id) INTO v_active_ids
  FROM public.rpc_get_active_team_members_24h(p_team_id)
  WHERE member_id <> v_sender_id;

  v_active_count := COALESCE(array_length(v_active_ids, 1), 0);
  IF v_active_count <= 0 THEN RAISE EXCEPTION 'no_active_team_members_24h'; END IF;

  IF (p_diamonds_amount % v_active_count) <> 0 THEN
    RAISE EXCEPTION 'diamonds_amount must be divisible by active_count';
  END IF;
  v_each := p_diamonds_amount / v_active_count;

  -- 2. Check Balance (COINS)
  SELECT coin_balance INTO v_sender_balance FROM public.profiles WHERE id = v_sender_id FOR UPDATE;
  IF v_sender_balance < p_diamonds_amount THEN
    RAISE EXCEPTION 'Insufficient coin balance';
  END IF;

  -- 3. Create Gift
  INSERT INTO public.team_pool_gifts(team_id, live_stream_id, gifter_profile_id, diamonds_amount, active_count, request_id)
  VALUES (p_team_id, NULL, v_sender_id, p_diamonds_amount, v_active_count, v_request_id)
  RETURNING id INTO v_gift_id;

  INSERT INTO public.team_pool_gift_splits(gift_id, recipient_profile_id, diamonds_amount_each)
  SELECT v_gift_id, r, v_each FROM unnest(v_active_ids) AS r;

  -- 4. Ledger: Debit Sender (COINS)
  INSERT INTO public.ledger_entries(idempotency_key, user_id, entry_type, delta_coins, delta_diamonds, provider_ref, metadata)
  VALUES (v_sender_idempotency_key, v_sender_id, 'coin_spend_team_pool_gift', -p_diamonds_amount, 0, 'team_pool_gift:' || v_gift_id, jsonb_build_object('team_id', p_team_id));

  -- 5. Ledger: Credit Recipients (DIAMONDS)
  INSERT INTO public.ledger_entries(idempotency_key, user_id, entry_type, delta_coins, delta_diamonds, provider_ref, metadata)
  SELECT ('team_pool_gift_24h:recipient:' || v_request_id || ':' || r::text), r, 'diamond_earn_team_pool_gift', 0, v_each, 'team_pool_gift:' || v_gift_id, jsonb_build_object('team_id', p_team_id)
  FROM unnest(v_active_ids) AS r;

  -- 6. Update Leaderboards
  UPDATE public.profiles SET total_spent = COALESCE(total_spent, 0) + p_diamonds_amount, total_gifts_sent = COALESCE(total_gifts_sent, 0) + p_diamonds_amount WHERE id = v_sender_id;
  UPDATE public.profiles SET total_gifts_received = COALESCE(total_gifts_received, 0) + v_each WHERE id = ANY(v_active_ids);

  -- 7. Create Announcement Post
  SELECT COALESCE(username, display_name, 'Someone') INTO v_sender_username FROM public.profiles WHERE id = v_sender_id;
  
  SELECT COALESCE(string_agg((COALESCE(pp.display_name, '@' || COALESCE(pp.username, 'unknown')) || ' — ' || v_each::text), E'\n'), '')
  INTO v_split_lines FROM unnest(v_active_ids) AS rid JOIN public.profiles pp ON pp.id = rid;

  v_post_text := COALESCE(v_sender_username, 'Someone') || ' sent ' || p_diamonds_amount::text || ' diamonds to the Team, the points were added to the pool and split between active members within the last 24 hours.' || E'\n\n' || 'Split:' || E'\n' || v_split_lines;

  INSERT INTO public.team_feed_posts (team_id, author_id, text_content, is_pinned, pinned_at)
  VALUES (p_team_id, v_sender_id, v_post_text, true, now())
  RETURNING id INTO v_post_id;

  RETURN jsonb_build_object('success', true, 'gift_id', v_gift_id, 'active_count', v_active_count, 'diamonds_amount_each', v_each, 'post_id', v_post_id);
END;
$$;

-- 5. Permissions & Reload
GRANT EXECUTE ON FUNCTION public.rpc_get_team_pool_gift_quote_24h(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_send_team_pool_gift_24h(uuid, bigint, varchar) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
