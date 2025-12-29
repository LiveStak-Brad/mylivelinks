-- Admin Audit Foundation
-- Creates admin_audit_logs table with RLS and helper RPC for logging admin actions

BEGIN;

-- Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at 
  ON public.admin_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_created 
  ON public.admin_audit_logs(actor_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target 
  ON public.admin_audit_logs(target_type, target_id);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can read/write audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs" 
  ON public.admin_audit_logs 
  FOR SELECT 
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs" 
  ON public.admin_audit_logs 
  FOR INSERT 
  WITH CHECK (public.is_admin(auth.uid()) AND actor_profile_id = auth.uid());

-- RPC: Log admin action (security definer)
-- This function allows admin API routes to log actions programmatically
CREATE OR REPLACE FUNCTION public.admin_log_action(
  p_action text,
  p_target_type text,
  p_target_id text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Insert audit log entry
  INSERT INTO public.admin_audit_logs (
    actor_profile_id,
    action,
    target_type,
    target_id,
    metadata
  ) VALUES (
    auth.uid(),
    p_action,
    p_target_type,
    p_target_id,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Revoke public access, grant to authenticated users
REVOKE ALL ON FUNCTION public.admin_log_action(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_log_action(text, text, text, jsonb) TO authenticated;

COMMIT;


