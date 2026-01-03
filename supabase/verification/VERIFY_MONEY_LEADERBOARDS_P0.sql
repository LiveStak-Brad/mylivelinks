-- VERIFY_MONEY_LEADERBOARDS_P0.sql
-- Copy/paste into Supabase SQL editor.
-- Goal: prove coins/diamonds/gifts/leaderboards track from ledger_entries and are readable.

-- ===============================
-- PARAMETERS
-- ===============================
-- Set these 2 to real values for deeper tracing.
-- You can leave them NULL to run generic checks.

DO $$
BEGIN
  -- no-op wrapper so this file can be run as a single script
END $$;

-- Replace with an actual room slug / room_id string used in ledger_entries.room_id or metadata->>'room_id'
-- Example: 'live-central'
WITH params AS (
  SELECT
    NULL::uuid AS p_profile_id,
    NULL::text AS p_room_id
)
SELECT * FROM params;

-- ===============================
-- 0) CANONICAL OBJECTS EXIST
-- ===============================

-- ledger_entries exists
SELECT
  to_regclass('public.ledger_entries') AS ledger_entries_exists,
  to_regclass('public.coin_purchases') AS coin_purchases_exists,
  to_regclass('public.gifts') AS gifts_exists,
  to_regclass('public.leaderboard_cache') AS leaderboard_cache_exists;

-- Trigger exists (balances derived)
SELECT
  t.tgname AS trigger_name,
  c.relname AS table_name,
  pg_get_triggerdef(t.oid) AS trigger_def
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'ledger_entries'
  AND t.tgname = 'trg_apply_ledger_entry_to_profile_balances'
  AND NOT t.tgisinternal;

-- get_leaderboard signatures present
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS identity_args,
  pg_get_function_result(p.oid) AS result_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_leaderboard'
ORDER BY identity_args;

-- ===============================
-- 1) RECENT COIN PURCHASES -> LEDGER
-- ===============================

-- Most recent coin purchases and their ledger linkage
SELECT
  cp.id AS coin_purchase_id,
  cp.profile_id,
  cp.provider_payment_id,
  cp.status,
  cp.coins_awarded,
  cp.amount_usd_cents,
  cp.ledger_entry_id,
  le.id AS ledger_id,
  le.entry_type,
  le.delta_coins,
  le.amount_usd_cents AS ledger_usd_cents,
  le.created_at AS ledger_created_at
FROM public.coin_purchases cp
LEFT JOIN public.ledger_entries le
  ON le.id::text = cp.ledger_entry_id::text
ORDER BY cp.id DESC
LIMIT 20;

-- Any confirmed purchases missing ledger entries (should be 0)
SELECT
  COUNT(*) AS confirmed_purchases_missing_ledger
FROM public.coin_purchases cp
LEFT JOIN public.ledger_entries le
  ON le.id::text = cp.ledger_entry_id::text
WHERE cp.status = 'confirmed'
  AND (cp.ledger_entry_id IS NULL OR le.id IS NULL);

-- ===============================
-- 2) RECENT GIFTS -> LEDGER (2 entries per gift)
-- ===============================

-- Recent gifts with expected ledger entries
SELECT
  g.id AS gift_id,
  g.sender_id,
  g.recipient_id,
  g.coins_spent,
  g.diamonds_awarded,
  g.request_id,
  COUNT(le.id) FILTER (WHERE le.entry_type = 'coin_spend_gift') AS sender_ledger_rows,
  COUNT(le2.id) FILTER (WHERE le2.entry_type = 'diamond_earn') AS recipient_ledger_rows
FROM public.gifts g
LEFT JOIN public.ledger_entries le
  ON le.provider_ref = ('gift:' || g.id::text)
LEFT JOIN public.ledger_entries le2
  ON le2.provider_ref = ('gift:' || g.id::text)
GROUP BY g.id
ORDER BY g.id DESC
LIMIT 20;

