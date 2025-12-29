# 🧩 UI AGENT 2 — Profile Type Badge, Quick Actions & Section Tabs

## ✅ DELIVERABLES

### Components Created

All components are located in `mobile/components/`:

1. **`ProfileTypeBadge.tsx`** - Profile type pill badge
2. **`ProfileQuickActionsRow.tsx`** - Type-specific quick action buttons
3. **`ProfileSectionTabs.tsx`** - Horizontal scrollable section tabs
4. **`ProfileIntegrationExample.tsx`** - Integration guide and examples

---

## 📋 Component Documentation

### 1. ProfileTypeBadge

**Purpose:** Displays a small, colorful pill badge showing the profile type.

**Location:** Intended to be placed near username/display name in profile header.

**Props:**
```typescript
interface ProfileTypeBadgeProps {
  profileType: 'streamer' | 'musician' | 'comedian' | 'business' | 'creator' | 'default';
  style?: any; // Optional custom styles
}
```

**Profile Types:**
- `streamer` - 📺 Streamer (red theme)
- `musician` - 🎵 Musician (purple theme)
- `comedian` - 🎭 Comedian (amber theme)
- `business` - 💼 Business (blue theme)
- `creator` - ✨ Creator (pink theme)
- `default` - 👤 Member (gray theme)

**Features:**
- Theme-aware (light/dark mode)
- Emoji + label format
- Type-specific colors
- Compact, pill-shaped design

**Usage:**
```tsx
import ProfileTypeBadge from './components/ProfileTypeBadge';

<ProfileTypeBadge 
  profileType="streamer" 
  style={{ marginBottom: 8 }}
/>
```

---

### 2. ProfileQuickActionsRow

**Purpose:** Displays 3 type-specific action buttons below profile info.

**Location:** Intended to be placed after bio, before main action buttons (Follow/Message).

**Props:**
```typescript
interface ProfileQuickActionsRowProps {
  profileType: 'streamer' | 'musician' | 'comedian' | 'business' | 'creator' | 'default';
  style?: any;
  // Optional callbacks for each action type:
  onGoLive?: () => void;
  onSchedule?: () => void;
  onClips?: () => void;
  onPlay?: () => void;
  onShows?: () => void;
  onMerch?: () => void;
  onBook?: () => void;
  onProducts?: () => void;
  onBookings?: () => void;
  onReviews?: () => void;
  onFeatured?: () => void;
  onPosts?: () => void;
  onLinks?: () => void;
}
```

**Actions by Type:**

**Streamer:**
- 📹 Go Live (red)
- 📅 Schedule (purple)
- 🎬 Clips (blue)

**Musician:**
- ▶️ Play (purple)
- 🎵 Shows (pink)
- 👕 Merch (amber)

**Comedian:**
- 🎬 Clips (amber)
- 📅 Shows (red)
- 🎫 Book (purple)

**Business:**
- 🛒 Products (blue)
- 📅 Bookings (green)
- ⭐ Reviews (amber)

**Creator:**
- ✨ Featured (pink)
- 📝 Posts (purple)
- 🔗 Links (blue)

**Default:** No actions shown (returns null)

**Features:**
- Placeholder handlers if callbacks not provided (shows "coming soon" alert)
- Responsive press states
- Icon + label layout
- Type-specific colors

**Usage:**
```tsx
import ProfileQuickActionsRow from './components/ProfileQuickActionsRow';

<ProfileQuickActionsRow
  profileType="musician"
  onPlay={() => console.log('Play music')}
  onShows={() => console.log('View shows')}
  onMerch={() => console.log('View merch')}
/>
```

---

### 3. ProfileSectionTabs

**Purpose:** Horizontal scrollable chips for navigating profile sections.

**Location:** Intended to be placed after hero card, before section content.

**Props:**
```typescript
interface ProfileSectionTabsProps {
  profileType: 'streamer' | 'musician' | 'comedian' | 'business' | 'creator' | 'default';
  activeTab: string; // ID of currently active tab
  onTabChange: (tabId: string) => void; // Callback when tab is pressed
  style?: any;
}
```

**Tabs by Type:**

**Streamer:**
- About
- 📺 Streams
- ⭐ Highlights
- 📅 Schedule
- 👥 Community

**Musician:**
- About
- 🎵 Music
- 🎬 Videos
- 🎤 Shows
- 👕 Merch

**Comedian:**
- About
- 🎭 Clips
- 🎫 Shows
- ⭐ Reviews

**Business:**
- About
- 💼 Services
- 🛍️ Products
- ⭐ Reviews
- 📧 Contact

**Creator:**
- About
- ✨ Featured
- 🖼️ Gallery
- 📝 Posts
- 🔗 Links

**Default:**
- About
- Posts
- Media

**Features:**
- Horizontal scroll (no scroll indicator)
- Active tab highlighting with border + shadow
- Theme-aware styling
- Emoji support for visual clarity
- Controlled component (state managed by parent)

