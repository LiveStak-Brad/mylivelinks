# Link or Nah - UI Feature Complete

## Overview
Complete networking-first swipe feature with optional dating mode. Modern UI, mock data, and API stubs ready for backend integration.

---

## File Structure

### API Layer (`lib/link-or-nah/`)
- **types.ts** - TypeScript interfaces and constants
- **mockData.ts** - Mock candidates, mutuals, and user profile data
- **api.ts** - API stubs with simulated delays (to be replaced by Logic Agent)

### Components (`components/link-or-nah/`)
- **FeatureNav.tsx** - Internal feature navigation
- **SwipeCard.tsx** - Individual swipeable card component
- **ProfileInfoModal.tsx** - Full profile view modal
- **MutualModal.tsx** - Mutual connection celebration modal

### Pages (`app/link-or-nah/`)
- **page.tsx** - Landing page with feature explanation
- **swipe/page.tsx** - Main swipe experience with card stack
- **profile/page.tsx** - Profile setup/editor
- **mutuals/page.tsx** - Mutual connections list
- **messages/page.tsx** - Messages placeholder (coming soon)
- **settings/page.tsx** - Settings and preferences

---

## Complete File List

```
lib/link-or-nah/
├── types.ts
├── mockData.ts
└── api.ts

components/link-or-nah/
├── FeatureNav.tsx
├── SwipeCard.tsx
├── ProfileInfoModal.tsx
└── MutualModal.tsx

app/link-or-nah/
├── page.tsx
├── swipe/
│   └── page.tsx
├── profile/
│   └── page.tsx
├── mutuals/
│   └── page.tsx
├── messages/
│   └── page.tsx
└── settings/
    └── page.tsx
```

**Total: 13 new files**

---

## Features Implemented

### 1. Landing Page (`/link-or-nah`)
- Feature explanation with networking-first positioning
- "How It Works" section with 3 steps
- "What You Unlock" benefits list
- Privacy-first messaging
- Optional dating mode explanation (clearly marked as optional)
- CTAs: "Start Swiping" and "Edit Link Profile"

### 2. Swipe Experience (`/link-or-nah/swipe`)
- Full-screen card stack with 3D layering effect
- Photo carousel with tap/click navigation
- Card content:
  - Name (+ age only if both have dating enabled)
  - Location (if provided)
  - Bio snippet
  - Interest tags
- Actions:
  - Swipe "Nah" (pass)
  - Swipe "Link" (connect)
  - Info button (opens full profile modal)
- Mutual detection with celebration modal
- Progress indicator
- Empty state with reset option

### 3. Profile Editor (`/link-or-nah/profile`)
- Master "Enable Link or Nah" toggle
- Basic info:
  - Display name
  - Username
  - Bio (240 char limit with counter)
  - General location (optional, no GPS)
- Photo management (up to 5 photos)
- Interest tags (multi-select from 18 options)
- Dating Mode (collapsible section):
  - Toggle to enable/disable
  - Age
  - Looking for (All/Men/Women)
  - Age range slider
  - Separate dating bio
  - Privacy note: only visible if both users enable it

### 4. Mutuals List (`/link-or-nah/mutuals`)
- Grid view of mutual connections
- Each row shows:
  - Avatar
  - Name + username
  - Bio snippet
  - Interest tags
  - "Mutual" badge
  - Connection date
  - CTAs: "View" and "Message" (locked)
- Empty state with CTA to start swiping

### 5. Messages Placeholder (`/link-or-nah/messages`)
- Coming soon page with feature preview
- List of planned features:
  - Direct messaging
  - Read receipts
  - Media sharing
  - Block/report tools
- CTAs to view mutuals or keep swiping

### 6. Settings/Preferences (`/link-or-nah/settings`)
- Visibility toggle (show/hide profile)
- Location settings:
  - General location text input
  - Max distance (UI only, not enforced)
- Interest filters (prioritize certain tags)
- Dating mode filters:
  - Toggle dating mode
  - Looking for preference
  - Age range
- Privacy & safety info section
- Danger zone:
  - Reset swipe history (test mode)
  - Delete profile (placeholder)

---

## Design Language

