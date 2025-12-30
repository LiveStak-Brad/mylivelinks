# LiveTV Chip Modes - Visual Reference Guide

## Quick Filter Chips Behavior Reference

### 1️⃣ TRENDING Chip
```
┌─────────────────────────────────────────┐
│ [TRENDING] Featured  Rooms  Popular ... │  ← Selected chip highlighted
└─────────────────────────────────────────┘

Content Displayed:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Trending
   [StreamCard] [StreamCard] [StreamCard] → (Horizontal scroll)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(ONLY Trending rail visible)
```

### 2️⃣ FEATURED Chip
```
┌─────────────────────────────────────────┐
│ Trending  [FEATURED]  Rooms  Popular ...│
└─────────────────────────────────────────┘

Content Displayed:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ Featured
   [StreamCard] [StreamCard] [StreamCard] → (Horizontal scroll)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(ONLY Featured rail visible)
```

### 3️⃣ ROOMS Chip
```
┌─────────────────────────────────────────┐
│ Trending  Featured  [ROOMS]  Popular ...│
└─────────────────────────────────────────┘

Content Displayed:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏠 Rooms
   [RoomCard] [RoomCard] [RoomCard] → (Horizontal scroll)
   ┌──────────┐
   │ 🎤       │ ← LiveTVRoomChannelCard with avatars
   │ Comedy   │    and "12 live now" count
   │ 👤👤👤   │
   └──────────┘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(ONLY Rooms rail visible)
```

### 4️⃣ POPULAR Chip
```
┌─────────────────────────────────────────┐
│ Trending  Featured  Rooms  [POPULAR] ...│
└─────────────────────────────────────────┘

Content Displayed:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 Popular
   [StreamCard] [StreamCard] [StreamCard] → (Horizontal scroll)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(ONLY Popular rail visible, sorted by viewer count)
```

### 5️⃣ FOLLOWED Chip
```
┌─────────────────────────────────────────┐
│ Trending  Featured  Rooms  Popular      │
│ [FOLLOWED]  New  Nearby  Find           │
└─────────────────────────────────────────┘

Content Displayed:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 Followed
   [StreamCard] [StreamCard] [StreamCard] → (Horizontal scroll)
   
   OR if no followed creators:
   
   ┌────────────────────────────────┐
   │          👥                    │
   │  Follow creators to see        │
   │  them here                     │
   └────────────────────────────────┘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(ONLY Followed rail visible)
```

### 6️⃣ NEW Chip
```
┌─────────────────────────────────────────┐
│ Trending  Featured  Rooms  Popular      │
│ Followed  [NEW]  Nearby  Find           │
└─────────────────────────────────────────┘

Content Displayed:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ New creators
   [StreamCard] [StreamCard] [StreamCard] → (Horizontal scroll)

🌟 Just started
   [StreamCard] [StreamCard] [StreamCard] → (Horizontal scroll)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(TWO rails visible: New creators + Just started)
```

### 7️⃣ NEARBY Chip
```
┌─────────────────────────────────────────┐
│ Trending  Featured  Rooms  Popular      │
│ Followed  New  [NEARBY]  Find           │
└─────────────────────────────────────────┘

📍 Using your location  ← Special hint row

Content Displayed:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Trending
   [StreamCard] [StreamCard] [StreamCard] → (Horizontal scroll)

⭐ Featured
   [StreamCard] [StreamCard] [StreamCard] → (Horizontal scroll)

🏠 Rooms
   [RoomCard] [RoomCard] [RoomCard] → (Horizontal scroll)

🔥 Popular
   [StreamCard] [StreamCard] [StreamCard] → (Horizontal scroll)

👥 Followed
   [StreamCard] [StreamCard] [StreamCard] → (Horizontal scroll)

📂 [Music] Comedy Gaming IRL Battles ... ← Category tabs

🎵 Top in Music
   [StreamCard] [StreamCard] [StreamCard] → (Horizontal scroll)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(MULTIPLE rails visible, showing nearby/all content)
```

### 8️⃣ FIND Chip
```
┌─────────────────────────────────────────┐
│ Trending  Featured  Rooms  Popular      │
│ Followed  New  Nearby  [FIND]           │
└─────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  🔍  Search streams, creators...     ✕   │ ← Search bar
└──────────────────────────────────────────┘

[Filter] [Sort: Trending]  ← ONLY visible in Find mode

Content Displayed:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Results
┌────────────────────────────────────────┐
│ [Avatar] ComedyKing     👁 1.2K  →    │ ← Vertical list row
├────────────────────────────────────────┤
│ [Avatar] MusicMaven     👁 856   →    │
├────────────────────────────────────────┤
│ [Avatar] NewStreamer    👁 234   →    │
├────────────────────────────────────────┤
│ [Avatar] IRLWalker      👁 4.4K  →    │
└────────────────────────────────────────┘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(VERTICAL list layout with LiveTVFindResultRow components)
```

