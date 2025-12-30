# LiveTV Web Quick Reference 🚀

## Where to See It

```bash
# Start web dev server
npm run dev

# Visit in browser
http://localhost:3000/rooms
```

---

## Files Created (9 new files)

### Components
```
components/livetv/
├── StreamCard.tsx              (162 lines) - Premium stream card
├── LiveTVQuickFiltersRow.tsx   (30 lines)  - Quick filter pills
├── LiveTVGenderSegmentedControl.tsx (37)   - Gender filter
├── LiveTVCategoryTabs.tsx      (35 lines)  - Category tabs
├── LiveTVHorizontalRail.tsx    (86 lines)  - Generic rail
├── LiveTVRoomChannelCard.tsx   (95 lines)  - Room card
├── LiveTVFindResultRow.tsx     (66 lines)  - Find result row
└── index.ts                    (10 lines)  - Exports
```

### Page
```
app/rooms/page.tsx              (550 lines) - Main LiveTV page
```

---

## Component Usage

### StreamCard
```tsx
import { StreamCard } from '@/components/livetv';

<StreamCard 
  stream={{
    id: '1',
    slug: 'stream-1',
    streamer_display_name: 'ComedyKing',
    thumbnail_url: null,
    viewer_count: 1234,
    category: 'Comedy',
    badges: ['Featured'],
    gender: 'Men',
  }}
/>
```

### LiveTVHorizontalRail
```tsx
import { LiveTVHorizontalRail, StreamCard } from '@/components/livetv';

<LiveTVHorizontalRail
  title="Trending"
  data={streams}
  loading={false}
  itemWidth={292}
  keyExtractor={(s) => s.id}
  renderItem={({ item }) => <StreamCard stream={item} />}
/>
```

### LiveTVQuickFiltersRow
```tsx
import { LiveTVQuickFiltersRow } from '@/components/livetv';

<LiveTVQuickFiltersRow
  options={['Trending', 'Featured', 'Rooms']}
  selected={activeFilter}
  onSelect={setActiveFilter}
/>
```

### LiveTVGenderSegmentedControl
```tsx
import { LiveTVGenderSegmentedControl } from '@/components/livetv';

<LiveTVGenderSegmentedControl
  value={genderFilter}
  onChange={setGenderFilter}
/>
```

### LiveTVCategoryTabs
```tsx
import { LiveTVCategoryTabs } from '@/components/livetv';

<LiveTVCategoryTabs
  tabs={['Music', 'Comedy', 'Gaming']}
  selected={selectedCategory}
  onSelect={setSelectedCategory}
/>
```

### LiveTVRoomChannelCard
```tsx
import { LiveTVRoomChannelCard } from '@/components/livetv';

<LiveTVRoomChannelCard
  room={{
    id: 'r1',
    name: 'Comedy Room',
    liveNowCount: 12,
    categoryIcon: '🎤',
    avatars: [{ id: 'a1', label: 'A' }],
  }}
/>
```

### LiveTVFindResultRow
```tsx
import { LiveTVFindResultRow } from '@/components/livetv';

<LiveTVFindResultRow
  stream={stream}
/>
```

---

## Page Structure

```tsx
LiveTVPage
├── Sticky Header
│   ├── Title + Subtitle
│   ├── Search Bar
│   ├── Quick Filters Row
│   ├── Gender Segmented Control
│   └── Conditional (Nearby hint OR Find controls)
│
└── Rails Content (dynamic based on activeQuickFilter)
    ├── Trending Rail
    ├── Featured Rail
    ├── Rooms Rail
    ├── Popular Rail
    ├── Followed Rail (with empty state)
    ├── Category Tabs + Label
    ├── Category Top Rail
    ├── Category Rising Rail
    └── Find Results (when Find is active)
```

---

## State Variables

```tsx
const [searchQuery, setSearchQuery] = useState('');
const [activeQuickFilter, setActiveQuickFilter] = useState('Trending');
const [genderFilter, setGenderFilter] = useState<'All' | 'Men' | 'Women'>('All');
const [selectedCategoryTab, setSelectedCategoryTab] = useState('Music');
const [findSort, setFindSort] = useState<'Trending' | 'Popular'>('Trending');
const [uiLoading, setUiLoading] = useState(true);
```

---

## Quick Filter Options

```tsx
const QUICK_FILTERS = [
  'Trending',   // Shows: Trending, Featured, Rooms, Popular, Followed, Category
  'Featured',   // Same as Trending
  'Rooms',      // Same as Trending
  'Popular',    // Same as Trending
  'Followed',   // Same as Trending
  'New',        // Shows: New Creators, Just Started
  'Nearby',     // Shows: Trending, Featured, Rooms, Popular, Followed, Category Top (no Rising)
  'Find',       // Shows: Find Results (search list)
];
```

---

## Category Tabs

```tsx
const CATEGORY_TABS = [
  'Music',
  'Comedy',
  'Gaming',
  'IRL',
  'Battles',
  'Sports',
  'Local',
];
```

