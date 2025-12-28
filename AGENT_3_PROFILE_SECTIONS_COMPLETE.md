# UI AGENT 3 — Section Components & Empty States

## ✅ Deliverables Complete

All MVP profile section components have been successfully implemented with full mobile-first design, empty states, and owner/viewer modes.

---

## 📦 Components Created

### 1. **FeaturedSection** (All Profile Types)
**File:** `mobile/components/profile/FeaturedSection.tsx`

**Features:**
- Horizontal scrollable grid of featured items
- Supports video, link, and post types
- Thumbnail display with type badges
- Empty state: "No Featured Content" with star emoji
- Owner actions: Add, Edit, Delete
- Visitor mode: View only, section hidden if empty

**Props:**
```typescript
interface FeaturedSectionProps {
  items: FeaturedItem[];
  isOwner: boolean;
  onAdd?: () => void;
  onEdit?: (item: FeaturedItem) => void;
  onDelete?: (itemId: string) => void;
}
```

---

### 2. **ScheduleSection** (Streamer)
**File:** `mobile/components/profile/ScheduleSection.tsx`

**Features:**
- Vertical list of scheduled streams
- Day of week and time display
- Recurring badge indicator
- Empty state: "No Schedule Set" with calendar emoji
- Owner actions: Add, Edit, Delete
- Visitor mode: View only, section hidden if empty

**Props:**
```typescript
interface ScheduleSectionProps {
  items: ScheduleItem[];
  isOwner: boolean;
  onAdd?: () => void;
  onEdit?: (item: ScheduleItem) => void;
  onDelete?: (itemId: string) => void;
}
```

---

### 3. **ClipsSection** (Streamer/Comedian)
**File:** `mobile/components/profile/ClipsSection.tsx`

**Features:**
- Horizontal scrollable video clips
- 16:9 thumbnail with play button overlay
- Duration and view count badges
- Empty state: "No Clips Yet" with movie camera emoji
- Owner actions: Add, Edit, Delete
- Visitor mode: Tap to play, section hidden if empty

**Props:**
```typescript
interface ClipsSectionProps {
  items: ClipItem[];
  isOwner: boolean;
  onAdd?: () => void;
  onEdit?: (item: ClipItem) => void;
  onDelete?: (itemId: string) => void;
  onPlay?: (item: ClipItem) => void;
}
```

---

### 4. **MusicSection** (Musician)
**File:** `mobile/components/profile/MusicSection.tsx`

**Features:**
- Horizontal scrollable music tracks
- Square album art (1:1 aspect ratio)
- Play button overlay
- Duration badge
- Artist, album metadata
- Streaming platform indicators (Spotify, Apple Music, YouTube)
- Empty state: "No Music Added" with music note emoji
- Owner actions: Add, Edit, Delete
- Visitor mode: Tap to play, view streaming links

**Props:**
```typescript
interface MusicSectionProps {
  items: MusicItem[];
  isOwner: boolean;
  onAdd?: () => void;
  onEdit?: (item: MusicItem) => void;
  onDelete?: (itemId: string) => void;
  onPlay?: (item: MusicItem) => void;
}
```

---

### 5. **ShowsSection** (Musician/Comedian)
**File:** `mobile/components/profile/ShowsSection.tsx`

**Features:**
- Horizontal scrollable show cards
- 3:4 poster aspect ratio
- Date, time, venue, location display
- Status badges (Upcoming, Sold Out, Past)
- Ticket link button for visitors
- Empty state: "No Shows Listed" with circus tent emoji
- Owner actions: Add, Edit, Delete
- Visitor mode: Get tickets button, section hidden if empty

**Props:**
```typescript
interface ShowsSectionProps {
  items: ShowItem[];
  isOwner: boolean;
  onAdd?: () => void;
  onEdit?: (item: ShowItem) => void;
  onDelete?: (itemId: string) => void;
  onGetTickets?: (item: ShowItem) => void;
}
```

---

### 6. **ProductsOrServicesSection** (Business)
**File:** `mobile/components/profile/ProductsOrServicesSection.tsx`

**Features:**
- Horizontal scrollable product/service cards
- 4:3 product image aspect ratio
- Price display
- Category badges
- Availability badges (Out of Stock, Coming Soon)
- Empty state: "No Products or Services" with shopping emoji
- Owner actions: Add, Edit, Delete
- Visitor mode: Tap to view details, section hidden if empty

