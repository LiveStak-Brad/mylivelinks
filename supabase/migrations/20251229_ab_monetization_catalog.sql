BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.gift_types (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  emoji text,
  icon_url text,
  coin_cost integer NOT NULL DEFAULT 0,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gift_types_is_active_order ON public.gift_types(is_active, display_order);

ALTER TABLE public.gift_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gift types are readable" ON public.gift_types;
CREATE POLICY "Gift types are readable" ON public.gift_types
FOR SELECT
USING (true);

CREATE TABLE IF NOT EXISTS public.coin_packs (
  id bigserial PRIMARY KEY,
  sku text UNIQUE,
  name text NOT NULL,
  coins bigint NOT NULL DEFAULT 0,
  price_usd numeric NOT NULL DEFAULT 0,
  bonus_coins integer NOT NULL DEFAULT 0,
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  stripe_price_id text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  coins_amount bigint GENERATED ALWAYS AS (coins) STORED,
  price_cents integer GENERATED ALWAYS AS (round(price_usd * 100)) STORED,
  active boolean GENERATED ALWAYS AS (is_active) STORED
);

CREATE INDEX IF NOT EXISTS idx_coin_packs_is_active_order ON public.coin_packs(is_active, display_order);

ALTER TABLE public.coin_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coin packs are readable" ON public.coin_packs;
CREATE POLICY "Coin packs are readable" ON public.coin_packs
FOR SELECT
USING (true);

COMMIT;
