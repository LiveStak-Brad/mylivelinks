# Fix: Missing `pinned_posts` Table

## Error
```
Failed to save profile: Could not find the table 'public.pinned_posts' in the schema cache
```

## Solution: Create the Table in Supabase

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run This SQL

Copy and paste this entire SQL block into the SQL Editor:

```sql
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
```

### Step 3: Run the Query

1. Click **Run** (or press Ctrl+Enter)
2. You should see "Success. No rows returned"

### Step 4: Verify

1. Go to **Table Editor** in Supabase
2. You should see `pinned_posts` in the list of tables
3. Try saving your profile again on the website

## What This Creates

- **Table:** `pinned_posts` - Stores one pinned post per user profile
- **Columns:**
  - `id` - Auto-incrementing ID
  - `profile_id` - Links to user's profile (UUID)
  - `caption` - Text caption for the post
  - `media_url` - URL to image or video
  - `media_type` - Either 'image' or 'video'
  - `created_at` / `updated_at` - Timestamps

- **Security:**
  - Everyone can view pinned posts
  - Users can only manage their own pinned post

## After Creating the Table

1. Refresh your website
2. Try saving your profile again
3. The error should be gone!

## Need Help?

If you get errors when running the SQL:
- Make sure you're in the correct Supabase project
- Check that the `profiles` table exists first
- Share the error message you see