### Color Scheme
- **Primary**: Blue-to-purple gradient (`from-blue-600 to-purple-600`)
- **Secondary**: Pink accents for dating mode (`from-pink-600`)
- **Neutral**: Gray scale for text and backgrounds
- **Success**: Green for confirmations
- **Danger**: Red for destructive actions

### Components
- Rounded corners: `rounded-lg` (8px) to `rounded-2xl` (16px)
- Shadows: `shadow-lg` to `shadow-2xl` for elevation
- Transitions: All interactive elements have smooth transitions
- Responsive: Mobile-first, adapts to desktop

### Typography
- Headings: Bold, clear hierarchy
- Body: 14-16px, readable line height
- Labels: 12-14px, gray color for less emphasis

### Icons
- Vector-based SVG icons (no emoji per requirement)
- Consistent stroke width
- Proper spacing and alignment

---

## Mock Data

### Candidates (5 profiles)
1. Alex Rivera - Music producer (networking only)
2. Jordan Lee - Fitness coach (dating enabled)
3. Taylor Morgan - Tech founder (networking only)
4. Sam Chen - Content creator (networking only)
5. Casey Brooks - Fashion blogger (dating enabled)

### Mutuals (2 profiles)
1. Riley Johnson - Photographer
2. Morgan Davis - Entrepreneur

### Interest Tags (18 options)
Music, Gaming, Fitness, Business, Travel, Food, Art, Tech, Fashion, Sports, Movies, Books, Photography, Crypto, NFTs, Streaming, Content Creation, Networking

---

## API Stubs (Ready for Backend Integration)

All data operations use `lib/link-or-nah/api.ts` stubs:

```typescript
linkOrNahApi.getProfile() // Get user's Link profile
linkOrNahApi.saveProfile(profile) // Save profile changes
linkOrNahApi.getCandidates(limit) // Get swipe candidates
linkOrNahApi.submitDecision({ targetUserId, decision }) // Submit swipe
linkOrNahApi.getMutuals() // Get mutual connections
linkOrNahApi.getPreferences() // Get user preferences
linkOrNahApi.savePreferences(prefs) // Save preferences
linkOrNahApi.resetSwipes() // Reset swipe history (test mode)
```

Each function includes simulated delays (200-500ms) for realistic UX during development.

---

## Key UX Features

### Privacy First
- No GPS tracking (text-based location only)
- Dating info hidden unless both users enable it
- Swipe decisions are private
- User controls visibility at all times

### Networking First
- Default language: "Link", "Connect", "Mutuals", "Friends"
- No "hot", "dating", "match" language unless dating mode enabled
- Focus on professional/creator networking
- Interest tags emphasize business, content, creative pursuits

### Dating Mode (Optional)
- Clearly marked as optional in all contexts
- Separate bio for dating context
- Age only shown if both users have dating enabled
- Pink gradient styling to differentiate from networking

### Smooth Interactions
- Card stack with 3D layering effect
- Smooth swipe animations (cards move to next)
- Modal transitions
- Loading states for all async operations
- Empty states with helpful CTAs

---

## Testing Guide

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Navigate to Feature
Visit: `http://localhost:3000/link-or-nah`

### 3. Test Flow

**A) Landing Page**
1. View feature explanation
2. Click "Start Swiping" → Should go to swipe page
3. Click "Edit Link Profile" → Should go to profile editor

**B) Profile Editor**
1. Toggle "Enable Link or Nah" ON
2. Fill in display name, username, bio
3. Add location (optional)
4. Add photos (paste image URLs for demo)
5. Select interest tags
6. Expand "Dating Mode" section
7. Toggle dating mode ON
8. Fill in age, looking for, age range, dating bio
9. Click "Save" → Should see success message

**C) Swipe Experience**
1. Navigate to "Swipe" tab
2. View candidate card with photo, bio, tags
3. Tap left/right on photos to navigate
4. Click info button → Full profile modal opens
5. Click "Nah" → Card moves to next
6. Click "Link" → May trigger mutual modal (20% chance)
7. If mutual appears:
   - See celebration modal
   - Click "Follow Back" (placeholder)
   - Click "Message" (placeholder)
   - Click "Keep Swiping" → Continue