---

## State Persistence (localStorage)

### Key: `livetv_active_filter`

**Flow:**
```
User clicks chip
    ↓
State updates (activeQuickFilter)
    ↓
useEffect triggers
    ↓
localStorage.setItem('livetv_active_filter', 'Popular')
    ↓
User refreshes page
    ↓
useState initialization reads localStorage
    ↓
Chip selection restored ✅
```

**Example:**
```javascript
// On mount
const saved = localStorage.getItem('livetv_active_filter');
// → "Popular"

// Restore state
setActiveQuickFilter(saved);
// → Popular chip is selected, Popular rail is shown
```

---

## Accessibility Features

### Keyboard Navigation
```
Tab → Focus first chip (visible focus ring)
Tab → Focus next chip
Tab → Focus next chip
...
Enter/Space → Select focused chip
```

### Screen Reader Announcements
```
Button: "Filter by Trending", pressed: true
Button: "Filter by Featured", pressed: false
Button: "Filter by Popular", pressed: false
...
```

### Focus Ring Styling
```css
focus:ring-2          ← 2px ring width
focus:ring-primary    ← Primary color ring
focus:ring-offset-2   ← 2px offset from button
```

---

## Component Architecture

```
LiveTVPage (app/rooms/page.tsx)
│
├── State Management
│   ├── activeQuickFilter (string)
│   ├── searchQuery (string)
│   ├── genderFilter ('All' | 'Men' | 'Women')
│   └── selectedCategoryTab (string)
│
├── LiveTVQuickFiltersRow
│   ├── props: options, selected, onSelect
│   └── renders: chip buttons with aria-* attributes
│
├── LiveTVGenderSegmentedControl
│   └── props: value, onChange
│
└── Rail Rendering (based on railItems)
    ├── Trending → LiveTVHorizontalRail
    ├── Featured → LiveTVHorizontalRail
    ├── Rooms → LiveTVHorizontalRail (RoomChannelCards)
    ├── Popular → LiveTVHorizontalRail
    ├── Followed → LiveTVHorizontalRail
    ├── NewCreators → LiveTVHorizontalRail
    ├── JustStarted → LiveTVHorizontalRail
    └── FindResults → Vertical list with LiveTVFindResultRow
```

---

## Testing Scenarios

### Scenario 1: Basic Chip Switching
```
1. Go to /rooms
2. Click "Featured" → See Featured rail only ✅
3. Click "Rooms" → See Rooms rail only ✅
4. Click "New" → See two rails (New creators + Just started) ✅
```

### Scenario 2: Persistence
```
1. Go to /rooms
2. Click "Popular"
3. Press F5 (refresh)
4. Verify "Popular" chip is still selected ✅
5. Verify Popular rail is visible ✅
```

### Scenario 3: Find Mode
```
1. Go to /rooms
2. Click "Find"
3. Verify Filter and Sort buttons appear ✅
4. Verify vertical list is shown ✅
5. Click "Trending"
6. Verify Filter/Sort buttons disappear ✅
7. Verify horizontal rails return ✅
```

### Scenario 4: Keyboard Navigation
```
1. Go to /rooms
2. Press Tab until chips are focused
3. Press Tab to move between chips
4. Verify focus ring is visible ✅
5. Press Enter to select a chip
6. Verify view changes ✅
```

---

## Code Reference

### Main Logic (app/rooms/page.tsx)

**State Initialization with Persistence:**
```typescript
const [activeQuickFilter, setActiveQuickFilter] = useState<string>(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('livetv_active_filter');
    if (saved && QUICK_FILTERS.includes(saved)) {
      return saved;
    }
  }
  return 'Trending';
});
```

**Persistence Effect:**
```typescript
useEffect(() => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('livetv_active_filter', activeQuickFilter);
  }
}, [activeQuickFilter]);
```

**Rail Items Logic:**
```typescript
const railItems = useMemo((): RailItem[] => {
  if (activeQuickFilter === 'Find') return [{ key: 'FindResults' }];
  if (activeQuickFilter === 'Nearby') return [ /* multiple rails */ ];
  if (activeQuickFilter === 'New') return [{ key: 'NewCreators' }, { key: 'JustStarted' }];
  if (activeQuickFilter === 'Trending') return [{ key: 'Trending' }];
  if (activeQuickFilter === 'Featured') return [{ key: 'Featured' }];
  // ... etc
}, [activeQuickFilter]);
```

---

## Summary

✅ **8 chip modes working correctly**  
✅ **localStorage persistence implemented**  
✅ **Accessibility enhanced with ARIA**  
✅ **Keyboard navigation fully functional**  
✅ **No layout changes or new features**  
✅ **Clean, minimal fixes only**

**VERIFICATION COMPLETE** ✨

