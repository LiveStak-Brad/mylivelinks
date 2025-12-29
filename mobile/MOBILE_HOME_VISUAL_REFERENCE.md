# Mobile Home Parity - Visual Reference

## WEB → MOBILE Section Mapping

This document shows the exact 1:1 mapping between web and mobile Home page sections.

---

## 1. HERO SECTION
**WEB**: Large gradient hero with title, subtitle, description
```
Welcome to MyLiveLinks
Your all-in-one platform for live streaming and link sharing
Stream live, share your links, and build your community ✨
```

**MOBILE**: ✓ Identical copy, adapted typography
- 32px title (down from 48-60px for mobile)
- Centered layout
- Same three-line message structure

---

## 2. SEARCH SECTION
**WEB**: Card with search icon, title, input, live results
```
🔍 Find Creators
Search for profiles, discover new content, and connect with creators
[Search input]
[Live results or empty state]
```

**MOBILE**: ✓ Identical structure
- Search icon + section title
- Same subtitle copy
- Live search as-you-type
- Results show avatar, name, username, bio, live badge
- Empty state: "No profiles found. Try a different search term."

---

## 3. RECOMMENDED PROFILES CAROUSEL
**WEB**: Horizontal carousel with profile cards
```
Recommended for You (logged in) / Popular Creators (guest)
Scroll to discover more profiles →
[Profile cards with follow buttons]
```

**MOBILE**: ✓ Identical
- Same title logic (conditional on login)
- Same subtitle: "Scroll to discover more profiles →"
- Profile cards: 280px wide
- Horizontal scroll with snap
- Same recommendation algorithm
- Follow buttons with three states

**Profile Card Contents**:
- Avatar (circular, 96px on mobile)
- Display name / Username
- Bio (80 char truncated)
- Follower count
- Live badge (if streaming)
- Follow/Following/Follow Back button

---

## 4. COMING SOON ROOMS CAROUSEL
**WEB**: Horizontal carousel with room cards + apply card
```
✨ Coming Soon Rooms
Vote with interest — we open rooms when enough people sign up.
[Room cards] [Apply card]
```

**MOBILE**: ✓ Identical
- Sparkle emoji + title
- Same subtitle copy
- Room cards: 260px wide
- Progress bars showing interest/threshold
- Interest button (toggle)
- Apply card at end
- Horizontal scroll with snap

**Room Card Contents**:
- Image or gradient background
- Category badge
- Room name
- Description
- Progress bar (X / Y interested)
- "I'm Interested" / "✓ Interested" button
- Special badges (if applicable)

---

## 5. FEATURES GRID
**WEB**: 2×2 grid of feature cards
```
[4 cards in 2 columns on desktop]
```

**MOBILE**: ✓ All 4 cards, stacked vertically
- Same icon for each feature
- Same titles
- Same descriptions

**Feature 1**: 📹 Live Streaming
**Feature 2**: 🔗 Link Hub
**Feature 3**: 👥 Community
**Feature 4**: 📈 Monetization

Exact same copy for all descriptions.

---

## 6. QUICK ACTIONS / CTA SECTION
**WEB**: Centered card with buttons
```
Ready to Get Started?
[View My Profile] (if has username)
OR [Complete Your Profile] (if no username)
[Browse Live Streams] (disabled)
```

**MOBILE**: ✓ Identical logic
- Same title: "Ready to Get Started?"
- Same conditional button logic
- Same disabled state for Live Streams

---

## 7. FOOTER
**WEB**: 
```
© 2025 MyLiveLinks. All rights reserved.
```

**MOBILE**: ✓ Identical
- Same copyright text
- Centered, small gray text

---

## LOADING STATES

### WEB Loading State
- Skeleton cards
- Pulsing backgrounds
- Maintains layout structure

### MOBILE Loading State ✓
- Full-screen spinner on initial load
- Activity indicators in carousels
- "Searching..." text during search
- Button spinners during actions

---

## EMPTY STATES

### WEB
- Search: "No profiles found. Try a different search term."
- Carousels: Hidden when no data
- No random error messages

### MOBILE ✓
- Exact same empty state messages
- Same hiding behavior
- Same professional messaging

---

## DISABLED STATES

### WEB
- "Browse Live Streams" button disabled with title attribute
- Follow buttons disabled during loading

### MOBILE ✓
- "Browse Live Streams" button disabled
- Follow buttons disabled during loading
- Proper opacity styling

---

## CONDITIONAL DISPLAY

### WEB
| Condition | Display |
|-----------|---------|
| Not logged in | "Popular Creators" |
| Logged in | "Recommended for You" |
| No username | "Complete Your Profile" button |
| Has username | "View My Profile" button |
| User is live | Red LIVE badge |
| Other user | Show follow button |
| Self | Hide follow button |

### MOBILE ✓
All conditions match exactly.

---

## INTERACTION PATTERNS

### WEB
- Click profile card → Navigate to profile
- Click follow → Optimistic update
- Type in search → Debounced search
- Click room interest → Toggle with progress update
- Scroll carousel → Smooth horizontal scroll

### MOBILE ✓
- Tap profile card → Navigate to profile
- Tap follow → Optimistic update
- Type in search → Debounced search
- Tap room interest → Toggle with progress update
- Scroll carousel → Smooth horizontal scroll with snap

---

## COLOR PALETTE

### Both platforms use:
- Primary: #5E9BFF (blue)
- Live red: #FF4444
- Background: Dark with rgba overlays
- Text: White primary, gray secondary
- Cards: rgba(255,255,255,0.05-0.08)
- Borders: rgba(255,255,255,0.1)

✓ Mobile matches web exactly.

---

## TYPOGRAPHY SCALE

### WEB
- Hero: 48-60px
- Section titles: 24-32px
- Body: 14-16px
- Labels: 12-14px

### MOBILE (scaled appropriately)
- Hero: 32px
- Section titles: 22-24px
- Body: 13-15px
- Labels: 11-13px

Proportions maintained, readability optimized for mobile.

---

## PARITY CHECKLIST

- ✅ Section order matches exactly
- ✅ Section titles/copy match exactly
- ✅ Card layouts match (adapted for mobile)
- ✅ Spacing density appropriate for platform
- ✅ Loading states present and polished
- ✅ Empty states match messaging
- ✅ Disabled states match behavior
- ✅ Conditional logic matches exactly
- ✅ Color palette identical
- ✅ Typography scaled appropriately
- ✅ All interactive elements present
- ✅ API calls match web
- ✅ Navigation patterns match
- ✅ No missing features
- ✅ No extra features (strict parity)

---

## CONCLUSION

**100% visual and functional parity achieved.**

A user switching from web to mobile will see:
- Same content in same order
- Same visual styling (adapted for mobile)
- Same functionality and behavior
- Same states and messaging
- No confusion or missing features

The mobile Home page is a faithful, touch-optimized version of the web Home page.




