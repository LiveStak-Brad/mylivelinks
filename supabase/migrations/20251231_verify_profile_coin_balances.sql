BEGIN;

CREATE OR REPLACE FUNCTION public.verify_profile_coin_balances()
RETURNS TABLE (
  profile_id UUID,
  username TEXT,
  ledger_coin_balance BIGINT,
  profile_coin_balance BIGINT,
  coin_diff BIGINT,
  ledger_earnings_balance BIGINT,
  profile_earnings_balance BIGINT,
  earnings_diff BIGINT,
  last_ledger_entry_at TIMESTAMPTZ,
  profile_last_transaction_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ledger_totals AS (
    SELECT
      le.user_id,
      COALESCE(SUM(le.delta_coins), 0)::BIGINT AS coins_total,
      COALESCE(SUM(le.delta_diamonds), 0)::BIGINT AS diamonds_total,
      MAX(le.created_at) AS last_entry_at
    FROM public.ledger_entries le
    GROUP BY le.user_id
  )
  SELECT
    p.id AS profile_id,
    p.username,
    COALESCE(lt.coins_total, 0) AS ledger_coin_balance,
    COALESCE(p.coin_balance, 0) AS profile_coin_balance,
    COALESCE(lt.coins_total, 0) - COALESCE(p.coin_balance, 0) AS coin_diff,
    COALESCE(lt.diamonds_total, 0) AS ledger_earnings_balance,
    COALESCE(p.earnings_balance, 0) AS profile_earnings_balance,
    COALESCE(lt.diamonds_total, 0) - COALESCE(p.earnings_balance, 0) AS earnings_diff,
    lt.last_entry_at AS last_ledger_entry_at,
    p.last_transaction_at AS profile_last_transaction_at
  FROM public.profiles p
  LEFT JOIN ledger_totals lt ON lt.user_id = p.id
  WHERE COALESCE(lt.coins_total, 0) <> COALESCE(p.coin_balance, 0)
     OR COALESCE(lt.diamonds_total, 0) <> COALESCE(p.earnings_balance, 0)
  ORDER BY ABS(COALESCE(lt.coins_total, 0) - COALESCE(p.coin_balance, 0)) DESC,
           ABS(COALESCE(lt.diamonds_total, 0) - COALESCE(p.earnings_balance, 0)) DESC;
END;
$$;

COMMIT;
