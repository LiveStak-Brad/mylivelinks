-- Authoritative Room Templates + Room Instances Migration
-- NOTE: This migration standardizes the platform on:
--   - public.room_templates
--   - public.rooms
--   - public.room_interest
-- and provides a merged config function public.room_effective_config(room_id)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Shared updated_at trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- room_templates (authoritative)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text,
  name text,
  layout_type text NOT NULL DEFAULT 'grid' CHECK (layout_type IN ('grid','versus','panel')),
  default_max_participants int NOT NULL DEFAULT 12,
  default_interest_threshold int NOT NULL DEFAULT 500,
  default_status text NOT NULL DEFAULT 'interest' CHECK (default_status IN ('draft','interest','opening_soon','live','paused')),
  default_category text NOT NULL DEFAULT 'entertainment',
  default_disclaimer_required boolean NOT NULL DEFAULT false,
  default_disclaimer_text text,
  default_feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.room_templates
  ADD COLUMN IF NOT EXISTS template_key text;

ALTER TABLE public.room_templates
  ADD COLUMN IF NOT EXISTS default_feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.room_templates
  ADD COLUMN IF NOT EXISTS default_disclaimer_text text;

ALTER TABLE public.room_templates
  ADD COLUMN IF NOT EXISTS default_status text;

ALTER TABLE public.room_templates
  ADD COLUMN IF NOT EXISTS default_category text;

ALTER TABLE public.room_templates
  ADD COLUMN IF NOT EXISTS name text;

ALTER TABLE public.room_templates
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.room_templates
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill template_key for existing rows
DO $$
DECLARE
  r record;
  v_key text;
  v_i int;
BEGIN
  FOR r IN SELECT id, name FROM public.room_templates WHERE template_key IS NULL LOOP
    v_key := lower(regexp_replace(coalesce(r.name, 'template'), '[^a-z0-9]+', '_', 'g'));
    v_key := trim(both '_' from v_key);
    IF v_key = '' THEN v_key := 'template'; END IF;

    v_i := 0;
    WHILE EXISTS (SELECT 1 FROM public.room_templates t WHERE t.template_key = v_key AND t.id <> r.id) LOOP
      v_i := v_i + 1;
      v_key := v_key || '_' || v_i::text;
    END LOOP;

    UPDATE public.room_templates
    SET template_key = v_key
    WHERE id = r.id;
  END LOOP;
END $$;

-- Ensure unique + not null
CREATE UNIQUE INDEX IF NOT EXISTS uniq_room_templates_template_key ON public.room_templates(template_key);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.room_templates WHERE template_key IS NULL LIMIT 1) THEN
    ALTER TABLE public.room_templates ALTER COLUMN template_key SET NOT NULL;
  END IF;
END $$;

-- Updated-at trigger
DROP TRIGGER IF EXISTS trg_room_templates_set_updated_at ON public.room_templates;
CREATE TRIGGER trg_room_templates_set_updated_at
BEFORE UPDATE ON public.room_templates
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- rooms (authoritative instances)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_key text UNIQUE NOT NULL,
  template_id uuid REFERENCES public.room_templates(id),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('gaming','music','entertainment')),
  status text NOT NULL DEFAULT 'interest' CHECK (status IN ('draft','interest','opening_soon','live','paused')),
  description text,
  banner_url text,
  image_url text,
  fallback_gradient text,
  theme_color text,
  subtitle text,
  background_image text,
  special_badge text,
  display_order int NOT NULL DEFAULT 0,
  max_participants int,
  interest_threshold int,
  disclaimer_required boolean,
  disclaimer_text text,
  feature_flags jsonb,
  current_interest_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure columns exist on an older public.rooms schema (if present)
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.room_templates(id);
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS fallback_gradient text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS theme_color text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS subtitle text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS background_image text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS special_badge text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS display_order int NOT NULL DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS disclaimer_text text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS feature_flags jsonb;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS current_interest_count int NOT NULL DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Override columns must be nullable
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.rooms ALTER COLUMN max_participants DROP NOT NULL;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE public.rooms ALTER COLUMN interest_threshold DROP NOT NULL;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE public.rooms ALTER COLUMN disclaimer_required DROP NOT NULL;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE public.rooms ALTER COLUMN interest_threshold DROP DEFAULT;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE public.rooms ALTER COLUMN max_participants DROP DEFAULT;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE public.rooms ALTER COLUMN disclaimer_required DROP DEFAULT;
  EXCEPTION WHEN others THEN
    NULL;
  END;
