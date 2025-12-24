# MyLiveLinks Modern Profile System - Testing Guide

## Overview

This document provides comprehensive testing instructions for the new modern profile system implementation.

## Files Created/Modified

### SQL Migration
- `profile_system_schema.sql` - Database schema extensions

### API Routes
- `app/api/profile/[username]/route.ts` - Get public profile
- `app/api/profile/follow/route.ts` - Toggle follow/unfollow
- `app/api/profile/followers/route.ts` - Get followers list
- `app/api/profile/following/route.ts` - Get following list
- `app/api/profile/friends/route.ts` - Get friends list (mutual follows)
- `app/api/profile/customize/route.ts` - Update customization settings
- `app/api/profile/links/route.ts` - Manage profile links
- `app/api/profile/link-click/route.ts` - Track link clicks

### UI Components
- `app/[username]/modern-page.tsx` - Modern profile page
- `components/profile/SocialCountsWidget.tsx` - Follower/following/friends widget
- `components/profile/TopSupportersWidget.tsx` - Top 3 supporters widget
- `components/profile/TopStreamersWidget.tsx` - Top 3 streamers widget
- `components/profile/StatsCard.tsx` - Stream & gifting stats
- `components/profile/ModernLinksSection.tsx` - Custom links section
- `components/profile/FollowersModal.tsx` - Modal for follower/following/friends lists
- `components/profile/ProfileCustomization.tsx` - Customization settings component

---

## Setup Instructions

### 1. Run Database Migration

```bash
# Run in Supabase SQL Editor
psql -f profile_system_schema.sql
```

Or manually copy/paste `profile_system_schema.sql` into Supabase SQL Editor and execute.

**What it does:**
- Extends `profiles` table with customization fields
- Extends `user_links` table with `icon` field
- Creates `stream_stats` table for streaming metrics
- Creates `friends` view for mutual follows
- Creates RPC functions for profile data fetching
- Sets up RLS policies for security

### 2. Verify Migration

Run this query in Supabase SQL Editor:

```sql
-- Check if customization columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN (
  'profile_bg_url',
  'profile_bg_overlay',
  'card_color',
  'card_opacity',
  'card_border_radius',
  'font_preset',
  'accent_color',
  'links_section_title',
  'gifter_level'
);

-- Check if stream_stats table exists
SELECT * FROM stream_stats LIMIT 1;

-- Check if RPC functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
  'get_public_profile',
  'toggle_follow',
  'get_followers_list',
  'get_following_list',
  'get_friends_list',
  'track_link_click'
);
```

### 3. Deploy Frontend

Deploy to Vercel or run locally:

```bash
npm run dev
```

---

## Testing Checklist

### ✅ Basic Profile Page

1. **Public Profile Load**
   - Navigate to `/{username}` (e.g., `/testuser`)
   - Verify profile data loads correctly
   - Check avatar, display name, username, bio display
   - Verify follower/following/friends counts show

2. **Own Profile View**
   - Log in as a user
   - Navigate to your own profile `/{your-username}`
   - Verify "Edit Profile" button shows instead of "Follow"
   - Check that coin/earnings balances are visible (if owner)

3. **Profile Not Found**
   - Navigate to non-existent username `/{fakeuserxyz}`
   - Verify "Profile Not Found" error displays
   - Check that page doesn't crash

### ✅ Customization Features

4. **Background Customization**
   - Go to Settings → Profile → Customization
   - Upload or set a background image URL
   - Change background overlay setting
   - Save and visit your profile
   - Verify background displays correctly

5. **Card Styling**
   - Change card color (try different hex values)
   - Adjust card opacity slider
   - Change border radius preset
   - Save and verify cards use new style

6. **Typography & Accent Color**
   - Change font preset (modern/classic/bold/minimal)
   - Pick a new accent color
   - Save and verify buttons/links use accent color

7. **Links Section Title**
   - Change "My Links" to custom title (e.g., "My Platforms")
   - Save and verify title displays on profile

### ✅ Social Features

8. **Follow/Unfollow**
   - Visit another user's profile (not your own)
   - Click "Follow" button
   - Verify button changes to "Following"
   - Verify follower count increments
   - Click again to unfollow
   - Verify button reverts to "Follow"

9. **Friends (Mutual Follow)**
   - User A follows User B
   - User B follows User A back
   - Verify button shows "Friends" for both users
   - Verify friends count increments for both

10. **Followers List Modal**
    - Click on "Followers" count
    - Verify modal opens with follower list
    - Check pagination (if > 20 followers)
    - Click "Load More" if available
    - Click user in list to navigate to their profile

11. **Following List Modal**
    - Click on "Following" count
    - Verify modal opens with following list
    - Test same as followers

