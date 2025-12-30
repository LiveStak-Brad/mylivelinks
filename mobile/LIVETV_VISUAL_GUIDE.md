# LiveTV Visual Guide 📺

## Component Hierarchy

```
LiveTVScreen
├── PageShell (with bottom nav)
│   ├── PageHeader
│   │   ├── TV Icon (red)
│   │   ├── Title: "LiveTV"
│   │   └── Subtitle: "MyLiveLinks Presents"
│   │
│   └── ScrollView (vertical)
│       ├── Search Container
│       │   └── TextInput with 🔍 icon & clear button
│       │
│       ├── Categories Rail (horizontal)
│       │   └── ScrollView
│       │       ├── [All] chip (default)
│       │       ├── [Comedy] chip
│       │       ├── [Music] chip
│       │       └── ... 10 more categories
│       │
│       ├── Featured Section
│       │   ├── Header (⭐ Featured / See All →)
│       │   └── Horizontal ScrollView
│       │       ├── StreamCard
│       │       ├── StreamCard
│       │       └── StreamCard...
│       │
│       ├── Sponsored Section
│       │   ├── Header (💎 Sponsored / See All →)
│       │   └── Horizontal ScrollView
│       │       └── [StreamCards or Empty State]
│       │
│       ├── New Section
│       │   ├── Header (✨ New / See All →)
│       │   └── Horizontal ScrollView
│       │       └── [StreamCards or Empty State]
│       │
│       └── Nearby Section
│           ├── Header (📍 Nearby / See All →)
│           └── Horizontal ScrollView
│               └── [StreamCards or Empty State]
```

---

## StreamCard Anatomy

```
┌─────────────────────────────┐
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │  ⭐ Featured    👁 1.2K │ │ ← Badges overlay on thumbnail
│ │                         │ │
│ │    [16:9 THUMBNAIL]     │ │ ← Image or 📺 fallback
│ │         280×158         │ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
│ ComedyKing               ← Streamer name (bold, 16px)
│                             │
│ • Comedy                 ← Category (dot + text, 13px)
│                             │
└─────────────────────────────┘
  Card: 280px width, auto height
  Border radius: 16px
  Shadow: theme elevation
```

---

## Badge Color Codes

| Badge | Emoji | Color | Position |
|-------|-------|-------|----------|
| Featured | ⭐ | `#f59e0b` (amber-500) | Top-right |
| Sponsored | 💎 | `#8b5cf6` (purple-500) | Top-right |
| New | ✨ | `#10b981` (emerald-500) | Top-right |
| Nearby | 📍 | `#3b82f6` (blue-500) | Top-right |
| Viewer Count | 👁 | `rgba(0,0,0,0.75)` | Bottom-right |

---

## Category Chips

### Default State
```
┌──────────┐
│ Comedy   │  Background: theme.colors.card
└──────────┘  Border: theme.colors.border
              Text: theme.colors.textPrimary
```

### Active State
```
┌──────────┐
│ Comedy   │  Background: theme.colors.accent
└──────────┘  Border: theme.colors.accent
              Text: #fff (white)
```

---

## Empty State

```
┌─────────────────────────────────┐
│                                 │
│           💎                    │
│      (48px, opacity 0.3)        │
│                                 │
│  No sponsored streams right now │
│                                 │
└─────────────────────────────────┘
  Min width: 280px
  Padding: 40px vertical
  Background: theme.colors.card
  Border: theme.colors.border
```

---

## Spacing System

```
Section spacing:
├── Section margin-top: 12px
├── Section header padding: 16px horizontal
├── Section header margin-bottom: 14px
├── Rail padding: 16px horizontal
└── Card margin-right: 12px

Search & Categories:
├── Search container padding: 16px
├── Search input height: 46px
├── Categories padding: 12px vertical
└── Category chip margin-right: 8px

Card internal:
├── Content padding: 14px
├── Gap between name & category: 6px
└── Category dot size: 4×4px
```

---

## Color Palette (per theme)