END $$;

CREATE INDEX IF NOT EXISTS idx_rooms_category ON public.rooms(category);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_interest_count ON public.rooms(current_interest_count DESC);

DROP TRIGGER IF EXISTS trg_rooms_set_updated_at ON public.rooms;
CREATE TRIGGER trg_rooms_set_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- room_interest (authoritative)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_interest (
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_room_interest_profile_id ON public.room_interest(profile_id);

CREATE OR REPLACE FUNCTION public.rooms_apply_interest_count_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.rooms
    SET current_interest_count = current_interest_count + 1,
        updated_at = now()
    WHERE id = NEW.room_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.rooms
    SET current_interest_count = GREATEST(current_interest_count - 1, 0),
        updated_at = now()
    WHERE id = OLD.room_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_rooms_interest_count_insert ON public.room_interest;
CREATE TRIGGER trigger_rooms_interest_count_insert
AFTER INSERT ON public.room_interest
FOR EACH ROW
EXECUTE FUNCTION public.rooms_apply_interest_count_change();

DROP TRIGGER IF EXISTS trigger_rooms_interest_count_delete ON public.room_interest;
CREATE TRIGGER trigger_rooms_interest_count_delete
AFTER DELETE ON public.room_interest
FOR EACH ROW
EXECUTE FUNCTION public.rooms_apply_interest_count_change();

-- -----------------------------------------------------------------------------
-- Effective config (single source of truth for runtime)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.room_effective_config(p_room_id uuid)
RETURNS TABLE(
  room_id uuid,
  room_key text,
  template_id uuid,
  template_key text,
  name text,
  category text,
  status text,
  description text,
  layout_type text,
  banner_url text,
  image_url text,
  fallback_gradient text,
  theme_color text,
  subtitle text,
  background_image text,
  special_badge text,
  display_order int,
  current_interest_count int,
  effective_max_participants int,
  effective_interest_threshold int,
  effective_disclaimer_required boolean,
  effective_disclaimer_text text,
  effective_feature_flags jsonb
) AS $$
  SELECT
    r.id AS room_id,
    r.room_key,
    r.template_id,
    t.template_key,
    r.name,
    r.category,
    r.status,
    r.description,
    t.layout_type,
    r.banner_url,
    r.image_url,
    COALESCE(r.fallback_gradient, (t.default_feature_flags->>'fallback_gradient')) AS fallback_gradient,
    COALESCE(r.theme_color, (t.default_feature_flags->>'theme_color')) AS theme_color,
    r.subtitle,
    r.background_image,
    r.special_badge,
    r.display_order,
    r.current_interest_count,
    COALESCE(r.max_participants, t.default_max_participants) AS effective_max_participants,
    COALESCE(r.interest_threshold, t.default_interest_threshold) AS effective_interest_threshold,
    COALESCE(r.disclaimer_required, t.default_disclaimer_required) AS effective_disclaimer_required,
    COALESCE(r.disclaimer_text, t.default_disclaimer_text) AS effective_disclaimer_text,
    COALESCE(r.feature_flags, t.default_feature_flags, '{}'::jsonb) AS effective_feature_flags
  FROM public.rooms r
  LEFT JOIN public.room_templates t ON t.id = r.template_id
  WHERE r.id = p_room_id;
$$ LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off;

CREATE OR REPLACE VIEW public.v_rooms_effective AS
SELECT
  r.id,
  r.room_key,
  r.template_id,
  r.name,
  r.category,
  r.status,
  r.description,
  r.banner_url,
  r.image_url,
  r.fallback_gradient,
  r.theme_color,
  r.subtitle,
  r.background_image,
  r.special_badge,
  r.display_order,
  r.max_participants,
  r.interest_threshold,
  r.disclaimer_required,
  r.disclaimer_text,
  r.feature_flags,
  r.current_interest_count,
  r.created_at,
  r.updated_at,
  c.template_key,
  c.layout_type,
  c.effective_max_participants,
  c.effective_interest_threshold,
  c.effective_disclaimer_required,
  c.effective_disclaimer_text,
  c.effective_feature_flags
FROM public.rooms r
LEFT JOIN LATERAL public.room_effective_config(r.id) c ON true;

-- Public list view (for /api/rooms)
CREATE OR REPLACE VIEW public.v_rooms_public AS
SELECT
  v.id,
  v.room_key,
  v.name,
  v.category,
  v.status,
  v.banner_url,
  v.image_url,
  COALESCE(v.fallback_gradient, (v.effective_feature_flags->>'fallback_gradient')) AS fallback_gradient,
  COALESCE(v.theme_color, (v.effective_feature_flags->>'theme_color')) AS theme_color,
  v.subtitle,
  v.background_image,
  v.special_badge,
  v.display_order,
  v.current_interest_count,
  v.effective_interest_threshold,
  v.effective_feature_flags,
  v.effective_disclaimer_required AS disclaimer_required,
  v.effective_disclaimer_text AS disclaimer_text
FROM public.v_rooms_effective v
WHERE v.status <> 'draft';

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.room_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_interest ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='rooms' AND policyname='Rooms are publicly readable'
  ) THEN
    EXECUTE 'CREATE POLICY "Rooms are publicly readable" ON public.rooms FOR SELECT USING (status <> ''draft'')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='rooms' AND policyname='Admins can manage rooms'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can manage rooms" ON public.rooms FOR ALL USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='room_templates' AND policyname='Admins can manage room templates'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can manage room templates" ON public.room_templates FOR ALL USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='room_interest' AND policyname='Users can view own room interest'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view own room interest" ON public.room_interest FOR SELECT USING (auth.uid() = profile_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='room_interest' AND policyname='Users can express interest'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can express interest" ON public.room_interest FOR INSERT WITH CHECK (auth.uid() = profile_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='room_interest' AND policyname='Users can remove interest'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can remove interest" ON public.room_interest FOR DELETE USING (auth.uid() = profile_id)';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Data migration