12. **Friends List Modal**
    - Click on "Friends" count
    - Verify modal opens with mutual follows only
    - Verify only users who follow back appear

### ✅ Links Section

13. **Add Links**
    - Go to Settings → Profile → Links
    - Add a new link with title, URL, and optional icon (emoji)
    - Save and visit profile
    - Verify link displays in links section

14. **Link Click Tracking**
    - Click on a link in your profile
    - Verify link opens in new tab
    - Check that `click_count` increments in database:
      ```sql
      SELECT id, title, url, click_count FROM user_links WHERE profile_id = '{your-id}';
      ```

15. **Reorder Links**
    - In settings, change `display_order` values
    - Save and verify links display in correct order

16. **Delete Links**
    - Delete a link from settings
    - Save and verify link no longer appears on profile

### ✅ Widgets & Stats

17. **Top Supporters Widget**
    - Send gifts to a user (use gift modal)
    - Visit that user's profile
    - Verify you appear in "Top Supporters" widget
    - Check that gift amount displays correctly

18. **Top Streamers Widget**
    - View profile page
    - Verify top 3 streamers appear (based on diamonds earned)
    - Check "LIVE" badge shows if streamer is currently live

19. **Stats Card**
    - View profile with streaming history
    - Verify stats display:
      - Total streams
      - Time live (formatted as hours/days)
      - Total views
      - Peak viewers
      - Diamonds earned (lifetime + 7 days)
      - Gifter level
      - Gifts sent/received
    - Check formatting of large numbers (commas)

### ✅ Performance & Security

20. **Single Query Load**
    - Open browser DevTools → Network tab
    - Navigate to a profile page
    - Verify only ONE request to `/api/profile/{username}` fires
    - Check response includes all data (profile, links, counts, widgets, stats)

21. **Security: Edit Own Profile Only**
    - Attempt to update another user's customization via API:
      ```bash
      curl -X POST https://your-domain/api/profile/customize \
        -H "Content-Type: application/json" \
        -d '{"card_color": "#FF0000"}'
      ```
    - Verify you can only update your own profile (401 if not owner)

22. **Security: Edit Own Links Only**
    - Attempt to delete another user's link via API
    - Verify request fails (links are filtered by `profile_id`)

### ✅ Responsive Design

23. **Mobile View**
    - Open profile on mobile (or use DevTools responsive mode)
    - Verify layout adapts to mobile screen
    - Check widgets stack vertically
    - Verify touch interactions work (buttons, modals)

24. **Desktop View**
    - Open profile on desktop
    - Verify widgets display in grid (3 columns)
    - Check hover effects on links and buttons

### ✅ Edge Cases

25. **Empty States**
    - View profile with:
      - No followers → Verify "No followers yet" message
      - No links → Verify "No links yet" message (owner sees "Add Links" button)
      - No supporters → Verify "No supporters yet" message
      - No stream stats → Verify zeros display correctly

26. **Long Content**
    - Create profile with very long bio (> 500 chars)
    - Add many links (> 10)
    - Verify layout doesn't break
    - Check text truncation works in modals

27. **Special Characters**
    - Test usernames with special characters (allowed: alphanumeric, underscore, hyphen)
    - Test bio with emojis and unicode
    - Verify rendering is correct

### ✅ Real-Time Updates

28. **Follow Count Updates**
    - Open profile in two browser windows (different users)
    - User A follows User B in window 1
    - Refresh window 2
    - Verify follower count updates

29. **Link Click Analytics**
    - Click a link multiple times
    - Refresh Supabase and check `user_links.click_count`
    - Verify count increments correctly

### ✅ Integration Tests

30. **Profile → Settings → Profile**
    - From profile page, click "Edit Profile"
    - Verify navigates to `/settings/profile`
    - Make changes and save
    - Return to profile page
    - Verify changes applied

31. **Profile → Live Room**
    - If user is live, click "Watch Live" button
    - Verify navigates to `/live` with correct stream

32. **Share Profile**
    - Click "Share" button
    - On mobile: Verify native share sheet opens
    - On desktop: Verify link copies to clipboard
    - Paste link and verify it navigates to correct profile

---

## Database Queries for Testing

### Check Profile Customization

```sql
SELECT 
  username,
  profile_bg_url,
  profile_bg_overlay,
  card_color,
  card_opacity,
  card_border_radius,
  font_preset,
  accent_color,
  links_section_title
FROM profiles
WHERE username = 'testuser';
```

### Check Stream Stats

