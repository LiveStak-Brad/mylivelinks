BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'room_templates'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'room_templates' AND column_name = 'description'
    ) THEN
      EXECUTE 'ALTER TABLE public.room_templates ADD COLUMN description text';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'room_templates' AND column_name = 'default_feature_flags'
    ) THEN
      EXECUTE 'ALTER TABLE public.room_templates ADD COLUMN default_feature_flags jsonb NOT NULL DEFAULT ''{}''::jsonb';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'room_templates' AND column_name = 'default_interest_threshold'
    ) THEN
      EXECUTE 'ALTER TABLE public.room_templates ADD COLUMN default_interest_threshold int NOT NULL DEFAULT 500';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'room_templates' AND column_name = 'default_max_participants'
    ) THEN
      EXECUTE 'ALTER TABLE public.room_templates ADD COLUMN default_max_participants int NOT NULL DEFAULT 12';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'room_templates' AND column_name = 'default_disclaimer_required'
    ) THEN
      EXECUTE 'ALTER TABLE public.room_templates ADD COLUMN default_disclaimer_required boolean NOT NULL DEFAULT false';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'room_templates' AND column_name = 'default_disclaimer_text'
    ) THEN
      EXECUTE 'ALTER TABLE public.room_templates ADD COLUMN default_disclaimer_text text';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'coin_packs'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coin_packs' AND column_name = 'is_active'
    ) THEN
      EXECUTE 'ALTER TABLE public.coin_packs ADD COLUMN is_active boolean';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coin_packs' AND column_name = 'active'
    ) THEN
      EXECUTE 'UPDATE public.coin_packs SET is_active = COALESCE(is_active, active, true)';
    ELSE
      EXECUTE 'UPDATE public.coin_packs SET is_active = COALESCE(is_active, true)';
    END IF;

    EXECUTE 'ALTER TABLE public.coin_packs ALTER COLUMN is_active SET DEFAULT true';
    EXECUTE 'ALTER TABLE public.coin_packs ALTER COLUMN is_active SET NOT NULL';

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coin_packs' AND column_name = 'coins'
    ) THEN
      EXECUTE 'ALTER TABLE public.coin_packs ADD COLUMN coins bigint NOT NULL DEFAULT 0';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coin_packs' AND column_name = 'price_usd'
    ) THEN
      EXECUTE 'ALTER TABLE public.coin_packs ADD COLUMN price_usd numeric NOT NULL DEFAULT 0';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coin_packs' AND column_name = 'bonus_coins'
    ) THEN
      EXECUTE 'ALTER TABLE public.coin_packs ADD COLUMN bonus_coins integer NOT NULL DEFAULT 0';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coin_packs' AND column_name = 'is_popular'
    ) THEN
      EXECUTE 'ALTER TABLE public.coin_packs ADD COLUMN is_popular boolean NOT NULL DEFAULT false';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coin_packs' AND column_name = 'display_order'
    ) THEN
      EXECUTE 'ALTER TABLE public.coin_packs ADD COLUMN display_order integer NOT NULL DEFAULT 0';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coin_packs' AND column_name = 'coins_amount'
    ) THEN
      EXECUTE 'UPDATE public.coin_packs SET coins = GREATEST(coins, COALESCE(coins_amount, 0))';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coin_packs' AND column_name = 'price_cents'
    ) THEN
      EXECUTE 'UPDATE public.coin_packs SET price_usd = GREATEST(price_usd, COALESCE(price_cents, 0) / 100.0)';
    END IF;
  END IF;
END $$;

COMMIT;
