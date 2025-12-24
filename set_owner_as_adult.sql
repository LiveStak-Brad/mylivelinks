-- ============================================================================
-- Set Owner Profile as Adult (18+) with Full Adult Content Access
-- ============================================================================
-- Run this in Supabase SQL Editor to enable adult content for owner profile
-- ============================================================================

-- Step 1: Update profile to set date of birth (August 30, 1986 - Age 39)
UPDATE profiles
SET 
    date_of_birth = '1986-08-30',
    adult_verified_at = CURRENT_TIMESTAMP,
    adult_verified_method = 'self_attested'
WHERE LOWER(username) = 'cannastreams-owner';

-- Step 2: Create or update user_settings to accept adult disclaimer
INSERT INTO user_settings (
    profile_id,
    has_accepted_adult_disclaimer,
    adult_disclaimer_accepted_at,
    adult_disclaimer_expires_at,
    hide_adult_content
)
SELECT 
    id,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '365 days', -- Valid for 1 year
    FALSE
FROM profiles
WHERE LOWER(username) = 'cannastreams-owner'
ON CONFLICT (profile_id) DO UPDATE SET
    has_accepted_adult_disclaimer = TRUE,
    adult_disclaimer_accepted_at = CURRENT_TIMESTAMP,
    adult_disclaimer_expires_at = CURRENT_TIMESTAMP + INTERVAL '365 days',
    hide_adult_content = FALSE,
    updated_at = CURRENT_TIMESTAMP;

-- Step 3: Create audit log entry
INSERT INTO audit_logs (profile_id, action, platform, metadata)
SELECT 
    id,
    'adult_consent_accepted',
    'web',
    json_build_object(
        'method', 'owner_setup',
        'expires_at', CURRENT_TIMESTAMP + INTERVAL '365 days'
    )
FROM profiles
WHERE LOWER(username) = 'cannastreams-owner';

-- Step 4: Verify the setup
SELECT 
    p.username,
    p.date_of_birth,
    calculate_age(p.date_of_birth) AS age,
    p.adult_verified_at,
    p.adult_verified_method,
    us.has_accepted_adult_disclaimer,
    us.adult_disclaimer_accepted_at,
    us.adult_disclaimer_expires_at,
    us.hide_adult_content,
    is_eligible_for_adult_content(p.id, 'web') AS can_view_adult_content
FROM profiles p
LEFT JOIN user_settings us ON us.profile_id = p.id
WHERE LOWER(p.username) = 'cannastreams-owner';

-- Success message
SELECT 
    '✅ Owner profile set as adult (18+) with full access!' AS status,
    'User can now view and manage adult content on web platform' AS note,
    'Adult disclaimer valid for 1 year' AS expiry_note;

