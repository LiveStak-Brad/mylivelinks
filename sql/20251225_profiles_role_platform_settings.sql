-- Safe additions for admin RBAC + platform settings
-- Non-destructive: no drops, no renames

-- 1) Add profiles.role if missing (preferred RBAC)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- Optional index for faster role checks
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2) Create platform_settings table if missing
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Legacy reports table (only if missing). NOTE: project already uses content_reports.
-- This is provided for compatibility with any older admin tooling expecting public.reports.
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_stream_id bigint NULL,
  reason text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