### Light Mode
- Background Primary: Light gray
- Background Secondary: White
- Card Surface: White
- Text Primary: Near-black
- Text Secondary: Gray-600
- Text Muted: Gray-400
- Border: Gray-200
- Accent: Blue (#3b82f6)

### Dark Mode
- Background Primary: Near-black
- Background Secondary: Dark gray
- Card Surface: Dark gray + alpha
- Text Primary: White
- Text Secondary: Gray-300
- Text Muted: Gray-500
- Border: Gray-700
- Accent: Blue (#5e9bff)

---

## Interaction States

### StreamCard
```
default → activeOpacity: 0.85
  ↓
onPress → handleStreamPress(stream)
  ↓
setLiveRoomEnabled(true)
  ↓
Render LiveRoomScreen (fullscreen)
```

### Category Chip
```
default → activeOpacity: 0.7
  ↓
onPress → setSelectedCategory(category)
  ↓
Updates chip styling (active state)
```

### Search Input
```
onChangeText → setSearchQuery(text)
  ↓
Shows clear button if text.length > 0
  ↓
Clear button → setSearchQuery('')
```

---

## Performance Notes

✅ **No Jank**
- Fixed card widths prevent layout shift
- `showsHorizontalScrollIndicator={false}` for clean look
- `activeOpacity` for instant feedback
- Mock data loads instantly

✅ **Smooth Scrolling**
- Nested horizontal + vertical ScrollViews optimized
- Cards use `useMemo` for styles
- No heavy computation in render

✅ **Memory Efficient**
- Image fallbacks prevent broken image states
- `onError` handler for graceful degradation
- No animated loops (static UI)

---

## Typography Scale

| Element | Size | Weight | Letter Spacing |
|---------|------|--------|----------------|
| Section Title | 20px | 800 | -0.5 |
| Streamer Name | 16px | 700 | -0.2 |
| Search Input | 16px | 400 | 0 |
| Category Chip | 14px | 600/700 | 0 |
| Category Text | 13px | 600 | 0 |
| See All Link | 14px | 600 | 0 |
| Badge Text | 11px | 800 | 0.3 |
| Viewer Count | 12px | 700 | 0 |
| Empty State | 15px | 600 | 0 |

---

## Icon Usage

| Icon | Unicode | Size | Usage |
|------|---------|------|-------|
| TV | Via Lucide | - | PageHeader |
| Search | 🔍 | 18px | Search input |
| Clear | ✕ | 16px | Clear button |
| Star | ⭐ | - | Featured badge/section |
| Gem | 💎 | - | Sponsored badge/section |
| Sparkles | ✨ | - | New badge/section |
| Pin | 📍 | - | Nearby badge/section |
| TV Emoji | 📺 | 56px | Thumbnail fallback |
| Eye | 👁 | 13px | Viewer count |

---

## Aspect Ratios

- **Stream Thumbnail**: 16:9 (landscape)
- **Card Width**: 280px (fixed)
- **Card Height**: Auto (~230px total)
- **Thumbnail Height**: ~158px (from 16:9 of 280px)
- **Content Height**: ~72px (padding + text)

---

## Shadow Elevations

```typescript
// From theme.elevations.card
{
  color: '#000',
  opacity: 0.1 (light) / 0.3 (dark),
  radius: 8,
  offset: { width: 0, height: 2 },
  elevation: 3 (Android)
}

// Badge shadows (custom)
{
  color: '#000',
  opacity: 0.3,
  radius: 4,
  offset: { width: 0, height: 2 },
  elevation: 4
}
```

---

## Accessibility Notes

- ✅ Search input has placeholder
- ✅ Clear button visible feedback
- ✅ Category chips have active states
- ✅ Cards have `activeOpacity` for touch feedback
- ✅ Text truncates with `ellipsizeMode="tail"`
- ✅ Empty states are informative
- ⚠️ Consider adding aria labels for screen readers (future)

---

## Backend Integration Points (Not Wired)

When ready to wire backend:

1. **Search**: Hook `searchQuery` to API filter
2. **Categories**: Hook `selectedCategory` to API filter
3. **Sections**: Replace `mockStreams` with real API data
4. **See All**: Navigate to filtered full list page
5. **Stream Press**: Pass real stream data to LiveRoomScreen
6. **Real-time**: Add WebSocket for viewer count updates

---

## Comparison to Old Rooms

| Feature | Old Rooms | New LiveTV |
|---------|-----------|------------|
| Screen | Single placeholder card | Full discovery hub |
| Content | "Enter Live Central" button | 4 sections with cards |
| Search | None | ✅ Search bar |
| Categories | None | ✅ 12 category chips |
| Cards | None | ✅ Stream cards |
| Empty States | N/A | ✅ Per section |
| Polish | Basic | ✅ Premium |
| Scroll | Single screen | ✅ Vertical + horizontal |

---

**Status: UI ONLY - Ready for backend integration** 🎯