```sql
SELECT 
  p.username,
  ss.total_streams,
  ss.total_minutes_live,
  ss.total_viewers,
  ss.peak_viewers,
  ss.diamonds_earned_lifetime,
  ss.diamonds_earned_7d
FROM stream_stats ss
JOIN profiles p ON p.id = ss.profile_id
WHERE p.username = 'testuser';
```

### Check Followers/Following/Friends

```sql
-- Followers
SELECT COUNT(*) as follower_count
FROM follows
WHERE followee_id = (SELECT id FROM profiles WHERE username = 'testuser');

-- Following
SELECT COUNT(*) as following_count
FROM follows
WHERE follower_id = (SELECT id FROM profiles WHERE username = 'testuser');

-- Friends (mutual follows)
SELECT COUNT(*) as friends_count
FROM friends
WHERE user_id_1 = (SELECT id FROM profiles WHERE username = 'testuser')
   OR user_id_2 = (SELECT id FROM profiles WHERE username = 'testuser');
```

### Check Top Supporters

```sql
SELECT 
  p.username,
  p.display_name,
  p.gifter_level,
  SUM(g.coin_amount) as total_gifted
FROM gifts g
JOIN profiles p ON p.id = g.sender_id
WHERE g.recipient_id = (SELECT id FROM profiles WHERE username = 'testuser')
GROUP BY p.id, p.username, p.display_name, p.gifter_level
ORDER BY total_gifted DESC
LIMIT 3;
```

### Check Link Clicks

```sql
SELECT 
  title,
  url,
  click_count,
  display_order
FROM user_links
WHERE profile_id = (SELECT id FROM profiles WHERE username = 'testuser')
  AND is_active = true
ORDER BY display_order;
```

---

## Known Limitations & Future Enhancements

### Current Limitations
- Top Streamers widget shows platform-wide (not profile-specific) streamers
- Stream stats must be manually updated after each stream (no auto-tracking yet)
- Link reordering requires manual `display_order` changes (no drag-drop UI yet)

### Suggested Enhancements
- Add drag-drop link reordering in settings
- Add profile banner image upload (in addition to background)
- Add profile themes presets (one-click styling)
- Add profile analytics dashboard (views, link clicks, etc.)
- Add "Block User" functionality
- Add profile verification badge system

---

## Troubleshooting

### Profile data not loading
- Check browser console for API errors
- Verify username exists in database
- Check RPC function exists: `SELECT * FROM information_schema.routines WHERE routine_name = 'get_public_profile';`

### Customization not applying
- Check Supabase row updates: `SELECT * FROM profiles WHERE id = '{your-id}';`
- Clear browser cache and hard refresh
- Verify API route `/api/profile/customize` returns success

### Follow button not working
- Check browser console for auth errors
- Verify user is logged in: `const { data: { user } } = await supabase.auth.getUser();`
- Check RPC function: `SELECT * FROM information_schema.routines WHERE routine_name = 'toggle_follow';`

### Widgets showing empty
- Verify data exists in database (gifts, stream_stats, follows)
- Check RPC function returns data
- Open DevTools → Network → Check API response payload

---

## Commit Message

```
feat: Implement modern profile system with customization

- Add profile customization (backgrounds, cards, fonts, colors)
- Add social features (follow/unfollow, friends, followers/following lists)
- Add Top Supporters & Top Streamers widgets
- Add comprehensive stats card (streaming + gifting)
- Add modern links section with click tracking
- Add profile customization settings UI
- Create single-query profile API endpoint for performance
- Add RLS policies for security
- Add responsive design for mobile/desktop

Database changes:
- Extend profiles table with customization fields
- Add stream_stats table for streaming metrics
- Create friends view for mutual follows
- Add RPC functions for optimized queries

Files:
- profile_system_schema.sql (DB migration)
- app/api/profile/* (API routes)
- app/[username]/modern-page.tsx (Modern profile page)
- components/profile/* (Reusable widgets)
```

---

## Success Criteria

✅ **Functionality**
- All profile data loads in single request
- Customization settings persist and apply
- Follow/unfollow works with mutual friend detection
- Links display correctly with click tracking
- Widgets show accurate data

✅ **Security**
- Users can only edit their own profiles
- RLS policies prevent unauthorized data access
- No private data exposed to non-owners

✅ **Performance**
- Profile page loads < 2 seconds
- Single API request for all profile data
- Optimized queries with proper indexes

✅ **UX**
- Responsive design works on mobile/desktop
- Loading states prevent janky UI
- Error states display helpful messages
- Customization previews immediately on save

---

## Next Steps

1. Run database migration in Supabase
2. Test each feature against checklist
3. Deploy to staging/production
4. Monitor error logs for issues
5. Gather user feedback on customization features
6. Plan future enhancements (drag-drop links, profile themes, etc.)

---

**Ready to test!** 🚀