-- -----------------------------------------------------------------------------
-- Ensure at least one default template exists
INSERT INTO public.room_templates (
  template_key,
  name,
  layout_type,
  default_max_participants,
  default_interest_threshold,
  default_status,
  default_category,
  default_disclaimer_required,
  default_disclaimer_text,
  default_feature_flags
)
VALUES (
  'default_grid_12',
  'Default Grid 12',
  'grid',
  12,
  500,
  'interest',
  'entertainment',
  false,
  NULL,
  jsonb_build_object(
    'gifts', true,
    'chat', true,
    'fallback_gradient', 'from-purple-600 to-pink-600'
  )
)
ON CONFLICT (template_key) DO NOTHING;

-- Migrate coming_soon_rooms into rooms
DO $$
DECLARE
  v_default_template_id uuid;
  v_has_template_id boolean;
  v_has_fallback_gradient boolean;
  v_has_theme_color boolean;
  v_has_gifts_enabled boolean;
  v_has_chat_enabled boolean;
  v_has_subtitle boolean;
  v_has_background_image boolean;
  v_has_special_badge boolean;
  v_has_display_order boolean;
  v_sql text;
BEGIN
  SELECT id INTO v_default_template_id
  FROM public.room_templates
  WHERE template_key = 'default_grid_12'
  LIMIT 1;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='coming_soon_rooms') THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='coming_soon_rooms' AND column_name='template_id'
    ) INTO v_has_template_id;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='coming_soon_rooms' AND column_name='fallback_gradient'
    ) INTO v_has_fallback_gradient;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='coming_soon_rooms' AND column_name='theme_color'
    ) INTO v_has_theme_color;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='coming_soon_rooms' AND column_name='gifts_enabled'
    ) INTO v_has_gifts_enabled;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='coming_soon_rooms' AND column_name='chat_enabled'
    ) INTO v_has_chat_enabled;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='coming_soon_rooms' AND column_name='subtitle'
    ) INTO v_has_subtitle;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='coming_soon_rooms' AND column_name='background_image'
    ) INTO v_has_background_image;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='coming_soon_rooms' AND column_name='special_badge'
    ) INTO v_has_special_badge;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='coming_soon_rooms' AND column_name='display_order'
    ) INTO v_has_display_order;

    v_sql := 'INSERT INTO public.rooms (
      room_key,
      template_id,
      name,
      category,
      status,
      description,
      image_url,
      fallback_gradient,
      theme_color,
      subtitle,
      background_image,
      special_badge,
      display_order,
      interest_threshold,
      disclaimer_required,
      disclaimer_text,
      feature_flags
    )
    SELECT
      csr.room_key,
      COALESCE(' || (CASE WHEN v_has_template_id THEN 'csr.template_id' ELSE 'NULL' END) || ', $1),
      csr.name,
      csr.category,
      csr.status,
      csr.description,
      csr.image_url,
      ' || (CASE WHEN v_has_fallback_gradient THEN 'csr.fallback_gradient' ELSE 'NULL' END) || ',
      ' || (CASE WHEN v_has_theme_color THEN 'csr.theme_color' ELSE 'NULL' END) || ',
      ' || (CASE WHEN v_has_subtitle THEN 'csr.subtitle' ELSE 'NULL' END) || ',
      ' || (CASE WHEN v_has_background_image THEN 'csr.background_image' ELSE 'NULL' END) || ',
      ' || (CASE WHEN v_has_special_badge THEN 'csr.special_badge' ELSE 'NULL' END) || ',
      ' || (CASE WHEN v_has_display_order THEN 'COALESCE(csr.display_order, 0)' ELSE '0' END) || ',
      csr.interest_threshold,
      csr.disclaimer_required,
      csr.disclaimer_text,
      jsonb_build_object(
        ''gifts_enabled'', ' || (CASE WHEN v_has_gifts_enabled THEN 'COALESCE(csr.gifts_enabled, true)' ELSE 'true' END) || ',
        ''chat_enabled'', ' || (CASE WHEN v_has_chat_enabled THEN 'COALESCE(csr.chat_enabled, true)' ELSE 'true' END) || '
      )
    FROM public.coming_soon_rooms csr
    ON CONFLICT (room_key) DO UPDATE SET
      template_id = EXCLUDED.template_id,
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      status = EXCLUDED.status,
      description = EXCLUDED.description,
      image_url = EXCLUDED.image_url,
      fallback_gradient = EXCLUDED.fallback_gradient,
      theme_color = EXCLUDED.theme_color,
      subtitle = EXCLUDED.subtitle,
      background_image = EXCLUDED.background_image,
      special_badge = EXCLUDED.special_badge,
      display_order = EXCLUDED.display_order,
      interest_threshold = EXCLUDED.interest_threshold,
      disclaimer_required = EXCLUDED.disclaimer_required,
      disclaimer_text = EXCLUDED.disclaimer_text,
      feature_flags = EXCLUDED.feature_flags,
      updated_at = now();';

    EXECUTE v_sql USING v_default_template_id;
  END IF;