-- Gifts missing either sender or recipient ledger entry (should be 0)
WITH gift_ledger AS (
  SELECT
    g.id AS gift_id,
    COUNT(*) FILTER (WHERE le.entry_type = 'coin_spend_gift') AS coin_spend_rows,
    COUNT(*) FILTER (WHERE le.entry_type = 'diamond_earn') AS diamond_earn_rows
  FROM public.gifts g
  LEFT JOIN public.ledger_entries le
    ON le.provider_ref = ('gift:' || g.id::text)
  GROUP BY g.id
)
SELECT
  COUNT(*) AS gifts_missing_expected_ledger_rows
FROM gift_ledger
WHERE coin_spend_rows = 0 OR diamond_earn_rows = 0;

-- ===============================
-- 3) BALANCES: profiles vs derived sums (ledger_entries)
-- ===============================

WITH params AS (
  SELECT
    NULL::uuid AS p_profile_id
),
agg AS (
  SELECT
    le.user_id,
    SUM(COALESCE(le.delta_coins, 0))::bigint AS sum_delta_coins,
    SUM(COALESCE(le.delta_diamonds, 0))::bigint AS sum_delta_diamonds,
    MAX(le.created_at) AS last_ledger_at
  FROM public.ledger_entries le
  GROUP BY le.user_id
)
SELECT
  p.id AS profile_id,
  p.username,
  p.coin_balance,
  p.earnings_balance,
  COALESCE(a.sum_delta_coins, 0) AS derived_coins,
  COALESCE(a.sum_delta_diamonds, 0) AS derived_diamonds,
  (p.coin_balance - COALESCE(a.sum_delta_coins, 0)) AS coins_diff,
  (p.earnings_balance - COALESCE(a.sum_delta_diamonds, 0)) AS diamonds_diff,
  a.last_ledger_at
FROM public.profiles p
LEFT JOIN agg a ON a.user_id = p.id
WHERE (SELECT p_profile_id FROM params) IS NULL OR p.id = (SELECT p_profile_id FROM params)
ORDER BY a.last_ledger_at DESC NULLS LAST
LIMIT 20;

-- ===============================
-- 4) GLOBAL LEADERBOARD CHECK (top 10)
-- ===============================

-- Top gifters (coins spent) from RPC and from direct ledger aggregation should match
WITH rpc AS (
  SELECT *
  FROM public.get_leaderboard('top_gifters', 'alltime', 10, NULL)
),
agg AS (
  SELECT
    le.user_id AS profile_id,
    SUM(ABS(le.delta_coins))::bigint AS metric_value
  FROM public.ledger_entries le
  WHERE le.entry_type = 'coin_spend_gift'
    AND COALESCE(le.delta_coins, 0) <> 0
  GROUP BY le.user_id
),
agg_ranked AS (
  SELECT
    a.profile_id,
    a.metric_value,
    ROW_NUMBER() OVER (ORDER BY a.metric_value DESC, a.profile_id ASC)::int AS rank
  FROM agg a
)
SELECT
  'rpc' AS source,
  r.profile_id,
  r.username,
  r.metric_value,
  r.rank
FROM rpc r
UNION ALL
SELECT
  'agg' AS source,
  ar.profile_id,
  p.username,
  ar.metric_value,
  ar.rank
FROM agg_ranked ar
LEFT JOIN public.profiles p ON p.id = ar.profile_id
WHERE ar.rank <= 10
ORDER BY source, rank;

-- Top streamers (diamonds earned) global
WITH rpc AS (
  SELECT *
  FROM public.get_leaderboard('top_streamers', 'alltime', 10, NULL)
),
agg AS (
  SELECT
    le.user_id AS profile_id,
    SUM(COALESCE(le.delta_diamonds, 0))::bigint AS metric_value
  FROM public.ledger_entries le
  WHERE le.entry_type = 'diamond_earn'
    AND COALESCE(le.delta_diamonds, 0) > 0
  GROUP BY le.user_id
),
agg_ranked AS (
  SELECT
    a.profile_id,
    a.metric_value,
    ROW_NUMBER() OVER (ORDER BY a.metric_value DESC, a.profile_id ASC)::int AS rank
  FROM agg a
)
SELECT
  'rpc' AS source,
  r.profile_id,
  r.username,
  r.metric_value,
  r.rank
