-- ============================================================================
-- MyLiveLinks: Pinned Posts Schema
-- ============================================================================
-- 
-- Supports ONE pinned post per profile with media (image OR video)
-- ============================================================================

-- Pinned Posts: ONE pinned post per profile
CREATE TABLE IF NOT EXISTS pinned_posts (
    id BIGSERIAL PRIMARY KEY,
    profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    caption TEXT,
    media_url TEXT NOT NULL, -- URL to image or video
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pinned_posts_profile_id ON pinned_posts(profile_id);

-- Enable RLS on pinned_posts
ALTER TABLE pinned_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view pinned posts
CREATE POLICY "Pinned posts are viewable by everyone"
    ON pinned_posts FOR SELECT
    USING (true);

-- RLS Policy: Users can manage own pinned post
CREATE POLICY "Users can manage own pinned post"
    ON pinned_posts FOR ALL
    USING (auth.uid() = profile_id)
    WITH CHECK (auth.uid() = profile_id);

COMMENT ON TABLE pinned_posts IS 'ONE pinned post per profile. Supports image or video media.';