END $$;

-- Migrate room_interests into room_interest
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='room_interests') THEN
    INSERT INTO public.room_interest (room_id, profile_id, created_at)
    SELECT r_new.id, ri.user_id, COALESCE(ri.created_at, now())
    FROM public.room_interests ri
    JOIN public.coming_soon_rooms csr ON csr.id = ri.room_id
    JOIN public.rooms r_new ON r_new.room_key = csr.room_key
    ON CONFLICT (room_id, profile_id) DO NOTHING;
  END IF;
END $$;

-- Recompute cached counts
UPDATE public.rooms r
SET current_interest_count = sub.cnt
FROM (
  SELECT room_id, COUNT(*)::int AS cnt
  FROM public.room_interest
  GROUP BY room_id
) sub
WHERE sub.room_id = r.id;

-- -----------------------------------------------------------------------------
-- RBAC migration: room_roles room_id should point at rooms(id)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='room_roles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='coming_soon_rooms') THEN

    -- Drop existing FK (may point to coming_soon_rooms)
    BEGIN
      ALTER TABLE public.room_roles DROP CONSTRAINT IF EXISTS room_roles_room_id_fkey;
    EXCEPTION WHEN others THEN
      NULL;
    END;

    -- Update room_ids by matching on room_key
    UPDATE public.room_roles rr
    SET room_id = r_new.id
    FROM public.coming_soon_rooms csr
    JOIN public.rooms r_new ON r_new.room_key = csr.room_key
    WHERE rr.room_id = csr.id;

    -- Add FK to rooms
    BEGIN
      ALTER TABLE public.room_roles
      ADD CONSTRAINT room_roles_room_id_fkey
      FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;
