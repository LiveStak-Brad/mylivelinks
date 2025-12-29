/**
 * Profile Type Testing Guide
 * 
 * Quick reference for testing different profile types in the mobile app
 */

// ============================================================================
// METHOD 1: Temporary Override (Development Testing)
// ============================================================================

/*
In mobile/screens/ProfileScreen.tsx, around line 453-456, temporarily replace:

  const profileType = profile.profile_type || 'default';

WITH:

  const profileType = 'musician'; // Test specific type
  // const profileType = 'streamer';
  // const profileType = 'comedian';
  // const profileType = 'business';
  // const profileType = 'creator';
  // const profileType = 'default';

This will force all profiles to render as that type for visual testing.
*/

// ============================================================================
// METHOD 2: Database Update (Real Testing)
// ============================================================================

/*
Run these SQL queries in Supabase SQL Editor:

-- Add column (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_type VARCHAR(20) DEFAULT 'default';

-- Set specific user to test type
UPDATE profiles SET profile_type = 'musician' WHERE username = 'testuser';
UPDATE profiles SET profile_type = 'streamer' WHERE username = 'testuser2';
UPDATE profiles SET profile_type = 'comedian' WHERE username = 'testuser3';
UPDATE profiles SET profile_type = 'business' WHERE username = 'testuser4';

-- Reset back to default
UPDATE profiles SET profile_type = 'default' WHERE username = 'testuser';
*/

// ============================================================================
// METHOD 3: Mock Profile Data (Component Testing)
// ============================================================================

/*
Create a test component:
*/

import React from 'react';
import { ProfileScreen } from './mobile/screens/ProfileScreen';

const mockProfileData = {
  profile: {
    id: 'test-123',
    username: 'testmusician',
    display_name: 'Test Musician',
    profile_type: 'musician', // Change this to test different types
    avatar_url: null,
    bio: 'Testing musician profile type',
    is_live: false,
    follower_count: 1234,
    total_gifts_received: 500,
    total_gifts_sent: 100,
    gifter_level: 5,
    created_at: '2024-01-01',
  },
  links: [],
  adult_links: [],
  show_adult_section: false,
  follower_count: 1234,
  following_count: 567,
  friends_count: 89,
  relationship: 'none',
  top_supporters: [],
  top_streamers: [],
  stream_stats: {
    total_streams: 50,
    total_minutes_live: 1200,
    total_viewers: 5000,
    peak_viewers: 500,
    diamonds_earned_lifetime: 10000,
    diamonds_earned_7d: 1000,
    followers_gained_from_streams: 200,
  },
};

// Use in your test/preview component
export function ProfileTypeTest() {
  return (
    <ProfileScreen
      username="testmusician"
      isOwnProfile={false}
      apiBaseUrl="https://mylivelinks.com"
    />
  );
}

// ============================================================================
// WHAT TO TEST FOR EACH TYPE
// ============================================================================

/*
STREAMER
✓ Tabs: Info, Feed, Photos, Videos
✓ Sections: Social counts, Top supporters, Top streamers, Streaming stats
✓ Quick Actions: Follow, Message, Tip, Share, Stats
✓ Should show streaming-related features

MUSICIAN
✓ Tabs: Info, Music, Videos, Events, Photos
✓ Sections: Music showcase (mock), Upcoming events (mock), Merchandise (mock)
✓ Quick Actions: Follow, Message, Book, Share
✓ Should NOT show streaming stats

COMEDIAN
✓ Tabs: Info, Videos, Shows, Photos
✓ Sections: Upcoming events (mock), Merchandise (mock)
✓ Quick Actions: Follow, Message, Book Show, Share
✓ Comedy-focused content

BUSINESS
✓ Tabs: About, Products, Gallery
✓ Sections: Business info (mock), Portfolio (mock)
✓ Quick Actions: Follow, Contact, Share
✓ Professional appearance

CREATOR (Default)
✓ Tabs: Info, Feed, Photos, Videos
✓ Sections: Basic profile sections
✓ Quick Actions: Follow, Message, Share, Stats
✓ General content creator layout

DEFAULT (Fallback)
✓ Tabs: Info, Feed, Photos
✓ Sections: Minimal profile sections
✓ Quick Actions: Follow, Message, Share
✓ Most basic profile view
*/

// ============================================================================
// VISUAL CHECKS
// ============================================================================

/*
For each profile type, verify:

1. TAB BAR
   - Correct tabs appear
   - Correct icons
   - Tab switching works
   - No extra tabs shown

2. SECTIONS
   - Only enabled sections render
   - Sections in correct order
   - Mock data displays properly
   - Empty states show when no data

3. QUICK ACTIONS
   - Correct action buttons
   - Icons correct
   - Labels correct
   - Buttons functional

4. THEME COMPATIBILITY
   - Works in light mode
   - Works in dark mode
   - All text readable
   - Colors appropriate

5. RESPONSIVE LAYOUT
   - Cards properly sized
   - Scrolling smooth
   - No layout breaks
   - Images load correctly
*/

// ============================================================================
// DEBUGGING TIPS
// ============================================================================

/*
1. Check console for profileType value:
   console.log('Current profile type:', profileType);

2. Verify config is loading:
   console.log('Enabled tabs:', enabledTabs);
   console.log('Enabled sections:', enabledSections);

3. Check section visibility:
   console.log('Is social_counts enabled?', isSectionEnabled('social_counts', profileType));

4. Verify mock data:
   console.log('Mock music:', getMockMusicShowcase(profileType));
*/

export default {
  // Export test utilities if needed
};



