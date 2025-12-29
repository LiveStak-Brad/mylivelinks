BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'platform_settings'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'platform_settings' AND column_name = 'key'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'platform_settings' AND column_name = 'value'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'platform_settings' AND column_name = 'take_percent'
    ) THEN
      EXECUTE 'ALTER TABLE public.platform_settings RENAME TO platform_settings_kv';
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.platform_settings_kv (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings_kv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read platform settings kv" ON public.platform_settings_kv;
CREATE POLICY "Admins can read platform settings kv" ON public.platform_settings_kv
FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can write platform settings kv" ON public.platform_settings_kv;
CREATE POLICY "Admins can write platform settings kv" ON public.platform_settings_kv
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true,
  take_percent numeric NOT NULL DEFAULT 30,
  payout_threshold_cents integer NOT NULL DEFAULT 5000,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_singleton CHECK (id = true)
);

INSERT INTO public.platform_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read platform settings" ON public.platform_settings;
CREATE POLICY "Admins can read platform settings" ON public.platform_settings
FOR SELECT
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can write platform settings" ON public.platform_settings;
CREATE POLICY "Admins can write platform settings" ON public.platform_settings
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.coin_packs
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'web';

ALTER TABLE public.coin_packs
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

UPDATE public.coin_packs
SET sort_order = COALESCE(sort_order, display_order, 0);

ALTER TABLE public.gift_types
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

UPDATE public.gift_types
SET sort_order = COALESCE(sort_order, display_order, 0);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gift_types' AND column_name = 'active'
  ) THEN
    EXECUTE 'ALTER TABLE public.gift_types ADD COLUMN active boolean GENERATED ALWAYS AS (is_active) STORED';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coin_packs_active_sort_order ON public.coin_packs(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_coin_packs_platform_active_sort_order ON public.coin_packs(platform, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_gift_types_active_sort_order ON public.gift_types(is_active, sort_order);

-- Allow admins to mutate catalog tables (public can still read via existing policies)
DROP POLICY IF EXISTS "Admins can write coin packs" ON public.coin_packs;
CREATE POLICY "Admins can write coin packs" ON public.coin_packs
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can write gift types" ON public.gift_types;
CREATE POLICY "Admins can write gift types" ON public.gift_types
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_coin_packs_updated_at ON public.coin_packs;
CREATE TRIGGER trg_coin_packs_updated_at
BEFORE UPDATE ON public.coin_packs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_gift_types_updated_at ON public.gift_types;
CREATE TRIGGER trg_gift_types_updated_at
BEFORE UPDATE ON public.gift_types
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_platform_settings_updated_at ON public.platform_settings;
CREATE TRIGGER trg_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_platform_settings_kv_updated_at ON public.platform_settings_kv;
CREATE TRIGGER trg_platform_settings_kv_updated_at
BEFORE UPDATE ON public.platform_settings_kv
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.audit_economy_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_target_id text;
  v_metadata jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF NOT public.is_admin(auth.uid()) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_target_id := COALESCE((NEW.id)::text, (OLD.id)::text, 'unknown');

  IF TG_OP = 'INSERT' THEN
    v_action := 'economy_insert';
    v_metadata := jsonb_build_object('table', TG_TABLE_NAME, 'row', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'economy_update';
    v_metadata := jsonb_build_object('table', TG_TABLE_NAME, 'before', to_jsonb(OLD), 'after', to_jsonb(NEW));
  ELSE
    v_action := 'economy_delete';
    v_metadata := jsonb_build_object('table', TG_TABLE_NAME, 'row', to_jsonb(OLD));
  END IF;

  PERFORM public.admin_log_action(
    v_action,
    TG_TABLE_NAME,
    v_target_id,
    v_metadata
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_coin_packs ON public.coin_packs;
CREATE TRIGGER trg_audit_coin_packs
AFTER INSERT OR UPDATE OR DELETE ON public.coin_packs
FOR EACH ROW
EXECUTE FUNCTION public.audit_economy_change();

DROP TRIGGER IF EXISTS trg_audit_gift_types ON public.gift_types;
CREATE TRIGGER trg_audit_gift_types
AFTER INSERT OR UPDATE OR DELETE ON public.gift_types
FOR EACH ROW
EXECUTE FUNCTION public.audit_economy_change();

DROP TRIGGER IF EXISTS trg_audit_platform_settings ON public.platform_settings;
CREATE TRIGGER trg_audit_platform_settings
AFTER INSERT OR UPDATE OR DELETE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.audit_economy_change();

COMMIT;
