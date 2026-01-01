BEGIN;

CREATE TABLE IF NOT EXISTS public.money_config (
  key TEXT PRIMARY KEY,
  value_num NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS public.gifts (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gift_type_id BIGINT,
  coin_amount BIGINT NOT NULL,
  platform_revenue BIGINT DEFAULT 0,
  streamer_revenue BIGINT DEFAULT 0,
  live_stream_id BIGINT,
  coins_spent BIGINT,
  diamonds_awarded BIGINT,
  platform_fee_coins BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.apply_ledger_entry_to_profile_balances()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET coin_balance = GREATEST(0, COALESCE(coin_balance, 0) + COALESCE(NEW.delta_coins, 0)),
      earnings_balance = GREATEST(0, COALESCE(earnings_balance, 0) + COALESCE(NEW.delta_diamonds, 0)),
      last_transaction_at = now()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_ledger_entry_to_profile_balances ON public.ledger_entries;

CREATE TRIGGER trg_apply_ledger_entry_to_profile_balances
AFTER INSERT ON public.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.apply_ledger_entry_to_profile_balances();

INSERT INTO public.money_config (key, value_num)
VALUES
  ('gift_diamond_rate', 1.0),
  ('conversion_coin_rate', 0.6)
ON CONFLICT (key) DO UPDATE SET value_num = EXCLUDED.value_num;

COMMIT;
