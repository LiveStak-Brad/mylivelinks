-- Create content_reports table for user reporting system
-- Run this migration in Supabase SQL editor

-- Create reports table
CREATE TABLE IF NOT EXISTS content_reports (
    id BIGSERIAL PRIMARY KEY,
    reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL, -- 'user', 'stream', 'profile', 'chat'
    report_reason VARCHAR(50) NOT NULL, -- 'harassment', 'inappropriate', 'spam', 'underage', 'other', etc.
    report_details TEXT, -- Optional additional context
    context_details TEXT, -- Stream ID, message ID, etc.
    status VARCHAR(20) DEFAULT 'pending' NOT NULL, -- 'pending', 'reviewed', 'resolved', 'dismissed'
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    admin_notes TEXT, -- Notes from moderator/admin
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_content_reports_reporter_id ON content_reports(reporter_id);
CREATE INDEX idx_content_reports_reported_user_id ON content_reports(reported_user_id);
CREATE INDEX idx_content_reports_status ON content_reports(status);
CREATE INDEX idx_content_reports_created_at ON content_reports(created_at DESC);
CREATE INDEX idx_content_reports_report_type ON content_reports(report_type);

-- Enable RLS
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own submitted reports
CREATE POLICY "Users can view own submitted reports"
    ON content_reports FOR SELECT
    USING (auth.uid() = reporter_id);

-- Users can insert reports (rate limiting handled in application)
CREATE POLICY "Users can create reports"
    ON content_reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

-- Admins can view all reports (admin check via is_admin column in profiles)
CREATE POLICY "Admins can view all reports"
    ON content_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Admins can update reports (mark as reviewed/resolved/dismissed)
CREATE POLICY "Admins can update reports"
    ON content_reports FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_content_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_content_reports_updated_at
    BEFORE UPDATE ON content_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_content_reports_updated_at();

-- Add is_admin column to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false NOT NULL;
        CREATE INDEX idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;
    END IF;
END $$;

-- Create rate limiting table for reports
CREATE TABLE IF NOT EXISTS report_rate_limits (
    id BIGSERIAL PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    report_count INTEGER DEFAULT 1 NOT NULL,
    window_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(reporter_id, window_start)
);

-- Index for rate limiting queries
CREATE INDEX idx_report_rate_limits_reporter_id ON report_rate_limits(reporter_id);
CREATE INDEX idx_report_rate_limits_window_start ON report_rate_limits(window_start DESC);

-- Enable RLS on rate limits table
ALTER TABLE report_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only the system can manage rate limits
CREATE POLICY "System manages rate limits"
    ON report_rate_limits FOR ALL
    USING (false)
    WITH CHECK (false);

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION check_report_rate_limit(p_reporter_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_window_start TIMESTAMPTZ;
BEGIN
    -- Get current hour window
    v_window_start := date_trunc('hour', NOW());
    
    -- Check existing count in current hour
    SELECT report_count INTO v_count
    FROM report_rate_limits
    WHERE reporter_id = p_reporter_id
    AND window_start = v_window_start;
    
    -- If no record exists, create one
    IF v_count IS NULL THEN
        INSERT INTO report_rate_limits (reporter_id, report_count, window_start)
        VALUES (p_reporter_id, 1, v_window_start)
        ON CONFLICT (reporter_id, window_start)
        DO UPDATE SET report_count = report_rate_limits.report_count + 1;
        RETURN true;
    END IF;
    
    -- If count >= 10, deny
    IF v_count >= 10 THEN
        RETURN false;
    END IF;
    
    -- Increment count
    UPDATE report_rate_limits
    SET report_count = report_count + 1
    WHERE reporter_id = p_reporter_id
    AND window_start = v_window_start;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old rate limit records (older than 2 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM report_rate_limits
    WHERE window_start < NOW() - INTERVAL '2 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Content reports system created successfully!';
    RAISE NOTICE '1. content_reports table created with RLS';
    RAISE NOTICE '2. Rate limiting system created (10 reports per hour)';
    RAISE NOTICE '3. Admin policies added (requires is_admin = true)';
    RAISE NOTICE '4. To make a user admin, run: UPDATE profiles SET is_admin = true WHERE id = ''<user_id>'';';
END $$;



