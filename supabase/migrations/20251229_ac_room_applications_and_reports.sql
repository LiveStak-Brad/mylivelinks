BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.room_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  bio text,
  social_links text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id),
  admin_notes text
);

CREATE INDEX IF NOT EXISTS idx_room_applications_status_created_at ON public.room_applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_applications_profile_id ON public.room_applications(profile_id);

ALTER TABLE public.room_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create room application" ON public.room_applications;
CREATE POLICY "Users can create room application" ON public.room_applications
FOR INSERT
WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can read own room application" ON public.room_applications;
CREATE POLICY "Users can read own room application" ON public.room_applications
FOR SELECT
USING (auth.uid() = profile_id);

CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  report_type text NOT NULL,
  report_reason text NOT NULL,
  report_details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id),
  admin_notes text
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status_created_at ON public.content_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_reported_user_id ON public.content_reports(reported_user_id);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create content reports" ON public.content_reports;
CREATE POLICY "Users can create content reports" ON public.content_reports
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND reporter_id = auth.uid());

DROP POLICY IF EXISTS "Reporters can read own content reports" ON public.content_reports;
CREATE POLICY "Reporters can read own content reports" ON public.content_reports
FOR SELECT
USING (reporter_id = auth.uid());

COMMIT;
