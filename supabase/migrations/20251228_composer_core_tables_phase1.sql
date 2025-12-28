BEGIN;

-- -----------------------------------------------------------------------------
-- Composer Phase 1: clips + clip_projects + clip_actors (DB + RLS)
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- Table: public.clips
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_name text NULL,
  mode text NOT NULL,
  target_profile_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  duration_seconds int NOT NULL,
  include_chat boolean NOT NULL DEFAULT false,
  layout_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  visibility text NOT NULL DEFAULT 'private',
  storage_path text NULL,
  asset_url text NULL,
  thumbnail_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clips_mode_check CHECK (mode IN ('my_view','streamer')),
  CONSTRAINT clips_status_check CHECK (status IN ('draft','processing','ready','failed','removed')),
  CONSTRAINT clips_visibility_check CHECK (visibility IN ('public','unlisted','private','removed'))
);

-- If table existed already, ensure required columns exist.
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS producer_profile_id uuid;
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS room_name text;
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS mode text;
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS target_profile_id uuid;
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS duration_seconds int;
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS include_chat boolean NOT NULL DEFAULT false;
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS layout_meta jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS asset_url text;
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.clips WHERE producer_profile_id IS NULL) THEN
    NULL;
  ELSE
    ALTER TABLE public.clips ALTER COLUMN producer_profile_id SET NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.clips WHERE mode IS NULL) THEN
    NULL;
  ELSE
    ALTER TABLE public.clips ALTER COLUMN mode SET NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.clips WHERE duration_seconds IS NULL) THEN
    NULL;
  ELSE
    ALTER TABLE public.clips ALTER COLUMN duration_seconds SET NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.clips WHERE include_chat IS NULL) THEN
    NULL;
  ELSE
    ALTER TABLE public.clips ALTER COLUMN include_chat SET NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.clips WHERE layout_meta IS NULL) THEN
    NULL;
  ELSE
    ALTER TABLE public.clips ALTER COLUMN layout_meta SET NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.clips WHERE status IS NULL) THEN
    NULL;
  ELSE
    ALTER TABLE public.clips ALTER COLUMN status SET NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.clips WHERE visibility IS NULL) THEN
    NULL;
  ELSE
    ALTER TABLE public.clips ALTER COLUMN visibility SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clips'
      AND c.conname = 'clips_mode_check'
  ) THEN
    ALTER TABLE public.clips
      ADD CONSTRAINT clips_mode_check CHECK (mode IN ('my_view','streamer'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clips'
      AND c.conname = 'clips_status_check'
  ) THEN
    ALTER TABLE public.clips
      ADD CONSTRAINT clips_status_check CHECK (status IN ('draft','processing','ready','failed','removed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clips'
      AND c.conname = 'clips_visibility_check'
  ) THEN
    ALTER TABLE public.clips
      ADD CONSTRAINT clips_visibility_check CHECK (visibility IN ('public','unlisted','private','removed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clips'
      AND c.conname = 'clips_producer_profile_id_fkey'
  ) THEN
    ALTER TABLE public.clips
      ADD CONSTRAINT clips_producer_profile_id_fkey
      FOREIGN KEY (producer_profile_id) REFERENCES public.profiles(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clips'
      AND c.conname = 'clips_target_profile_id_fkey'
  ) THEN
    ALTER TABLE public.clips
      ADD CONSTRAINT clips_target_profile_id_fkey
      FOREIGN KEY (target_profile_id) REFERENCES public.profiles(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END;
$$;

-- Required indexes
CREATE INDEX IF NOT EXISTS idx_clips_producer_created_at_desc
  ON public.clips (producer_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clips_room_name_created_at_desc
  ON public.clips (room_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clips_target_created_at_desc
  ON public.clips (target_profile_id, created_at DESC);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_clips_set_updated_at ON public.clips;
CREATE TRIGGER trg_clips_set_updated_at
BEFORE UPDATE ON public.clips
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Clips are publicly readable when public and ready" ON public.clips;
CREATE POLICY "Clips are publicly readable when public and ready"
  ON public.clips
  FOR SELECT
  USING (visibility = 'public' AND status = 'ready');

DROP POLICY IF EXISTS "Users can read own clips" ON public.clips;
CREATE POLICY "Users can read own clips"
  ON public.clips
  FOR SELECT
  USING (auth.uid() = producer_profile_id);

DROP POLICY IF EXISTS "Users can insert own clips" ON public.clips;
CREATE POLICY "Users can insert own clips"
  ON public.clips
  FOR INSERT
  WITH CHECK (auth.uid() = producer_profile_id);

DROP POLICY IF EXISTS "Users can update own clips" ON public.clips;
CREATE POLICY "Users can update own clips"
  ON public.clips
  FOR UPDATE
  USING (auth.uid() = producer_profile_id)
  WITH CHECK (auth.uid() = producer_profile_id);

-- Moderation scaffolding
DROP POLICY IF EXISTS "Service role can moderate clips" ON public.clips;
CREATE POLICY "Service role can moderate clips"
  ON public.clips
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'is_app_admin'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "App admins can moderate clips" ON public.clips';
    EXECUTE 'CREATE POLICY "App admins can moderate clips" ON public.clips FOR UPDATE USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()))';
  END IF;
END;
$$;

GRANT SELECT ON TABLE public.clips TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.clips TO authenticated;

-- -----------------------------------------------------------------------------
-- Table: public.clip_projects
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clip_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id uuid NOT NULL REFERENCES public.clips(id) ON DELETE CASCADE,
  owner_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  caption text,
  overlay_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  composer_level text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clip_projects_composer_level_check CHECK (composer_level IN ('mobile','web')),
  CONSTRAINT clip_projects_status_check CHECK (status IN ('draft','posted','archived'))
);

ALTER TABLE public.clip_projects
  ADD COLUMN IF NOT EXISTS clip_id uuid;
ALTER TABLE public.clip_projects
  ADD COLUMN IF NOT EXISTS owner_profile_id uuid;
ALTER TABLE public.clip_projects
  ADD COLUMN IF NOT EXISTS caption text;
ALTER TABLE public.clip_projects
  ADD COLUMN IF NOT EXISTS overlay_json jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.clip_projects
  ADD COLUMN IF NOT EXISTS composer_level text;
ALTER TABLE public.clip_projects
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
ALTER TABLE public.clip_projects
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.clip_projects
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.clip_projects WHERE clip_id IS NULL) THEN
    NULL;
  ELSE
    ALTER TABLE public.clip_projects ALTER COLUMN clip_id SET NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.clip_projects WHERE owner_profile_id IS NULL) THEN
    NULL;
  ELSE
    ALTER TABLE public.clip_projects ALTER COLUMN owner_profile_id SET NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.clip_projects WHERE overlay_json IS NULL) THEN
    NULL;
  ELSE
    ALTER TABLE public.clip_projects ALTER COLUMN overlay_json SET NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.clip_projects WHERE composer_level IS NULL) THEN
    NULL;
  ELSE
    ALTER TABLE public.clip_projects ALTER COLUMN composer_level SET NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.clip_projects WHERE status IS NULL) THEN
    NULL;
  ELSE
    ALTER TABLE public.clip_projects ALTER COLUMN status SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clip_projects'
      AND c.conname = 'clip_projects_composer_level_check'
  ) THEN
    ALTER TABLE public.clip_projects
      ADD CONSTRAINT clip_projects_composer_level_check CHECK (composer_level IN ('mobile','web'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clip_projects'
      AND c.conname = 'clip_projects_status_check'
  ) THEN
    ALTER TABLE public.clip_projects
      ADD CONSTRAINT clip_projects_status_check CHECK (status IN ('draft','posted','archived'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clip_projects'
      AND c.conname = 'clip_projects_clip_id_fkey'
  ) THEN
    ALTER TABLE public.clip_projects
      ADD CONSTRAINT clip_projects_clip_id_fkey
      FOREIGN KEY (clip_id) REFERENCES public.clips(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clip_projects'
      AND c.conname = 'clip_projects_owner_profile_id_fkey'
  ) THEN
    ALTER TABLE public.clip_projects
      ADD CONSTRAINT clip_projects_owner_profile_id_fkey
      FOREIGN KEY (owner_profile_id) REFERENCES public.profiles(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_clip_projects_owner_updated_at_desc
  ON public.clip_projects (owner_profile_id, updated_at DESC);

DROP TRIGGER IF EXISTS trg_clip_projects_set_updated_at ON public.clip_projects;
CREATE TRIGGER trg_clip_projects_set_updated_at
BEFORE UPDATE ON public.clip_projects
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.clip_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clip projects are readable by owner" ON public.clip_projects;
CREATE POLICY "Clip projects are readable by owner"
  ON public.clip_projects
  FOR SELECT
  USING (auth.uid() = owner_profile_id);

DROP POLICY IF EXISTS "Clip projects are insertable by owner" ON public.clip_projects;
CREATE POLICY "Clip projects are insertable by owner"
  ON public.clip_projects
  FOR INSERT
  WITH CHECK (auth.uid() = owner_profile_id);

DROP POLICY IF EXISTS "Clip projects are updatable by owner" ON public.clip_projects;
CREATE POLICY "Clip projects are updatable by owner"
  ON public.clip_projects
  FOR UPDATE
  USING (auth.uid() = owner_profile_id)
  WITH CHECK (auth.uid() = owner_profile_id);

DROP POLICY IF EXISTS "Clip projects are deletable by owner" ON public.clip_projects;
CREATE POLICY "Clip projects are deletable by owner"
  ON public.clip_projects
  FOR DELETE
  USING (auth.uid() = owner_profile_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clip_projects TO authenticated;

-- -----------------------------------------------------------------------------
-- Table: public.clip_actors
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clip_actors (
  clip_id uuid NOT NULL REFERENCES public.clips(id) ON DELETE CASCADE,
  actor_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clip_id, actor_profile_id, role),
  CONSTRAINT clip_actors_role_check CHECK (role IN ('target','participant'))
);

ALTER TABLE public.clip_actors
  ADD COLUMN IF NOT EXISTS clip_id uuid;
ALTER TABLE public.clip_actors
  ADD COLUMN IF NOT EXISTS actor_profile_id uuid;
ALTER TABLE public.clip_actors
  ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.clip_actors
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.clip_actors WHERE clip_id IS NULL) THEN
    NULL;
  ELSE
    ALTER TABLE public.clip_actors ALTER COLUMN clip_id SET NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.clip_actors WHERE actor_profile_id IS NULL) THEN
    NULL;
  ELSE
    ALTER TABLE public.clip_actors ALTER COLUMN actor_profile_id SET NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.clip_actors WHERE role IS NULL) THEN
    NULL;
  ELSE
    ALTER TABLE public.clip_actors ALTER COLUMN role SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clip_actors'
      AND c.conname = 'clip_actors_role_check'
  ) THEN
    ALTER TABLE public.clip_actors
      ADD CONSTRAINT clip_actors_role_check CHECK (role IN ('target','participant'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clip_actors'
      AND c.conname = 'clip_actors_clip_id_fkey'
  ) THEN
    ALTER TABLE public.clip_actors
      ADD CONSTRAINT clip_actors_clip_id_fkey
      FOREIGN KEY (clip_id) REFERENCES public.clips(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clip_actors'
      AND c.conname = 'clip_actors_actor_profile_id_fkey'
  ) THEN
    ALTER TABLE public.clip_actors
      ADD CONSTRAINT clip_actors_actor_profile_id_fkey
      FOREIGN KEY (actor_profile_id) REFERENCES public.profiles(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_clip_actors_clip_id
  ON public.clip_actors (clip_id);

ALTER TABLE public.clip_actors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clip actors are publicly readable via public clips" ON public.clip_actors;
CREATE POLICY "Clip actors are publicly readable via public clips"
  ON public.clip_actors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.clips c
      WHERE c.id = clip_actors.clip_id
        AND c.visibility = 'public'
        AND c.status = 'ready'
    )
  );

DROP POLICY IF EXISTS "Clip actors are readable by clip producer" ON public.clip_actors;
CREATE POLICY "Clip actors are readable by clip producer"
  ON public.clip_actors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.clips c
      WHERE c.id = clip_actors.clip_id
        AND c.producer_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clip actors are insertable by clip producer" ON public.clip_actors;
CREATE POLICY "Clip actors are insertable by clip producer"
  ON public.clip_actors
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clips c
      WHERE c.id = clip_actors.clip_id
        AND c.producer_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clip actors are deletable by clip producer" ON public.clip_actors;
CREATE POLICY "Clip actors are deletable by clip producer"
  ON public.clip_actors
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.clips c
      WHERE c.id = clip_actors.clip_id
        AND c.producer_profile_id = auth.uid()
    )
  );

GRANT SELECT ON TABLE public.clip_actors TO anon, authenticated;
GRANT INSERT, DELETE ON TABLE public.clip_actors TO authenticated;

COMMIT;
