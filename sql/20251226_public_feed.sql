BEGIN;

-- Public Feed: Posts, Comments, Gifts (Coins -> Diamonds)

CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text_content text NOT NULL,
  media_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc ON public.posts (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts (author_id);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone"
  ON public.posts
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
CREATE POLICY "Users can create posts"
  ON public.posts
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts"
  ON public.posts
  FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);


CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text_content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id_created_at ON public.post_comments (post_id, created_at ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_post_comments_author_id ON public.post_comments (author_id);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Post comments are viewable by everyone" ON public.post_comments;
CREATE POLICY "Post comments are viewable by everyone"
  ON public.post_comments
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON public.post_comments;
CREATE POLICY "Users can create comments"
  ON public.post_comments
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.post_comments;
CREATE POLICY "Users can update own comments"
  ON public.post_comments
  FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);


CREATE TABLE IF NOT EXISTS public.post_gifts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coins bigint NOT NULL CHECK (coins > 0),
  gift_id bigint,
  request_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id)
);

ALTER TABLE public.post_gifts
  ADD COLUMN IF NOT EXISTS gift_id bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'post_gifts'
      AND c.conname = 'post_gifts_gift_id_fkey'
  ) THEN
    ALTER TABLE public.post_gifts
      ADD CONSTRAINT post_gifts_gift_id_fkey
      FOREIGN KEY (gift_id) REFERENCES public.gifts(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_post_gifts_post_id ON public.post_gifts (post_id);
CREATE INDEX IF NOT EXISTS idx_post_gifts_sender_id ON public.post_gifts (sender_id);
CREATE INDEX IF NOT EXISTS idx_post_gifts_recipient_id ON public.post_gifts (recipient_id);
CREATE INDEX IF NOT EXISTS idx_post_gifts_created_at_desc ON public.post_gifts (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_gifts_gift_id_unique ON public.post_gifts (gift_id) WHERE gift_id IS NOT NULL;

ALTER TABLE public.post_gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Post gifts are viewable by everyone" ON public.post_gifts;
CREATE POLICY "Post gifts are viewable by everyone"
  ON public.post_gifts
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Deny direct inserts - use RPC only" ON public.post_gifts;
CREATE POLICY "Deny direct inserts - use RPC only"
  ON public.post_gifts
  FOR INSERT
  WITH CHECK (false);


CREATE TABLE IF NOT EXISTS public.comment_gifts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id uuid NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coins bigint NOT NULL CHECK (coins > 0),
  gift_id bigint,
  request_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id)
);

