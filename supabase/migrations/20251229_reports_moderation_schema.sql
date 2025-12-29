-- =====================================================
-- Reports + Moderation Schema Migration
-- Agent B: P0 Reports Pipeline
-- =====================================================

-- ======================
-- 1. CONTENT REPORTS TABLE
-- ======================
-- Tracks all user-submitted reports (abuse, spam, harassment, etc.)

CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reporter
  reporter_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Target (one of these must be non-null)
  target_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stream_id UUID NULL, -- references live_streams if that table exists
  message_id UUID NULL, -- references chat_messages if that table exists
  post_id UUID NULL, -- for future posts/content
  
  -- Report details
  type VARCHAR(50) NOT NULL CHECK (type IN ('harassment', 'spam', 'abuse', 'inappropriate', 'copyright', 'other')),
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  reason TEXT NULL,
  
  -- Status workflow
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
  
  -- Admin handling
  reviewed_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NULL,
  admin_note TEXT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- At least one target must be specified
  CONSTRAINT content_reports_has_target CHECK (
    target_profile_id IS NOT NULL OR 
    stream_id IS NOT NULL OR 
    message_id IS NOT NULL OR 
    post_id IS NOT NULL
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_severity ON content_reports(severity);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON content_reports(reporter_profile_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_target_profile ON content_reports(target_profile_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_created ON content_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_updated ON content_reports(updated_at DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_content_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_reports_updated_at
  BEFORE UPDATE ON content_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_content_reports_updated_at();

-- ======================
-- 2. MODERATION ACTIONS TABLE
-- ======================
-- Tracks all moderation actions taken by admins

CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Action context
  report_id UUID NULL REFERENCES content_reports(id) ON DELETE SET NULL,
  actor_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Action details
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('warn', 'mute', 'timeout', 'ban', 'unban', 'remove_monetization', 'restore_monetization')),
  duration_minutes INT NULL, -- for timeout/mute actions
  reason TEXT NULL,
  metadata JSONB NULL, -- for extensibility
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NULL -- computed from duration_minutes
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_moderation_actions_target ON moderation_actions(target_profile_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_actor ON moderation_actions(actor_profile_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_report ON moderation_actions(report_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_type ON moderation_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_created ON moderation_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_expires ON moderation_actions(expires_at) WHERE expires_at IS NOT NULL;

-- ======================
-- 3. USER SANCTIONS TABLE
-- ======================
-- Current enforcement state per user (denormalized for fast checks)

CREATE TABLE IF NOT EXISTS user_sanctions (
  target_profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Temporary sanctions
  muted_until TIMESTAMPTZ NULL,
  banned_until TIMESTAMPTZ NULL,
  
  -- Permanent sanctions
  monetization_disabled BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Timestamps
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_sanctions_muted ON user_sanctions(muted_until) WHERE muted_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_sanctions_banned ON user_sanctions(banned_until) WHERE banned_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_sanctions_monetization ON user_sanctions(monetization_disabled) WHERE monetization_disabled = TRUE;

-- ======================
-- 4. ADMIN AUDIT LOG TABLE (minimal)
-- ======================
-- Lightweight audit log for admin actions

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NULL,
  target_id UUID NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor ON admin_audit_log(actor_profile_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log(target_type, target_id);

-- ======================
-- 5. RLS POLICIES
-- ======================

-- Only admins can read reports
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_read_content_reports ON content_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.is_owner = true)
    )
  );

-- Reporters can insert their own reports (basic submission)
CREATE POLICY reporter_insert_own_report ON content_reports
  FOR INSERT
  WITH CHECK (reporter_profile_id = auth.uid());

-- Only admins can update reports
CREATE POLICY admin_update_content_reports ON content_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.is_owner = true)
    )
  );

-- Moderation actions: admin read/write only
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_moderation_actions ON moderation_actions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.is_owner = true)
    )
  );

-- User sanctions: admin read/write only
ALTER TABLE user_sanctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_user_sanctions ON user_sanctions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.is_owner = true)
    )
  );

-- Admin audit log: admin read only
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_read_audit_log ON admin_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.is_owner = true)
    )
  );

-- ======================
-- 6. RPC FUNCTIONS
-- ======================

