-- Feature Flags Table
-- Stores global feature flags for the platform

CREATE TABLE IF NOT EXISTS feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  description text,
  last_changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  last_changed_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);

-- Seed initial feature flags
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('live_enabled', true, 'Controls whether live streaming functionality is enabled'),
  ('gifting_enabled', true, 'Controls whether gifting functionality is enabled'),
  ('chat_enabled', true, 'Controls whether chat functionality is enabled'),
  ('battles_enabled', true, 'Controls whether battles functionality is enabled'),
  ('payouts_enabled', true, 'Controls whether payout functionality is enabled')
ON CONFLICT (key) DO NOTHING;

-- RLS Policies
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Admin can read and write all flags
CREATE POLICY "Admins can read all feature flags"
  ON feature_flags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update feature flags"
  ON feature_flags
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert feature flags"
  ON feature_flags
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Authenticated users can read flags (needed for enforcement)
CREATE POLICY "Authenticated users can read feature flags"
  ON feature_flags
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Public read access for the config endpoint
-- (We'll control this via the API endpoint instead for better security)
-- CREATE POLICY "Public can read feature flags"
--   ON feature_flags
--   FOR SELECT
--   USING (true);

-- Audit log for feature flag changes
CREATE TABLE IF NOT EXISTS feature_flag_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL,
  old_value boolean,
  new_value boolean NOT NULL,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Create index for audit log queries
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_log_flag_key ON feature_flag_audit_log(flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_log_changed_at ON feature_flag_audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_log_changed_by ON feature_flag_audit_log(changed_by);

-- RLS for audit log
ALTER TABLE feature_flag_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON feature_flag_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert audit log"
  ON feature_flag_audit_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to update feature flag with audit logging
CREATE OR REPLACE FUNCTION update_feature_flag(
  p_key text,
  p_enabled boolean,
  p_changed_by uuid,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS feature_flags
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_value boolean;
  v_result feature_flags;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = p_changed_by
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can update feature flags';
  END IF;

  -- Get old value
  SELECT enabled INTO v_old_value
  FROM feature_flags
  WHERE key = p_key;

  -- Update the flag
  UPDATE feature_flags
  SET 
    enabled = p_enabled,
    last_changed_by = p_changed_by,
    last_changed_at = now()
  WHERE key = p_key
  RETURNING * INTO v_result;

  -- Insert audit log
  INSERT INTO feature_flag_audit_log (
    flag_key,
    old_value,
    new_value,
    changed_by,
    changed_at,
    ip_address,
    user_agent
  ) VALUES (
    p_key,
    v_old_value,
    p_enabled,
    p_changed_by,
    now(),
    p_ip_address,
    p_user_agent
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION update_feature_flag TO authenticated;

-- Function to check if a feature is enabled (for use in RLS policies and triggers)
CREATE OR REPLACE FUNCTION is_feature_enabled(p_flag_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_enabled boolean;
BEGIN
  SELECT enabled INTO v_enabled
  FROM feature_flags
  WHERE key = p_flag_key;
  
  -- Default to true if flag not found (graceful degradation)
  RETURN COALESCE(v_enabled, true);
END;
$$;

GRANT EXECUTE ON FUNCTION is_feature_enabled TO authenticated;
GRANT EXECUTE ON FUNCTION is_feature_enabled TO anon;

-- Add RLS policy to chat_messages table to enforce chat_enabled flag
-- Note: This assumes chat_messages table exists. If it doesn't, this will fail gracefully.
DO $$
BEGIN
  -- Drop existing insert policy if it exists
  DROP POLICY IF EXISTS "Users can insert chat messages" ON chat_messages;
  
  -- Create new policy that checks chat_enabled flag
  CREATE POLICY "Users can insert chat messages"
    ON chat_messages
    FOR INSERT
    WITH CHECK (
      auth.uid() IS NOT NULL 
      AND is_feature_enabled('chat_enabled')
    );
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'chat_messages table does not exist yet, skipping RLS policy';
END $$;

COMMENT ON TABLE feature_flags IS 'Global feature flags for platform-wide feature toggles';
COMMENT ON TABLE feature_flag_audit_log IS 'Audit trail for feature flag changes';
COMMENT ON FUNCTION update_feature_flag IS 'Updates a feature flag and creates an audit log entry';
COMMENT ON FUNCTION is_feature_enabled IS 'Checks if a feature flag is enabled (used in RLS policies)';