---

## Rail Logic

### Which rails show per filter:

**Trending / Featured / Rooms / Popular / Followed:**
- Trending
- Featured
- Rooms
- Popular
- Followed
- Category Tabs
- Category Top
- Category Rising

**New:**
- New Creators
- Just Started

**Nearby:**
- Trending
- Featured
- Rooms
- Popular
- Followed
- Category Tabs
- Category Top (no Rising)

**Find:**
- Find Results (vertical list)

---

## Mock Data

### Streams
```tsx
const mockStreams: Stream[] = [
  {
    id: '1',
    slug: 'stream-1',
    streamer_display_name: 'ComedyKing',
    thumbnail_url: null,
    viewer_count: 1234,
    category: 'Comedy',
    badges: ['Featured'],
    gender: 'Men',
  },
  // ... more streams
];
```

### Rooms
```tsx
const mockRoomChannels: LiveTVRoomChannel[] = [
  {
    id: 'r1',
    name: 'Comedy Room',
    liveNowCount: 12,
    categoryIcon: '🎤',
    avatars: [
      { id: 'a1', label: 'A' },
      { id: 'a2', label: 'B' },
    ],
    gender: 'Men',
  },
  // ... more rooms
];
```

---

## Styling Classes

### Card Hover
```css
group
hover:shadow-lg
hover:-translate-y-1
transition-all duration-200
```

### Sticky Header
```css
sticky top-0 z-10
bg-background
border-b border-border
```

### Horizontal Scroll
```css
overflow-x-auto
scrollbar-hide
flex gap-3
min-w-max
```

### Loading Skeleton
```css
bg-muted
rounded-2xl
animate-pulse
```

---

## Tailwind Utilities Used

```css
/* Spacing */
px-4, py-3, gap-2, gap-3, space-y-0

/* Typography */
text-3xl, text-xl, text-base, text-sm, text-xs
font-black, font-extrabold, font-bold, font-semibold
tracking-tight, tracking-wide, uppercase

/* Colors */
bg-background, bg-card, bg-muted, bg-primary
text-foreground, text-muted-foreground, text-primary-foreground
border-border

/* Borders */
border, border-b, border-t
rounded-xl, rounded-2xl, rounded-full

/* Shadows */
shadow-sm, shadow-lg

/* Effects */
transition-all, transition-colors
duration-200
animate-pulse

/* Hover */
hover:bg-muted/50
hover:shadow-lg
hover:-translate-y-1
hover:scale-105

/* Layout */
flex, flex-col, flex-1
items-center, justify-between
gap-1, gap-2, gap-3
min-w-0, min-w-max
aspect-video

/* Positioning */
sticky, absolute, relative
top-0, right-2, bottom-2
z-10

/* Overflow */
overflow-hidden, overflow-x-auto
line-clamp-1, truncate
scrollbar-hide
```

---

## Empty States

### Followed
```tsx
<div className="rounded-2xl bg-card border border-border p-5.5">
  <h3 className="font-black text-base text-foreground mb-1">
    Follow creators to see them here.
  </h3>
  <p className="text-sm font-bold text-muted-foreground leading-relaxed">
    Your followed creators will show up as they go live.
  </p>
</div>
```

### Find No Results
```tsx
<div className="rounded-2xl bg-card border border-border p-4">
  <h3 className="font-black text-base text-foreground mb-1">
    No results
  </h3>
  <p className="text-sm font-bold text-muted-foreground">
    Try another search term.
  </p>
</div>
```

---

## Performance Tips

✅ Use `useMemo` for filtered data  
✅ Use `useCallback` for filter functions  
✅ Lazy load images with Next.js Image  
✅ Hide scrollbars with `scrollbar-hide`  
✅ Use CSS transforms for animations (GPU accelerated)  
✅ Show skeleton states during loading  
✅ Limit initial render items  

---

## Responsive Breakpoints

```tsx
// Mobile-first approach
px-4                    // Mobile: 16px padding
md:pb-8                 // Desktop: 8px bottom padding (mobile: 24px)
max-w-[1600px]          // Max container width
overflow-x-auto         // Enable horizontal scroll on mobile
```

---

## Testing Checklist

- [ ] Visit `/rooms` in browser
- [ ] Search bar works
- [ ] Quick filters change content
- [ ] Gender filter filters streams
- [ ] Category tabs switch categories
- [ ] Stream cards link to `/live/[slug]`
- [ ] Room cards link to `/rooms/[id]`
- [ ] Hover animations work
- [ ] Light mode looks good
- [ ] Dark mode looks good
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Horizontal scroll smooth

---

## Next Steps (Backend Integration)

1. Replace `mockStreams` with real API call
2. Replace `mockRoomChannels` with real API call
3. Wire search to API endpoint
4. Wire filters to API queries
5. Add pagination/infinite scroll
6. Add real-time viewer count updates
7. Add "See All" pages
8. Add filter modal in Find view

---

**Access at: `/rooms` after running `npm run dev`** 🎉