8. Swipe through all 5 profiles
9. See "No More Profiles" empty state
10. Click "Start Over" → Reload candidates (test mode)

**D) Mutuals List**
1. Navigate to "Mutuals" tab
2. View list of mutual connections
3. Click "View" → Placeholder alert
4. Click "Message" → Placeholder alert

**E) Messages**
1. Navigate to "Messages" tab
2. See "Coming Soon" page with feature preview
3. Click CTAs to navigate elsewhere

**F) Settings**
1. Navigate to "Settings" tab
2. Toggle visibility ON/OFF
3. Update location and max distance
4. Select/deselect interest filters
5. Toggle dating mode ON/OFF
6. Update dating preferences
7. Click "Reset Swipe History" → Confirm → See alert
8. Click "Save" → Should see success message

### 4. Test Responsive Design
- Resize browser window
- Test on mobile device (if available)
- Check that navigation scrolls horizontally on small screens
- Verify card stack works on mobile

### 5. Test Dark Mode
- Switch system to dark mode (if supported)
- All pages should render correctly in dark theme

---

## Notable Implementation Details

### Dating Mode Privacy Logic
The system ensures dating info is only visible when BOTH users have dating enabled:

```typescript
// In getCandidates()
age: this.profile.datingEnabled && candidate.datingEnabled 
  ? candidate.age 
  : undefined
```

This is enforced in the API layer, so UI will never display age unless both profiles have dating mode ON.

### Card Stack 3D Effect
Uses CSS transforms to create layered stack:

```typescript
transform: `translateY(${offset}px) scale(${scale})`
opacity: 1 - idx * 0.3
zIndex: 10 - idx
```

Shows current card + 2 behind it for depth perception.

### Interest Tag System
18 predefined tags in `INTEREST_TAGS` constant. Users can select unlimited tags, but UI shows max 4 on cards (with "+N more" indicator).

### Photo Management
Demo uses URL input for photos. Logic Agent should replace with proper image upload to storage.

---

## Next Steps for Logic Agent

### 1. Replace API Stubs
Replace `lib/link-or-nah/api.ts` with real Supabase calls:

- Create `link_profiles` table
- Create `link_swipes` table (user_id, target_id, decision, timestamp)
- Create `link_mutuals` table (user1_id, user2_id, matched_at)
- Implement matching logic (detect when both swiped "Link")
- Add photo upload to Supabase Storage
- Add pagination for candidates query

### 2. Integrate with Auth
- Replace mock `current_user` with `auth.uid()`
- Add RLS policies for privacy
- Ensure user can only see/edit their own profile

### 3. Implement Filters
- Location-based filtering (if both users share location)
- Interest tag matching (prioritize shared interests)
- Dating mode filters (age range, looking for)
- Block list (users who blocked each other shouldn't appear)

### 4. Add Real-time Features
- Realtime notification when mutual happens
- Update mutuals list in real-time
- Online status indicators (optional)

### 5. Messaging System
- Create chat rooms for mutuals
- Implement messaging UI
- Add push notifications
- Add media upload

### 6. Analytics
- Track swipe metrics
- Track mutual rate
- A/B test different card layouts
- Monitor feature usage

---

## URLs

- Landing: `/link-or-nah`
- Swipe: `/link-or-nah/swipe`
- Profile: `/link-or-nah/profile`
- Mutuals: `/link-or-nah/mutuals`
- Messages: `/link-or-nah/messages`
- Settings: `/link-or-nah/settings`

---

## Dependencies Used

All existing Next.js + Tailwind dependencies. No new packages required.

Uses:
- `next/link` and `next/navigation` for routing
- React hooks (`useState`, `useEffect`)
- Tailwind CSS for styling
- `@/components/ui/dialog` for modals (assuming existing Dialog component)

---

## Summary

Complete networking-first swipe feature ready for testing and backend integration. All UI is polished, responsive, and uses vector icons. Mock data flows through clean API stubs ready to be replaced with real Supabase calls. Dating mode is properly scoped as optional with privacy logic enforced at the data layer.

**Status: ✅ Complete and ready for testing**
