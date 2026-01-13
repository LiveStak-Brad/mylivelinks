-- ============================================================================
-- WAITLIST EMAIL COLLECTION TABLE
-- ============================================================================
-- This table stores email addresses collected from the "Coming Soon" landing page
-- for launch notifications and marketing purposes.
-- ============================================================================

CREATE TABLE IF NOT EXISTS waitlist_emails (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45), -- IPv4 or IPv6
    user_agent TEXT,
    referrer TEXT,
    notified BOOLEAN DEFAULT FALSE, -- Track if launch email was sent
    notified_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(email) -- Prevent duplicate email submissions
);

-- Create index for faster email lookups
CREATE INDEX idx_waitlist_emails_email ON waitlist_emails(email);
CREATE INDEX idx_waitlist_emails_created_at ON waitlist_emails(created_at DESC);
CREATE INDEX idx_waitlist_emails_notified ON waitlist_emails(notified) WHERE notified = FALSE;

-- Add comment
COMMENT ON TABLE waitlist_emails IS 'Email addresses collected from landing page waitlist for launch notifications';

-- Enable Row Level Security (RLS)
ALTER TABLE waitlist_emails ENABLE ROW LEVEL SECURITY;
npx expo start --dev-client
-- Policy: Anyone can insert (no auth required for landing page)
CREATE POLICY "Anyone can submit email to waitlist"
    ON waitlist_emails
    FOR INSERT
    WITH CHECK (true);

-- Policy: Only authenticated admins can view emails
CREATE POLICY "Only admins can view waitlist emails"
    ON waitlist_emails
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE id = '2b4a1178-3c39-4179-94ea-314dd824a818'::uuid
        )
    );

-- Policy: Only admins can update (e.g., mark as notified)
CREATE POLICY "Only admins can update waitlist emails"
    ON waitlist_emails
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE id = '2b4a1178-3c39-4179-94ea-314dd824a818'::uuid
        )
    );

-- ============================================================================
-- HELPER FUNCTION: Get waitlist stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_waitlist_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_emails', COUNT(*),
        'notified', COUNT(*) FILTER (WHERE notified = TRUE),
        'pending', COUNT(*) FILTER (WHERE notified = FALSE),
        'latest_signup', MAX(created_at),
        'first_signup', MIN(created_at)
    ) INTO result
    FROM waitlist_emails;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (but RLS on table will restrict access)
GRANT EXECUTE ON FUNCTION get_waitlist_stats() TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Waitlist table created successfully' as status;

-- Show table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'waitlist_emails'
ORDER BY ordinal_position;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Insert a test email (uncomment to test)
-- INSERT INTO waitlist_emails (email, ip_address, user_agent)
-- VALUES ('test@example.com', '192.168.1.1', 'Mozilla/5.0...');

-- View all waitlist emails (admin only)
-- SELECT * FROM waitlist_emails ORDER BY created_at DESC;

-- Get waitlist stats
-- SELECT get_waitlist_stats();

-- Mark emails as notified after sending launch email
-- UPDATE waitlist_emails 
-- SET notified = TRUE, notified_at = CURRENT_TIMESTAMP 
-- WHERE notified = FALSE;

-- Export emails for email service (CSV format)
-- SELECT email, created_at FROM waitlist_emails WHERE notified = FALSE ORDER BY created_at;

-- ============================================================================

