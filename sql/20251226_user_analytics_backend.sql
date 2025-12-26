DROP FUNCTION IF EXISTS public.get_user_analytics(uuid, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_user_timeseries(uuid, timestamptz, timestamptz, text);
DROP FUNCTION IF EXISTS public.get_top_creators_gifted(uuid, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_top_gifters_for_creator(uuid, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.get_recent_ledger(uuid, integer);
DROP FUNCTION IF EXISTS public._require_self_or_admin(uuid);

CREATE OR REPLACE FUNCTION public._require_self_or_admin(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    -- In Supabase, PostgREST uses roles 'anon' and 'authenticated'.
    -- The SQL editor/admin sessions typically run as privileged roles (e.g. postgres/service_role)
    -- without JWT claims, so auth.uid() is NULL. Allow only privileged roles in that case.
    IF current_user IN ('anon', 'authenticated') THEN
      RAISE EXCEPTION 'unauthorized';
    END IF;
    RETURN;
  END IF;

  IF auth.uid() <> p_profile_id AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_recent_ledger(
  p_profile_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id bigint,
  entry_type text,
  delta_coins bigint,
  delta_diamonds bigint,
  amount_usd_cents integer,
  provider_ref text,
  metadata jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  PERFORM public._require_self_or_admin(p_profile_id);

  RETURN QUERY
  SELECT
    le.id,
    le.entry_type,
    COALESCE(le.delta_coins, 0)::bigint,
    COALESCE(le.delta_diamonds, 0)::bigint,
    le.amount_usd_cents,
    le.provider_ref,
    le.metadata,
    le.created_at
  FROM public.ledger_entries le
  WHERE le.user_id = p_profile_id
  ORDER BY le.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_timeseries(
  p_profile_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_bucket text DEFAULT 'day'
)
RETURNS TABLE (
  bucket_start timestamptz,
  coins_spent bigint,
  diamonds_earned bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_time_col text;
  v_coin_expr text;
  v_diamond_expr text;
  v_sql text;
  v_has_created_at boolean;
  v_has_sent_at boolean;
  v_has_coin_amount boolean;
  v_has_coins_spent boolean;
  v_has_diamonds_awarded boolean;
  v_has_diamond_amount boolean;
  v_has_streamer_revenue boolean;
BEGIN
  PERFORM public._require_self_or_admin(p_profile_id);

  IF p_bucket IS NULL OR lower(p_bucket) NOT IN ('day', 'week') THEN
    RAISE EXCEPTION 'invalid bucket';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'created_at'
  ) INTO v_has_created_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'sent_at'
  ) INTO v_has_sent_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'coin_amount'
  ) INTO v_has_coin_amount;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'coins_spent'
  ) INTO v_has_coins_spent;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'diamonds_awarded'
  ) INTO v_has_diamonds_awarded;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'diamond_amount'
  ) INTO v_has_diamond_amount;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'streamer_revenue'
  ) INTO v_has_streamer_revenue;

  v_time_col := CASE
    WHEN v_has_sent_at THEN 'sent_at'
    WHEN v_has_created_at THEN 'created_at'
    ELSE NULL
  END;

  IF v_time_col IS NULL THEN
    RAISE EXCEPTION 'gifts timestamp column not found (expected sent_at or created_at)';
  END IF;

  v_coin_expr := CASE
    WHEN v_has_coins_spent AND v_has_coin_amount THEN 'COALESCE(g.coins_spent, g.coin_amount)'
    WHEN v_has_coins_spent THEN 'g.coins_spent'
    WHEN v_has_coin_amount THEN 'g.coin_amount'
    ELSE NULL
  END;

  IF v_coin_expr IS NULL THEN
    RAISE EXCEPTION 'gifts coin column not found';
  END IF;

  v_diamond_expr := CASE
    WHEN v_has_diamonds_awarded AND v_has_diamond_amount AND v_has_streamer_revenue THEN format('COALESCE(g.diamonds_awarded, g.diamond_amount, g.streamer_revenue, %s)', v_coin_expr)
    WHEN v_has_diamonds_awarded AND v_has_diamond_amount THEN format('COALESCE(g.diamonds_awarded, g.diamond_amount, %s)', v_coin_expr)
    WHEN v_has_diamonds_awarded AND v_has_streamer_revenue THEN format('COALESCE(g.diamonds_awarded, g.streamer_revenue, %s)', v_coin_expr)
    WHEN v_has_diamonds_awarded THEN format('COALESCE(g.diamonds_awarded, %s)', v_coin_expr)
    WHEN v_has_diamond_amount AND v_has_streamer_revenue THEN format('COALESCE(g.diamond_amount, g.streamer_revenue, %s)', v_coin_expr)
    WHEN v_has_diamond_amount THEN format('COALESCE(g.diamond_amount, %s)', v_coin_expr)
    WHEN v_has_streamer_revenue THEN format('COALESCE(g.streamer_revenue, %s)', v_coin_expr)
    ELSE v_coin_expr
  END;

  v_sql := format(
    'SELECT date_trunc(%L, g.%I) AS bucket_start, ' ||
    'COALESCE(SUM(CASE WHEN g.sender_id = $1 THEN %s ELSE 0 END), 0)::bigint AS coins_spent, ' ||
    'COALESCE(SUM(CASE WHEN g.recipient_id = $1 THEN %s ELSE 0 END), 0)::bigint AS diamonds_earned ' ||
    'FROM public.gifts g ' ||
    'WHERE g.%I >= $2 AND g.%I < $3 ' ||
    'AND (g.sender_id = $1 OR g.recipient_id = $1) ' ||
    'GROUP BY 1 ' ||
    'ORDER BY 1',
    lower(p_bucket),
    v_time_col,
    v_coin_expr,
    v_diamond_expr,
    v_time_col,
    v_time_col
  );

  RETURN QUERY EXECUTE v_sql USING p_profile_id, p_start, p_end;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_top_creators_gifted(
  p_profile_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE (
  recipient_id uuid,
  username text,
  avatar_url text,
  gifts_sent_count bigint,
  coins_spent bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_time_col text;
  v_coin_expr text;
  v_sql text;
  v_has_created_at boolean;
  v_has_sent_at boolean;
  v_has_coin_amount boolean;
  v_has_coins_spent boolean;
BEGIN
  PERFORM public._require_self_or_admin(p_profile_id);

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'created_at'
  ) INTO v_has_created_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'sent_at'
  ) INTO v_has_sent_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'coin_amount'
  ) INTO v_has_coin_amount;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'coins_spent'
  ) INTO v_has_coins_spent;

  v_time_col := CASE
    WHEN v_has_sent_at THEN 'sent_at'
    WHEN v_has_created_at THEN 'created_at'
    ELSE NULL
  END;

  IF v_time_col IS NULL THEN
    RAISE EXCEPTION 'gifts timestamp column not found (expected sent_at or created_at)';
  END IF;

  v_coin_expr := CASE
    WHEN v_has_coins_spent AND v_has_coin_amount THEN 'COALESCE(g.coins_spent, g.coin_amount)'
    WHEN v_has_coins_spent THEN 'g.coins_spent'
    WHEN v_has_coin_amount THEN 'g.coin_amount'
    ELSE NULL
  END;

  IF v_coin_expr IS NULL THEN
    RAISE EXCEPTION 'gifts coin column not found';
  END IF;

  v_sql := format(
    'SELECT ' ||
    'g.recipient_id, ' ||
    'p.username, ' ||
    'p.avatar_url, ' ||
    'COUNT(*)::bigint AS gifts_sent_count, ' ||
    'COALESCE(SUM(%s), 0)::bigint AS coins_spent ' ||
    'FROM public.gifts g ' ||
    'JOIN public.profiles p ON p.id = g.recipient_id ' ||
    'WHERE g.sender_id = $1 ' ||
    'AND g.%I >= $2 AND g.%I < $3 ' ||
    'GROUP BY g.recipient_id, p.username, p.avatar_url ' ||
    'ORDER BY coins_spent DESC ' ||
    'LIMIT 10',
    v_coin_expr,
    v_time_col,
    v_time_col
  );

  RETURN QUERY EXECUTE v_sql USING p_profile_id, p_start, p_end;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_top_gifters_for_creator(
  p_profile_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE (
  sender_id uuid,
  username text,
  avatar_url text,
  gifts_received_count bigint,
  diamonds_earned bigint,
  sender_total_spent bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_time_col text;
  v_coin_expr text;
  v_diamond_expr text;
  v_sql text;
  v_has_created_at boolean;
  v_has_sent_at boolean;
  v_has_coin_amount boolean;
  v_has_coins_spent boolean;
  v_has_diamonds_awarded boolean;
  v_has_diamond_amount boolean;
  v_has_streamer_revenue boolean;
BEGIN
  PERFORM public._require_self_or_admin(p_profile_id);

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'created_at'
  ) INTO v_has_created_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'sent_at'
  ) INTO v_has_sent_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'coin_amount'
  ) INTO v_has_coin_amount;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'coins_spent'
  ) INTO v_has_coins_spent;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'diamonds_awarded'
  ) INTO v_has_diamonds_awarded;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'diamond_amount'
  ) INTO v_has_diamond_amount;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'streamer_revenue'
  ) INTO v_has_streamer_revenue;

  v_time_col := CASE
    WHEN v_has_sent_at THEN 'sent_at'
    WHEN v_has_created_at THEN 'created_at'
    ELSE NULL
  END;

  IF v_time_col IS NULL THEN
    RAISE EXCEPTION 'gifts timestamp column not found (expected sent_at or created_at)';
  END IF;

  v_coin_expr := CASE
    WHEN v_has_coins_spent AND v_has_coin_amount THEN 'COALESCE(g.coins_spent, g.coin_amount)'
    WHEN v_has_coins_spent THEN 'g.coins_spent'
    WHEN v_has_coin_amount THEN 'g.coin_amount'
    ELSE NULL
  END;

  IF v_coin_expr IS NULL THEN
    RAISE EXCEPTION 'gifts coin column not found';
  END IF;

  v_diamond_expr := CASE
    WHEN v_has_diamonds_awarded AND v_has_diamond_amount AND v_has_streamer_revenue THEN format('COALESCE(g.diamonds_awarded, g.diamond_amount, g.streamer_revenue, %s)', v_coin_expr)
    WHEN v_has_diamonds_awarded AND v_has_diamond_amount THEN format('COALESCE(g.diamonds_awarded, g.diamond_amount, %s)', v_coin_expr)
    WHEN v_has_diamonds_awarded AND v_has_streamer_revenue THEN format('COALESCE(g.diamonds_awarded, g.streamer_revenue, %s)', v_coin_expr)
    WHEN v_has_diamonds_awarded THEN format('COALESCE(g.diamonds_awarded, %s)', v_coin_expr)
    WHEN v_has_diamond_amount AND v_has_streamer_revenue THEN format('COALESCE(g.diamond_amount, g.streamer_revenue, %s)', v_coin_expr)
    WHEN v_has_diamond_amount THEN format('COALESCE(g.diamond_amount, %s)', v_coin_expr)
    WHEN v_has_streamer_revenue THEN format('COALESCE(g.streamer_revenue, %s)', v_coin_expr)
    ELSE v_coin_expr
  END;

  v_sql := format(
    'SELECT ' ||
    'g.sender_id, ' ||
    'p.username, ' ||
    'p.avatar_url, ' ||
    'COUNT(*)::bigint AS gifts_received_count, ' ||
    'COALESCE(SUM(%s), 0)::bigint AS diamonds_earned, ' ||
    'COALESCE(p.total_spent, 0)::bigint AS sender_total_spent ' ||
    'FROM public.gifts g ' ||
    'JOIN public.profiles p ON p.id = g.sender_id ' ||
    'WHERE g.recipient_id = $1 ' ||
    'AND g.%I >= $2 AND g.%I < $3 ' ||
    'GROUP BY g.sender_id, p.username, p.avatar_url, p.total_spent ' ||
    'ORDER BY diamonds_earned DESC ' ||
    'LIMIT 10',
    v_diamond_expr,
    v_time_col,
    v_time_col
  );

  RETURN QUERY EXECUTE v_sql USING p_profile_id, p_start, p_end;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_analytics(
  p_profile_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_coin_balance bigint;
  v_earnings_balance bigint;
  v_lifetime_diamonds_earned bigint;
  v_total_spent bigint;
  v_total_gifts_received bigint;

  v_gifts_sent_count bigint;
  v_coins_spent bigint;
  v_max_gift bigint;

  v_gifts_received_count bigint;
  v_diamonds_earned bigint;
  v_max_received bigint;

  v_time_col text;
  v_coin_expr text;
  v_diamond_expr text;
  v_sql text;
  v_has_created_at boolean;
  v_has_sent_at boolean;
  v_has_coin_amount boolean;
  v_has_coins_spent boolean;
  v_has_diamonds_awarded boolean;
  v_has_diamond_amount boolean;
  v_has_streamer_revenue boolean;

  v_top_creators jsonb;
  v_top_gifters jsonb;
  v_coins_spent_by_day jsonb;
  v_diamonds_earned_by_day jsonb;
  v_recent_gifts jsonb;
  v_recent_ledger jsonb;
  v_cashouts jsonb;
BEGIN
  PERFORM public._require_self_or_admin(p_profile_id);

  SELECT
    COALESCE(p.coin_balance, 0)::bigint,
    COALESCE(p.earnings_balance, 0)::bigint,
    COALESCE(p.lifetime_diamonds_earned, 0)::bigint,
    COALESCE(p.total_spent, 0)::bigint,
    COALESCE(p.total_gifts_received, 0)::bigint
  INTO
    v_coin_balance,
    v_earnings_balance,
    v_lifetime_diamonds_earned,
    v_total_spent,
    v_total_gifts_received
  FROM public.profiles p
  WHERE p.id = p_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'created_at'
  ) INTO v_has_created_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'sent_at'
  ) INTO v_has_sent_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'coin_amount'
  ) INTO v_has_coin_amount;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'coins_spent'
  ) INTO v_has_coins_spent;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'diamonds_awarded'
  ) INTO v_has_diamonds_awarded;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'diamond_amount'
  ) INTO v_has_diamond_amount;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'streamer_revenue'
  ) INTO v_has_streamer_revenue;

  v_time_col := CASE
    WHEN v_has_sent_at THEN 'sent_at'
    WHEN v_has_created_at THEN 'created_at'
    ELSE NULL
  END;

  IF v_time_col IS NULL THEN
    RAISE EXCEPTION 'gifts timestamp column not found (expected sent_at or created_at)';
  END IF;

  v_coin_expr := CASE
    WHEN v_has_coins_spent AND v_has_coin_amount THEN 'COALESCE(g.coins_spent, g.coin_amount)'
    WHEN v_has_coins_spent THEN 'g.coins_spent'
    WHEN v_has_coin_amount THEN 'g.coin_amount'
    ELSE NULL
  END;

  IF v_coin_expr IS NULL THEN
    RAISE EXCEPTION 'gifts coin column not found';
  END IF;

  v_diamond_expr := CASE
    WHEN v_has_diamonds_awarded AND v_has_diamond_amount AND v_has_streamer_revenue THEN format('COALESCE(g.diamonds_awarded, g.diamond_amount, g.streamer_revenue, %s)', v_coin_expr)
    WHEN v_has_diamonds_awarded AND v_has_diamond_amount THEN format('COALESCE(g.diamonds_awarded, g.diamond_amount, %s)', v_coin_expr)
    WHEN v_has_diamonds_awarded AND v_has_streamer_revenue THEN format('COALESCE(g.diamonds_awarded, g.streamer_revenue, %s)', v_coin_expr)
    WHEN v_has_diamonds_awarded THEN format('COALESCE(g.diamonds_awarded, %s)', v_coin_expr)
    WHEN v_has_diamond_amount AND v_has_streamer_revenue THEN format('COALESCE(g.diamond_amount, g.streamer_revenue, %s)', v_coin_expr)
    WHEN v_has_diamond_amount THEN format('COALESCE(g.diamond_amount, %s)', v_coin_expr)
    WHEN v_has_streamer_revenue THEN format('COALESCE(g.streamer_revenue, %s)', v_coin_expr)
    ELSE v_coin_expr
  END;

  v_sql := format(
    'SELECT ' ||
    'COUNT(*)::bigint AS gifts_sent_count, ' ||
    'COALESCE(SUM(%s), 0)::bigint AS coins_spent, ' ||
    'COALESCE(MAX(%s), 0)::bigint AS max_gift ' ||
    'FROM public.gifts g ' ||
    'WHERE g.sender_id = $1 ' ||
    '  AND g.%I >= $2 AND g.%I < $3',
    v_coin_expr,
    v_coin_expr,
    v_time_col,
    v_time_col
  );

  EXECUTE v_sql
  INTO v_gifts_sent_count, v_coins_spent, v_max_gift
  USING p_profile_id, p_start, p_end;

  v_sql := format(
    'SELECT ' ||
    'COUNT(*)::bigint AS gifts_received_count, ' ||
    'COALESCE(SUM(%s), 0)::bigint AS diamonds_earned, ' ||
    'COALESCE(MAX(%s), 0)::bigint AS max_received ' ||
    'FROM public.gifts g ' ||
    'WHERE g.recipient_id = $1 ' ||
    '  AND g.%I >= $2 AND g.%I < $3',
    v_diamond_expr,
    v_diamond_expr,
    v_time_col,
    v_time_col
  );

  EXECUTE v_sql
  INTO v_gifts_received_count, v_diamonds_earned, v_max_received
  USING p_profile_id, p_start, p_end;

  v_top_creators := (
    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    FROM (
      SELECT * FROM public.get_top_creators_gifted(p_profile_id, p_start, p_end)
    ) t
  );

  v_top_gifters := (
    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    FROM (
      SELECT * FROM public.get_top_gifters_for_creator(p_profile_id, p_start, p_end)
    ) t
  );

  v_coins_spent_by_day := (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'bucket_start', t.bucket_start,
          'value', t.coins_spent
        )
        ORDER BY t.bucket_start
      ),
      '[]'::jsonb
    )
    FROM public.get_user_timeseries(p_profile_id, p_start, p_end, 'day') t
  );

  v_diamonds_earned_by_day := (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'bucket_start', t.bucket_start,
          'value', t.diamonds_earned
        )
        ORDER BY t.bucket_start
      ),
      '[]'::jsonb
    )
    FROM public.get_user_timeseries(p_profile_id, p_start, p_end, 'day') t
  );

  v_sql := format(
    'SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), ''[]''::jsonb) ' ||
    'FROM ( ' ||
    '  SELECT ' ||
    '    g.id::text AS id, ' ||
    '    g.sender_id::text AS sender_id, ' ||
    '    sender.username AS sender_username, ' ||
    '    g.recipient_id::text AS recipient_id, ' ||
    '    recipient.username AS recipient_username, ' ||
    '    g.gift_type_id, ' ||
    '    gt.name AS gift_type_name, ' ||
    '    (%s)::bigint AS coins_spent, ' ||
    '    (%s)::bigint AS diamonds_awarded, ' ||
    '    g.%I AS created_at ' ||
    '  FROM public.gifts g ' ||
    '  LEFT JOIN public.gift_types gt ON gt.id = g.gift_type_id ' ||
    '  LEFT JOIN public.profiles sender ON sender.id = g.sender_id ' ||
    '  LEFT JOIN public.profiles recipient ON recipient.id = g.recipient_id ' ||
    '  WHERE (g.sender_id = $1 OR g.recipient_id = $1) ' ||
    '    AND g.%I >= $2 AND g.%I < $3 ' ||
    '  ORDER BY g.%I DESC ' ||
    '  LIMIT 20 ' ||
    ') t',
    v_coin_expr,
    v_diamond_expr,
    v_time_col,
    v_time_col,
    v_time_col,
    v_time_col
  );

  EXECUTE v_sql
  INTO v_recent_gifts
  USING p_profile_id, p_start, p_end;

  v_recent_ledger := (
    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    FROM (
      SELECT * FROM public.get_recent_ledger(p_profile_id, 50)
    ) t
  );

  v_cashouts := '[]'::jsonb;
  IF to_regclass('public.cashouts') IS NOT NULL THEN
    v_cashouts := (
      SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      FROM (
        SELECT
          c.id::text AS id,
          c.diamonds_debited::bigint AS diamonds_debited,
          c.amount_usd_cents,
          c.status,
          c.created_at,
          c.updated_at
        FROM public.cashouts c
        WHERE c.user_id = p_profile_id
        ORDER BY c.created_at DESC
        LIMIT 50
      ) t
    );
  END IF;

  RETURN jsonb_build_object(
    'balances', jsonb_build_object(
      'coin_balance', v_coin_balance,
      'earnings_balance', v_earnings_balance
    ),
    'lifetime', jsonb_build_object(
      'lifetime_diamonds_earned', v_lifetime_diamonds_earned,
      'total_spent', v_total_spent,
      'total_gifts_received', v_total_gifts_received
    ),
    'gifting_summary', jsonb_build_object(
      'gifts_sent_count', v_gifts_sent_count,
      'coins_spent', v_coins_spent,
      'avg_gift', CASE WHEN v_gifts_sent_count > 0 THEN (v_coins_spent / v_gifts_sent_count) ELSE 0 END,
      'max_gift', v_max_gift
    ),
    'earnings_summary', jsonb_build_object(
      'gifts_received_count', v_gifts_received_count,
      'diamonds_earned', v_diamonds_earned,
      'avg_received', CASE WHEN v_gifts_received_count > 0 THEN (v_diamonds_earned / v_gifts_received_count) ELSE 0 END,
      'max_received', v_max_received
    ),
    'top_creators_gifted', v_top_creators,
    'top_gifters', v_top_gifters,
    'timeseries', jsonb_build_object(
      'coins_spent_by_day', v_coins_spent_by_day,
      'diamonds_earned_by_day', v_diamonds_earned_by_day
    ),
    'recent_activity', jsonb_build_object(
      'recent_gifts', v_recent_gifts,
      'recent_ledger', v_recent_ledger
    ),
    'cashout_history', v_cashouts
  );
END;
$$;