ALTER TABLE public.comment_gifts
  ADD COLUMN IF NOT EXISTS gift_id bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'comment_gifts'
      AND c.conname = 'comment_gifts_gift_id_fkey'
  ) THEN
    ALTER TABLE public.comment_gifts
      ADD CONSTRAINT comment_gifts_gift_id_fkey
      FOREIGN KEY (gift_id) REFERENCES public.gifts(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_comment_gifts_comment_id ON public.comment_gifts (comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_gifts_sender_id ON public.comment_gifts (sender_id);
CREATE INDEX IF NOT EXISTS idx_comment_gifts_recipient_id ON public.comment_gifts (recipient_id);
CREATE INDEX IF NOT EXISTS idx_comment_gifts_created_at_desc ON public.comment_gifts (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_gifts_gift_id_unique ON public.comment_gifts (gift_id) WHERE gift_id IS NOT NULL;

ALTER TABLE public.comment_gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comment gifts are viewable by everyone" ON public.comment_gifts;
CREATE POLICY "Comment gifts are viewable by everyone"
  ON public.comment_gifts
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Deny direct inserts - use RPC only" ON public.comment_gifts;
CREATE POLICY "Deny direct inserts - use RPC only"
  ON public.comment_gifts
  FOR INSERT
  WITH CHECK (false);


CREATE OR REPLACE FUNCTION public.get_public_feed(
  p_limit integer DEFAULT 20,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL,
  p_username text DEFAULT NULL
)
RETURNS TABLE (
  post_id uuid,
  text_content text,
  media_url text,
  created_at timestamptz,
  author_id uuid,
  author_username text,
  author_avatar_url text,
  comment_count bigint,
  gift_total_coins bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  WITH base_posts AS (
    SELECT p.id, p.author_id, p.text_content, p.media_url, p.created_at
    FROM public.posts p
    JOIN public.profiles pr ON pr.id = p.author_id
    WHERE (
      p_username IS NULL
      OR pr.username = p_username
    )
    AND (
      p_before_created_at IS NULL
      OR p_before_id IS NULL
      OR (p.created_at, p.id) < (p_before_created_at, p_before_id)
    )
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  ),
  comment_counts AS (
    SELECT c.post_id, COUNT(*)::bigint AS comment_count
    FROM public.post_comments c
    WHERE c.post_id IN (SELECT id FROM base_posts)
    GROUP BY c.post_id
  ),
  gift_totals AS (
    SELECT pg.post_id, COALESCE(SUM(COALESCE(gg.coin_amount, pg.coins)), 0)::bigint AS gift_total_coins
    FROM public.post_gifts pg
    LEFT JOIN public.gifts gg ON gg.id = pg.gift_id
    WHERE pg.post_id IN (SELECT id FROM base_posts)
    GROUP BY pg.post_id
  )
  SELECT
    bp.id AS post_id,
    bp.text_content,
    bp.media_url,
    bp.created_at,
    pr.id AS author_id,
    pr.username AS author_username,
    pr.avatar_url AS author_avatar_url,
    COALESCE(cc.comment_count, 0) AS comment_count,
    COALESCE(gt.gift_total_coins, 0) AS gift_total_coins
  FROM base_posts bp
  JOIN public.profiles pr ON pr.id = bp.author_id
  LEFT JOIN comment_counts cc ON cc.post_id = bp.id
  LEFT JOIN gift_totals gt ON gt.post_id = bp.id
  ORDER BY bp.created_at DESC, bp.id DESC;
$$;

REVOKE ALL ON FUNCTION public.get_public_feed(integer, timestamptz, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_feed(integer, timestamptz, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_feed(integer, timestamptz, uuid, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.gift_post(
  p_post_id uuid,
  p_sender_id uuid,
  p_coins_amount bigint,
  p_request_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_recipient_id uuid;
  v_gift_id uuid;
  v_existing_coins bigint;
  v_canonical_gift_id bigint;
  v_send_result jsonb;
BEGIN
  IF p_request_id IS NULL OR length(trim(p_request_id)) = 0 THEN
    RAISE EXCEPTION 'request_id is required';
  END IF;

  IF p_sender_id IS NULL THEN
    RAISE EXCEPTION 'sender_id is required';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> p_sender_id THEN
    RAISE EXCEPTION 'Unauthorized sender';
  END IF;

  IF p_coins_amount IS NULL OR p_coins_amount <= 0 THEN
    RAISE EXCEPTION 'coins amount must be positive';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('post_gift:' || p_request_id)::bigint);

  SELECT pg.id, pg.recipient_id, pg.coins, pg.gift_id
  INTO v_gift_id, v_recipient_id, v_existing_coins, v_canonical_gift_id
  FROM public.post_gifts pg
  WHERE pg.request_id = p_request_id
  LIMIT 1;

  IF v_gift_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'gift_id', v_canonical_gift_id,
      'feed_gift_id', v_gift_id,
      'already_existed', true,
      'recipient_id', v_recipient_id,
      'coins_spent', COALESCE(v_existing_coins, p_coins_amount),
      'diamonds_awarded', COALESCE(v_existing_coins, p_coins_amount)
    );
  END IF;

  SELECT p.author_id INTO v_recipient_id
  FROM public.posts p
  WHERE p.id = p_post_id;

  IF v_recipient_id IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  IF v_recipient_id = p_sender_id THEN
    RAISE EXCEPTION 'Cannot gift yourself';
  END IF;

  v_send_result := public.send_gift_v2(
    p_sender_id,
    v_recipient_id,
    p_coins_amount,
    NULL,
    NULL,
    p_request_id
  );

  v_canonical_gift_id := NULLIF(v_send_result->>'gift_id', '')::bigint;

  INSERT INTO public.post_gifts (post_id, sender_id, recipient_id, coins, gift_id, request_id)
  VALUES (p_post_id, p_sender_id, v_recipient_id, p_coins_amount, v_canonical_gift_id, p_request_id)
  RETURNING id INTO v_gift_id;

  RETURN jsonb_build_object(
    'gift_id', v_canonical_gift_id,
    'feed_gift_id', v_gift_id,
    'recipient_id', v_recipient_id,
    'coins_spent', p_coins_amount,
    'diamonds_awarded', p_coins_amount,
    'already_existed', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.gift_post(uuid, uuid, bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gift_post(uuid, uuid, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gift_post(uuid, uuid, bigint, text) TO service_role;


CREATE OR REPLACE FUNCTION public.gift_comment(
  p_comment_id uuid,
  p_sender_id uuid,
  p_coins_amount bigint,
  p_request_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_recipient_id uuid;
  v_gift_id uuid;
  v_post_id uuid;
  v_existing_coins bigint;
  v_canonical_gift_id bigint;
  v_send_result jsonb;
BEGIN
  IF p_request_id IS NULL OR length(trim(p_request_id)) = 0 THEN
    RAISE EXCEPTION 'request_id is required';
  END IF;

  IF p_sender_id IS NULL THEN
    RAISE EXCEPTION 'sender_id is required';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> p_sender_id THEN
    RAISE EXCEPTION 'Unauthorized sender';
  END IF;

  IF p_coins_amount IS NULL OR p_coins_amount <= 0 THEN
    RAISE EXCEPTION 'coins amount must be positive';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('comment_gift:' || p_request_id)::bigint);

  SELECT cg.id, cg.recipient_id, cg.coins, cg.gift_id
  INTO v_gift_id, v_recipient_id, v_existing_coins, v_canonical_gift_id
  FROM public.comment_gifts cg
  WHERE cg.request_id = p_request_id
  LIMIT 1;

  IF v_gift_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'gift_id', v_canonical_gift_id,
      'feed_gift_id', v_gift_id,
      'already_existed', true,
      'recipient_id', v_recipient_id,
      'coins_spent', COALESCE(v_existing_coins, p_coins_amount),
      'diamonds_awarded', COALESCE(v_existing_coins, p_coins_amount)
    );
  END IF;

  SELECT c.author_id, c.post_id
  INTO v_recipient_id, v_post_id
  FROM public.post_comments c
  WHERE c.id = p_comment_id;

  IF v_recipient_id IS NULL THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  IF v_recipient_id = p_sender_id THEN
    RAISE EXCEPTION 'Cannot gift yourself';
  END IF;

  v_send_result := public.send_gift_v2(
    p_sender_id,
    v_recipient_id,
    p_coins_amount,
    NULL,
    NULL,
    p_request_id
  );

  v_canonical_gift_id := NULLIF(v_send_result->>'gift_id', '')::bigint;

  INSERT INTO public.comment_gifts (comment_id, sender_id, recipient_id, coins, gift_id, request_id)
  VALUES (p_comment_id, p_sender_id, v_recipient_id, p_coins_amount, v_canonical_gift_id, p_request_id)
  RETURNING id INTO v_gift_id;

  RETURN jsonb_build_object(
    'gift_id', v_canonical_gift_id,
    'feed_gift_id', v_gift_id,
    'recipient_id', v_recipient_id,
    'coins_spent', p_coins_amount,
    'diamonds_awarded', p_coins_amount,
    'already_existed', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.gift_comment(uuid, uuid, bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gift_comment(uuid, uuid, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gift_comment(uuid, uuid, bigint, text) TO service_role;

COMMIT;