FROM rpc r
UNION ALL
SELECT
  'agg' AS source,
  ar.profile_id,
  p.username,
  ar.metric_value,
  ar.rank
FROM agg_ranked ar
LEFT JOIN public.profiles p ON p.id = ar.profile_id
WHERE ar.rank <= 10
ORDER BY source, rank;

-- ===============================
-- 5) ROOM LEADERBOARD CHECK (top 10)
-- ===============================

-- NOTE: Set params.p_room_id above (e.g. 'live-central').
WITH params AS (
  SELECT NULL::text AS p_room_id
),
rpc AS (
  SELECT *
  FROM public.get_leaderboard('top_gifters', 'alltime', 10, (SELECT p_room_id FROM params))
),
agg AS (
  SELECT
    le.user_id AS profile_id,
    SUM(ABS(le.delta_coins))::bigint AS metric_value
  FROM public.ledger_entries le
  WHERE le.entry_type = 'coin_spend_gift'
    AND COALESCE(le.delta_coins, 0) <> 0
    AND (
      (SELECT p_room_id FROM params) IS NULL
      OR COALESCE(le.room_id, le.metadata->>'room_id') = (SELECT p_room_id FROM params)
    )
  GROUP BY le.user_id
),
agg_ranked AS (
  SELECT
    a.profile_id,
    a.metric_value,
    ROW_NUMBER() OVER (ORDER BY a.metric_value DESC, a.profile_id ASC)::int AS rank
  FROM agg a
)
SELECT
  'rpc' AS source,
  r.profile_id,
  r.username,
  r.metric_value,
  r.rank
FROM rpc r
UNION ALL
SELECT
  'agg' AS source,
  ar.profile_id,
  p.username,
  ar.metric_value,
  ar.rank
FROM agg_ranked ar
LEFT JOIN public.profiles p ON p.id = ar.profile_id
WHERE ar.rank <= 10
ORDER BY source, rank;

-- Room top streamers (diamonds earned)
WITH params AS (
  SELECT NULL::text AS p_room_id
),
rpc AS (
  SELECT *
  FROM public.get_leaderboard('top_streamers', 'alltime', 10, (SELECT p_room_id FROM params))
),
agg AS (
  SELECT
    le.user_id AS profile_id,
    SUM(COALESCE(le.delta_diamonds, 0))::bigint AS metric_value
  FROM public.ledger_entries le
  WHERE le.entry_type = 'diamond_earn'
    AND COALESCE(le.delta_diamonds, 0) > 0
    AND (
      (SELECT p_room_id FROM params) IS NULL
      OR COALESCE(le.room_id, le.metadata->>'room_id') = (SELECT p_room_id FROM params)
    )
  GROUP BY le.user_id
),
agg_ranked AS (
  SELECT
    a.profile_id,
    a.metric_value,
    ROW_NUMBER() OVER (ORDER BY a.metric_value DESC, a.profile_id ASC)::int AS rank
  FROM agg a
)
SELECT
  'rpc' AS source,
  r.profile_id,
  r.username,
  r.metric_value,
  r.rank
FROM rpc r
UNION ALL
SELECT
  'agg' AS source,
  ar.profile_id,
  p.username,
  ar.metric_value,
  ar.rank
FROM agg_ranked ar
LEFT JOIN public.profiles p ON p.id = ar.profile_id
WHERE ar.rank <= 10
ORDER BY source, rank;

-- ===============================
-- 6) RLS SMOKE: what can authenticated read?
-- ===============================

-- NOTE: In Supabase SQL editor, auth.uid() is typically NULL unless you use the "Run as" feature.
-- This section is included for completeness; use the Supabase UI to run-as-authenticated if needed.
SELECT
  auth.uid() AS auth_uid,
  (auth.uid() IS NOT NULL) AS is_authed;

-- Authenticated should be able to read leaderboard RPC (SECURITY DEFINER with row_security off)
-- If auth.uid() is NULL here, run-as-authenticated to validate.
SELECT *
FROM public.get_leaderboard('top_streamers', 'daily', 5, NULL);
