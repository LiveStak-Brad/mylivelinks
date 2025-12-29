BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.room_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text,
  name text,
  description text,
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

CREATE UNIQUE INDEX IF NOT EXISTS uniq_room_templates_template_key ON public.room_templates(template_key);

DROP TRIGGER IF EXISTS trg_room_templates_set_updated_at ON public.room_templates;
CREATE TRIGGER trg_room_templates_set_updated_at
BEFORE UPDATE ON public.room_templates
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_key text UNIQUE NOT NULL,
  template_id uuid REFERENCES public.room_templates(id),
  name text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'interest',
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

CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_display_order ON public.rooms(display_order);

DROP TRIGGER IF EXISTS trg_rooms_set_updated_at ON public.rooms;
CREATE TRIGGER trg_rooms_set_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

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
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
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
$$;

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

ALTER TABLE public.room_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_interest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rooms are publicly readable" ON public.rooms;
CREATE POLICY "Rooms are publicly readable" ON public.rooms
FOR SELECT
USING (status <> 'draft');

DROP POLICY IF EXISTS "Users can view own room interest" ON public.room_interest;
CREATE POLICY "Users can view own room interest" ON public.room_interest
FOR SELECT
USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can express interest" ON public.room_interest;
CREATE POLICY "Users can express interest" ON public.room_interest
FOR INSERT
WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can remove interest" ON public.room_interest;
CREATE POLICY "Users can remove interest" ON public.room_interest
FOR DELETE
USING (auth.uid() = profile_id);

INSERT INTO public.room_templates (
  template_key,
  name,
  description,
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
  NULL,
  'grid',
  12,
  500,
  'interest',
  'entertainment',
  false,
  NULL,
  jsonb_build_object('gifts_enabled', true, 'chat_enabled', true, 'fallback_gradient', 'from-purple-600 to-pink-600')
)
ON CONFLICT (template_key) DO NOTHING;

COMMIT;