-- Admin log action (minimal implementation, compatible with future extensions)
CREATE OR REPLACE FUNCTION admin_log_action(
  p_actor_profile_id UUID,
  p_action VARCHAR,
  p_target_type VARCHAR DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO admin_audit_log (actor_profile_id, action, target_type, target_id, metadata)
  VALUES (p_actor_profile_id, p_action, p_target_type, p_target_id, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply moderation action (core enforcement logic)
CREATE OR REPLACE FUNCTION apply_moderation_action(
  p_report_id UUID,
  p_actor_profile_id UUID,
  p_target_profile_id UUID,
  p_action_type VARCHAR,
  p_duration_minutes INT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_action_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Validate action type
  IF p_action_type NOT IN ('warn', 'mute', 'timeout', 'ban', 'unban', 'remove_monetization', 'restore_monetization') THEN
    RAISE EXCEPTION 'Invalid action_type: %', p_action_type;
  END IF;
  
  -- Calculate expiration
  IF p_duration_minutes IS NOT NULL AND p_duration_minutes > 0 THEN
    v_expires_at := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;
  END IF;
  
  -- Insert moderation action
  INSERT INTO moderation_actions (
    report_id, actor_profile_id, target_profile_id, 
    action_type, duration_minutes, reason, metadata, expires_at
  )
  VALUES (
    p_report_id, p_actor_profile_id, p_target_profile_id,
    p_action_type, p_duration_minutes, p_reason, p_metadata, v_expires_at
  )
  RETURNING id INTO v_action_id;
  
  -- Update user_sanctions (upsert)
  INSERT INTO user_sanctions (target_profile_id, muted_until, banned_until, monetization_disabled)
  VALUES (
    p_target_profile_id,
    CASE WHEN p_action_type IN ('mute', 'timeout') THEN v_expires_at ELSE NULL END,
    CASE WHEN p_action_type = 'ban' THEN v_expires_at ELSE NULL END,
    CASE WHEN p_action_type = 'remove_monetization' THEN TRUE ELSE FALSE END
  )
  ON CONFLICT (target_profile_id) DO UPDATE SET
    muted_until = CASE 
      WHEN p_action_type IN ('mute', 'timeout') THEN v_expires_at
      WHEN p_action_type = 'unban' THEN NULL
      ELSE user_sanctions.muted_until
    END,
    banned_until = CASE 
      WHEN p_action_type = 'ban' THEN v_expires_at
      WHEN p_action_type = 'unban' THEN NULL
      ELSE user_sanctions.banned_until
    END,
    monetization_disabled = CASE
      WHEN p_action_type = 'remove_monetization' THEN TRUE
      WHEN p_action_type = 'restore_monetization' THEN FALSE
      ELSE user_sanctions.monetization_disabled
    END,
    updated_at = NOW();
  
  -- Log to audit
  PERFORM admin_log_action(
    p_actor_profile_id,
    'moderation_action:' || p_action_type,
    'moderation_action',
    v_action_id,
    jsonb_build_object(
      'target_profile_id', p_target_profile_id,
      'report_id', p_report_id,
      'reason', p_reason
    )
  );
  
  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update report status
CREATE OR REPLACE FUNCTION update_report_status(
  p_report_id UUID,
  p_actor_profile_id UUID,
  p_status VARCHAR,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate status
  IF p_status NOT IN ('open', 'under_review', 'resolved', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;
  
  UPDATE content_reports
  SET 
    status = p_status,
    reviewed_by = p_actor_profile_id,
    reviewed_at = NOW(),
    admin_note = COALESCE(p_admin_note, admin_note),
    updated_at = NOW()
  WHERE id = p_report_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found: %', p_report_id;
  END IF;
  
  -- Log to audit
  PERFORM admin_log_action(
    p_actor_profile_id,
    'report_status_update',
    'content_report',
    p_report_id,
    jsonb_build_object('status', p_status, 'admin_note', p_admin_note)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================
-- 7. HELPER VIEW (OPTIONAL)
-- ======================
-- Makes report queries easier with joined profile info

CREATE OR REPLACE VIEW content_reports_with_details AS
SELECT 
  cr.*,
  reporter.username AS reporter_username,
  reporter.display_name AS reporter_display_name,
  reporter.avatar_url AS reporter_avatar_url,
  target.username AS target_username,
  target.display_name AS target_display_name,
  target.avatar_url AS target_avatar_url,
  reviewer.username AS reviewer_username,
  reviewer.display_name AS reviewer_display_name
FROM content_reports cr
LEFT JOIN profiles reporter ON cr.reporter_profile_id = reporter.id
LEFT JOIN profiles target ON cr.target_profile_id = target.id
LEFT JOIN profiles reviewer ON cr.reviewed_by = reviewer.id;

-- Grant select on view to authenticated users (RLS will still filter)
GRANT SELECT ON content_reports_with_details TO authenticated;

-- ======================
-- MIGRATION COMPLETE
-- ======================


