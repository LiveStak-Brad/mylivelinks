# LiveTV Redesign - Quick Visual Reference

## Filter Button Layout

```
┌────────────────────────────────────────┐
│ [Trending] [Featured] [Rooms]          │ ← Special Filters
│ [IRL] [Music] [Gaming] [Comedy] [JC]  │ ← Category Filters
└────────────────────────────────────────┘
```

---

## What You See When You Click Each Button

### 1. TRENDING (Special Filter)
```
┌──────────────────────────────────────┐
│  📈 Trending Now                     │
├──────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐│
│  │ 5K │ │ 4K │ │ 3K │ │ 2K │ │ 1K ││  ← FULL PAGE GRID
│  └────┘ └────┘ └────┘ └────┘ └────┘│     All streams mixed
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐│     Sorted by viewers
│  │ 900│ │ 800│ │ 700│ │ 600│ │ 500││     (Most popular first)
│  └────┘ └────┘ └────┘ └────┘ └────┘│
│          ↓ Scroll Down               │
└──────────────────────────────────────┘

LAYOUT: Vertical scrolling grid
COLUMNS: 2 (mobile), 3 (tablet), 4-5 (desktop)
CONTENT: ALL streams, sorted by viewer count
```

### 2. FEATURED (Special Filter)
```
┌──────────────────────────────────────┐
│  ⭐ Featured Streamers               │
├──────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐│
│  │ ⭐ │ │ ⭐ │ │ ⭐ │ │ ⭐ │ │ ⭐ ││  ← FULL PAGE GRID
│  └────┘ └────┘ └────┘ └────┘ └────┘│     Featured badge only
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐│     Curated content
│  │ ⭐ │ │ ⭐ │ │ ⭐ │ │ ⭐ │ │ ⭐ ││
│  └────┘ └────┘ └────┘ └────┘ └────┘│
│          ↓ Scroll Down               │
└──────────────────────────────────────┘

LAYOUT: Vertical scrolling grid
COLUMNS: 2 (mobile), 3 (tablet), 4-5 (desktop)
CONTENT: Featured streams only
```

### 3. ROOMS (Special Filter)
```
┌──────────────────────────────────────┐
│  🏠 Live Rooms                       │
├──────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐   │
│  │🎮Gaming│ │🎵Music │ │🎤Comedy│→→→│  ← HORIZONTAL RAIL
│  │12 Live │ │7 Live  │ │5 Live │   │     Room channels only
│  │👤👤👤  │ │👤👤   │ │👤👤👤 │   │     Scroll right →
│  └────────┘ └────────┘ └────────┘   │
└──────────────────────────────────────┘

LAYOUT: Single horizontal rail
CONTENT: Room channels (Gaming Room, Music Room, etc.)
SCROLL: Horizontal only
```

### 4-8. CATEGORY FILTERS (IRL, Music, Gaming, Comedy, Just Chatting)

Example: **IRL** (Same pattern for all categories)

```
┌──────────────────────────────────────┐
│  Trending (IRL only)            ───→ │  ← Rail 1: Trending
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐        │     Horizontal scroll
│  │🔥IRL│ │IRL │ │IRL │ │IRL │    →→→│
│  └────┘ └────┘ └────┘ └────┘        │
├──────────────────────────────────────┤
│  New (IRL only)                 ───→ │  ← Rail 2: New
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐        │     Horizontal scroll
│  │New │ │New │ │New │ │New │    →→→│
│  └────┘ └────┘ └────┘ └────┘        │
├──────────────────────────────────────┤
│  Nearby (IRL only)              ───→ │  ← Rail 3: Nearby
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐        │     Horizontal scroll
│  │📍IRL│ │IRL │ │IRL │ │IRL │   →→→│
│  └────┘ └────┘ └────┘ └────┘        │
└──────────────────────────────────────┘
         ↓ Page Scrolls Vertically

LAYOUT: 3 horizontal rails stacked vertically
CONTENT: Filtered by selected category (IRL/Music/Gaming/etc.)
RAILS: 
  - Rail 1: Trending streams in this category
  - Rail 2: New streams in this category  
  - Rail 3: Nearby streams in this category
SCROLL: Each rail scrolls horizontal, page scrolls vertical
```

---

## Filter Button States

### Active Button
```
┌──────────┐
│ Trending │  ← Gradient background (primary→accent)
└──────────┘     White text
                 Slightly larger (scale: 1.05)
                 Shadow effect
```