**Props:**
```typescript
interface ProductsOrServicesSectionProps {
  items: ProductOrServiceItem[];
  isOwner: boolean;
  onAdd?: () => void;
  onEdit?: (item: ProductOrServiceItem) => void;
  onDelete?: (itemId: string) => void;
  onViewDetails?: (item: ProductOrServiceItem) => void;
}
```

---

### 7. **PressKitSection** (Musician)
**File:** `mobile/components/profile/PressKitSection.tsx`

**Features:**
- Vertical list of downloadable materials
- Type-based icons (bio, photo, rider, press release, media)
- Color-coded by type
- File type and size metadata
- Download button for visitors
- Empty state: "No Press Kit Materials" with folder emoji
- Owner actions: Add, Edit, Delete
- Visitor mode: Download button, section hidden if empty

**Props:**
```typescript
interface PressKitSectionProps {
  items: PressKitItem[];
  isOwner: boolean;
  onAdd?: () => void;
  onEdit?: (item: PressKitItem) => void;
  onDelete?: (itemId: string) => void;
  onDownload?: (item: PressKitItem) => void;
}
```

---

## 📋 Index Export
**File:** `mobile/components/profile/index.ts`

Exports all components and their TypeScript types for easy importing:

```typescript
import {
  FeaturedSection,
  ScheduleSection,
  ClipsSection,
  MusicSection,
  ShowsSection,
  ProductsOrServicesSection,
  PressKitSection,
  type FeaturedItem,
  type ScheduleItem,
  // ... etc
} from '@/mobile/components/profile';
```

---

## 🎨 Design Patterns

### Consistent Empty States
All components follow the same empty state pattern:
- Large emoji icon (48px, 50% opacity)
- Bold title (18px, weight 700)
- Descriptive text (14px, secondary color)
- Accent-colored CTA button
- Dashed border card container
- **Only shown to owners**
- **Sections hidden for visitors when empty**

### Owner vs Visitor Mode
- **Owner sees:** Add button in header, Edit/Delete actions on items
- **Visitor sees:** Content only, interactive buttons (play, tickets, download)

### Mobile-First Layout
- Horizontal scrolling for grid/card layouts
- Vertical scrolling for list layouts
- Proper touch targets (44pt minimum)
- Smooth press states with opacity
- Card shadows for depth

### Theme Integration
- Uses `useThemeMode()` hook
- Supports light/dark modes
- Consistent color tokens
- Elevation system for shadows

---

## 🔧 Technical Details

### No Backend Dependencies
- All components use mock data via props
- No Supabase or API calls
- Pure UI components

### Prop Contracts
Every section component follows a clean contract:
- `items: T[]` - Array of section-specific items
- `isOwner: boolean` - Owner vs viewer mode
- `onAdd?: () => void` - Add new item
- `onEdit?: (item: T) => void` - Edit existing item
- `onDelete?: (itemId: string) => void` - Delete item
- Additional handlers as needed (onPlay, onDownload, etc.)

### TypeScript Types
All item types are exported for type safety:
- `FeaturedItem`
- `ScheduleItem`
- `ClipItem`
- `MusicItem`
- `ShowItem`
- `ProductOrServiceItem`
- `PressKitItem`

---

## ✅ Requirements Met

- ✅ Reusable section components with clean prop contracts
- ✅ Empty states with CTA buttons
- ✅ Owner mode: Add/Edit/Delete actions
- ✅ Visitor mode: Content only, section hidden if empty
- ✅ No backend calls (mock data only)
- ✅ Mobile-first layout
- ✅ Visual consistency with app theme
- ✅ TypeScript types exported
- ✅ No linting errors

---

## 📱 Usage Example

```typescript
import { FeaturedSection, type FeaturedItem } from '@/mobile/components/profile';

const mockFeatured: FeaturedItem[] = [
  {
    id: '1',
    title: 'My Best Stream',
    description: 'Epic gaming session',
    thumbnail_url: 'https://...',
    type: 'video',
  },
];

<FeaturedSection
  items={mockFeatured}
  isOwner={true}
  onAdd={() => console.log('Add featured')}
  onEdit={(item) => console.log('Edit', item)}
  onDelete={(id) => console.log('Delete', id)}
/>
```

---

## 🎯 Next Steps

These section components are ready to be integrated into profile screens by:
1. UI Agent 1 (Profile Header & Picker)
2. UI Agent 2 (Profile Layout Integration)

The components are fully self-contained and require only:
- Data to be passed via props
- Callback handlers to be wired up
- Integration into the profile page layout

---

**Status:** ✅ **Complete**
**Linting:** ✅ **No errors**
**Mobile Ready:** ✅ **Yes**