**Usage:**
```tsx
import ProfileSectionTabs from './components/ProfileSectionTabs';
import { useState } from 'react';

function ProfileScreen() {
  const [activeTab, setActiveTab] = useState('about');
  
  return (
    <>
      <ProfileSectionTabs
        profileType="streamer"
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {/* Render content based on activeTab */}
      {activeTab === 'about' && <AboutSection />}
      {activeTab === 'streams' && <StreamsSection />}
      {/* etc */}
    </>
  );
}
```

---

## 🔧 Integration Guide

### Installation Points in ProfileScreen.tsx

The integration example file (`ProfileIntegrationExample.tsx`) contains detailed comments showing exactly where to insert each component in the existing `ProfileScreen.tsx`.

**Summary of insertion points:**

1. **Imports** (top of file)
2. **State management** (add `profileType` and `activeSectionTab` state)
3. **Badge** - After username display (~line 540)
4. **Quick Actions** - After bio, before action buttons (~line 543)
5. **Section Tabs** - After hero card, before profile tabs (~line 581)

**No modifications to existing layout are required.** These components slot cleanly into the existing structure.

---

## 🎨 Design Features

### Theme Support
- All components use `useThemeMode()` hook
- Automatic light/dark mode adaptation
- Consistent color tokens from theme system

### Visual Consistency
- Matches existing ProfileScreen design language
- Uses theme colors, borders, shadows
- Respects existing spacing/padding patterns

### Accessibility
- Clear visual hierarchy
- Touch targets meet minimum size requirements
- Color contrast compliant in both modes

### Performance
- useMemo for style objects (avoid re-renders)
- Minimal re-renders on state changes
- Efficient ScrollView for tabs

---

## 📊 Profile Type System

### Current Implementation
- Types are **hardcoded enums** in components
- No database integration (yet)
- Default type is `'default'` (generic member)

### Future Database Integration

To add profile types to the database:

1. **Add column to profiles table:**
```sql
ALTER TABLE profiles 
ADD COLUMN profile_type TEXT 
DEFAULT 'default' 
CHECK (profile_type IN ('streamer', 'musician', 'comedian', 'business', 'creator', 'default'));

CREATE INDEX idx_profiles_profile_type ON profiles(profile_type);
```

2. **Update ProfileData interface:**
```typescript
interface ProfileData {
  profile: {
    // ... existing fields
    profile_type?: ProfileType;
  };
  // ... rest
}
```

3. **Use from API response:**
```typescript
const profileType = profileData.profile.profile_type || 'default';
```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Badge displays correctly for each profile type
- [ ] Quick actions show correct buttons per type
- [ ] Quick actions trigger placeholder alerts when pressed
- [ ] Section tabs scroll horizontally
- [ ] Active tab highlights correctly
- [ ] Tab selection updates active state
- [ ] Components adapt to light/dark theme
- [ ] Press states feel responsive
- [ ] Layout doesn't break on small screens
- [ ] No console errors or warnings

### Profile Types to Test
- Streamer
- Musician
- Comedian
- Business
- Creator
- Default

---

## 📁 File Structure

```
mobile/
  components/
    ProfileTypeBadge.tsx           ✅ NEW
    ProfileQuickActionsRow.tsx     ✅ NEW
    ProfileSectionTabs.tsx         ✅ NEW
    ProfileIntegrationExample.tsx  ✅ NEW (documentation)
```

---

## 🎯 Scope Summary

### ✅ Implemented
- Profile type badge with 6 types
- Type-specific quick actions (3 per type)
- Section tabs (varies by type)
- Theme-aware styling
- Placeholder handlers for all actions
- Integration documentation
- TypeScript types exported

### ❌ NOT Implemented (Out of Scope)
- Section content rendering
- Database integration
- Profile type selection UI
- Edit profile type flow
- Action handler implementation
- Analytics/tracking

---

## 🚀 Next Steps (Recommended)

1. **Test components** in isolation using Expo
2. **Integrate into ProfileScreen** following the example guide
3. **Add database support** for profile_type column (optional)
4. **Implement real handlers** for quick actions
5. **Build section content** components for each tab type

---

## 📝 Notes

- All components are **standalone** and don't depend on each other
- Components return `null` or empty state gracefully if no content
- **No side effects** - purely presentational components
- State management is controlled by parent (ProfileScreen)
- All props are type-safe with TypeScript

---

## 🎉 Completion Status

**Status:** ✅ COMPLETE

All deliverables implemented per specification:
- ✅ Profile Type Badge component
- ✅ Type-specific Quick Actions Row
- ✅ Section Tabs/Chips component
- ✅ Clean integration points documented
- ✅ No modifications to existing profile layout
- ✅ Placeholder handlers for all actions
- ✅ Theme-aware styling
- ✅ TypeScript support

**Ready for:** Integration into ProfileScreen and testing.