### Inactive Button
```
┌──────────┐
│ Featured │  ← Secondary background
└──────────┘     Normal text color
                 Border
                 Normal size
```

---

## Mobile Layout Specifics

### Filter Buttons
```
Group 1:
[Trending] [Featured] [Rooms]

↓ Gap

Group 2:
[IRL] [Music] [Gaming]
[Comedy] [Just Chatting]
```

### Grid Layout
```
┌──────────┬──────────┐
│  Stream  │  Stream  │  ← 2 columns
│  Card 1  │  Card 2  │     48% width each
├──────────┼──────────┤     12px gap
│  Stream  │  Stream  │
│  Card 3  │  Card 4  │
├──────────┼──────────┤
│  Stream  │  Stream  │
│  Card 5  │  Card 6  │
└──────────┴──────────┘
      ↓ Scroll Down
```

### Rail Layout
```
┌────────────────────────────┐
│ Rail Title            ───→ │
│ [Card] [Card] [Card] ───→ │  ← Horizontal scroll
└────────────────────────────┘
         ↓ Scroll Down
┌────────────────────────────┐
│ Next Rail            ───→  │
│ [Card] [Card] [Card] ───→ │
└────────────────────────────┘
```

---

## Responsive Breakpoints

```
Mobile:      Grid = 2 columns    (< 640px)
Tablet:      Grid = 3 columns    (640px - 1024px)
Desktop SM:  Grid = 4 columns    (1024px - 1280px)
Desktop LG:  Grid = 5 columns    (> 1280px)
```

---

## Content Filtering Logic

```
Trending Page:
  ALL streams → Sort by viewer_count DESC

Featured Page:
  Filter: badge = 'Featured' → Show in grid

Rooms Page:
  Load room channels → Show in horizontal rail

IRL Page (Category):
  Filter: category = 'IRL'
  ├─ Trending Rail: badge = 'Trending' + category = 'IRL'
  ├─ New Rail: sort by created_at DESC + category = 'IRL'
  └─ Nearby Rail: sort by distance + category = 'IRL'

Music Page (Category):
  Filter: category = 'Music'
  ├─ Trending Rail: badge = 'Trending' + category = 'Music'
  ├─ New Rail: sort by created_at DESC + category = 'Music'
  └─ Nearby Rail: sort by distance + category = 'Music'

(Same pattern for Gaming, Comedy, Just Chatting)
```

---

## User Flow Examples

### Scenario 1: Browse Most Popular
```
1. User clicks "Trending"
2. Sees full grid of all streams
3. Streams sorted by viewer count
4. Scrolls down to browse more
5. Taps any stream to watch
```

### Scenario 2: Explore Music Streams
```
1. User clicks "Music"
2. Sees 3 rails:
   - Trending music streams (top)
   - New music streams (middle)
   - Nearby music streams (bottom)
3. Swipes right on each rail to see more
4. Scrolls down to browse all 3 rails
5. Taps stream to watch
```

### Scenario 3: Check Featured Content
```
1. User clicks "Featured"
2. Sees full grid of featured streamers
3. Only featured/spotlighted content shown
4. Scrolls to browse curated content
5. Taps to watch
```

### Scenario 4: Join a Room
```
1. User clicks "Rooms"
2. Sees horizontal rail of room channels
3. Swipes right to see more rooms
4. Taps "Gaming Room" (12 live)
5. Joins group stream
```

---

## Key Differences from Old Design

### OLD ❌
- Every filter showed same style (single horizontal rail)
- No full-page grid views
- Categories mixed with special filters
- Trending was just another rail

### NEW ✅
- Special filters have unique layouts (grids vs rail)
- Trending/Featured show comprehensive view
- Clear separation: Special vs Category filters
- Category filters have consistent 3-rail pattern
- Better content discovery

---

## Quick Command Reference

### Web - Testing
```bash
# Navigate to LiveTV page
http://localhost:3000/rooms

# Test each filter:
- Click Trending → See grid
- Click Featured → See grid
- Click Rooms → See rail
- Click IRL → See 3 rails
- Click Music → See 3 rails
...etc
```

### Mobile - Testing
```bash
# Navigate to Rooms tab in app
- Tap bottom nav "Rooms" icon

# Test each filter:
- Tap Trending → See 2-col grid
- Tap Featured → See 2-col grid
- Tap Rooms → See horizontal rail
- Tap IRL → See 3 stacked rails
- Tap Music → See 3 stacked rails
...etc
```

---

**Quick Ref Version:** 2.0  
**Last Updated:** December 29, 2025  
**Status:** ✅ Production Ready

