# 🎨 Web Profile Type UI - Visual Guide

## 📱 Component Showcase

### 1. Profile Type Badge

**Location**: Next to username in profile header

```
┌────────────────────────────────┐
│  John Streamer                 │
│  @johnstreamer [📺 Streamer]  │  ← Badge here
│  "Live every day at 8PM!"      │
└────────────────────────────────┘
```

**Variants**:
- 📺 Streamer (Red)
- 🎵 Musician (Purple)
- 🎭 Comedian (Amber)
- 💼 Business (Sky Blue)
- ✨ Creator (Pink)
- 👤 Member (Gray - default)

---

### 2. Quick Actions Row

**Location**: Below profile header, above tabs

#### Streamer Type
```
┌─────────────────────────────────────────┐
│     [📹 Go Live] [📅 Schedule] [🎬 Clips] │
└─────────────────────────────────────────┘
```

#### Musician Type
```
┌─────────────────────────────────────────┐
│     [▶️ Play] [🎤 Shows] [👕 Merch]      │
└─────────────────────────────────────────┘
```

#### Comedian Type
```
┌─────────────────────────────────────────┐
│     [🎬 Clips] [🎫 Shows] [🎟️ Book]      │
└─────────────────────────────────────────┘
```

#### Business Type
```
┌─────────────────────────────────────────┐
│  [📦 Products] [📋 Bookings] [⭐ Reviews] │
└─────────────────────────────────────────┘
```

#### Creator Type
```
┌─────────────────────────────────────────┐
│  [✨ Featured] [📝 Posts] [🔗 Links]     │
└─────────────────────────────────────────┘
```

#### Default Type
```
(No quick actions shown)
```

---

### 3. Section Tabs

**Location**: Below quick actions, above content area

#### Streamer Tabs
```
┌────────────────────────────────────────────────┐
│ [Info] [📺 Streams] [⭐ Highlights] [📅 Schedule] [📰 Feed] [📸 Photos] │
└────────────────────────────────────────────────┘
```

#### Musician Tabs
```
┌────────────────────────────────────────────────┐
│ [Info] [🎵 Music] [🎬 Videos] [🎤 Shows] [👕 Merch] [📰 Feed] [📸 Photos] │
└────────────────────────────────────────────────┘
```

#### Comedian Tabs
```
┌────────────────────────────────────────────────┐
│ [Info] [🎭 Clips] [🎫 Shows] [⭐ Reviews] [📰 Feed] [📸 Photos] │
└────────────────────────────────────────────────┘
```

#### Business Tabs
```
┌────────────────────────────────────────────────┐
│ [Info] [💼 Services] [🛍️ Products] [⭐ Reviews] [📧 Contact] [📸 Photos] │
└────────────────────────────────────────────────┘
```

#### Creator Tabs
```
┌────────────────────────────────────────────────┐
│ [Info] [✨ Featured] [🖼️ Gallery] [📝 Posts] [🔗 Links] [📰 Feed] [📸 Photos] │
└────────────────────────────────────────────────┘
```

#### Default Tabs
```
┌──────────────────────────────┐
│ [Info] [Feed] [Photos]       │
└──────────────────────────────┘
```

---

## 🎯 Complete Layout Example

### Streamer Profile

```
┌─────────────────────────────────────────────────────┐
│                  Profile Header                      │
│  ┌────┐                                              │
│  │ 🖼️ │  John Streamer                              │
│  └────┘  @johnstreamer [📺 Streamer]   🔴 LIVE     │
│          "Live every day at 8PM!"                    │
│          [Follow] [Message] [Share] [Stats]          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              Quick Actions Row                       │
│    [📹 Go Live] [📅 Schedule] [🎬 Clips]            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                 Section Tabs                         │
│ [Info] [📺 Streams] [⭐ Highlights] [📅 Schedule]   │
│ [📰 Feed] [📸 Photos]                               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  Tab Content                         │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐         │
│  │  Social   │ │ Supporters│ │ Streamers │         │
│  │  Counts   │ │   List    │ │   List    │         │
│  └───────────┘ └───────────┘ └───────────┘         │
│                                                      │
│  ┌─────────────────────────────────────────┐       │
│  │         Social Media Links               │       │
│  │  [Instagram] [Twitter] [TikTok]          │       │
│  └─────────────────────────────────────────┘       │
│                                                      │
│  ┌─────────────────────────────────────────┐       │
│  │           Connections                    │       │
│  │  [Following] [Followers] [Friends]       │       │
│  └─────────────────────────────────────────┘       │
│                                                      │
│  ┌─────────────────────────────────────────┐       │
│  │            My Links                      │       │
│  │  🔗 Website                              │       │
│  │  🔗 YouTube Channel                      │       │
│  └─────────────────────────────────────────┘       │
│                                                      │
│  ┌─────────────────────────────────────────┐       │
│  │         Streaming Stats                  │       │
│  │  Total Streams: 247                      │       │
│  │  Peak Viewers: 1,842                     │       │
│  └─────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────┘
```

---

### Musician Profile

```
┌─────────────────────────────────────────────────────┐
│                  Profile Header                      │
│  ┌────┐                                              │
│  │ 🖼️ │  Jane Artist                                │
│  └────┘  @janeartist [🎵 Musician]                  │
│          "Singer/Songwriter 🎵"                      │
│          [Follow] [Message] [Book] [Stats]           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              Quick Actions Row                       │
│      [▶️ Play] [🎤 Shows] [👕 Merch]                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                 Section Tabs                         │
│ [Info] [🎵 Music] [🎬 Videos] [🎤 Shows]           │
│ [👕 Merch] [📰 Feed] [📸 Photos]                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  Tab Content                         │
│  (Selected tab content shows here)                   │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 Color Palette

### Profile Type Colors

| Type      | Primary Color | Background (Light) | Background (Dark) | Emoji |
|-----------|---------------|-------------------|-------------------|-------|
| Streamer  | #EF4444 (Red) | rgba(239,68,68,0.12) | rgba(239,68,68,0.2) | 📺 |
| Musician  | #8B5CF6 (Purple) | rgba(139,92,246,0.12) | rgba(139,92,246,0.2) | 🎵 |
| Comedian  | #F59E0B (Amber) | rgba(245,158,11,0.12) | rgba(245,158,11,0.2) | 🎭 |
| Business  | #0EA5E9 (Sky) | rgba(14,165,233,0.12) | rgba(14,165,233,0.2) | 💼 |
| Creator   | #EC4899 (Pink) | rgba(236,72,153,0.12) | rgba(236,72,153,0.2) | ✨ |
| Default   | #6B7280 (Gray) | rgba(107,116,128,0.12) | rgba(107,116,128,0.2) | 👤 |

---

## 📐 Component Sizing

### Badge
- **Height**: 24px (py-1)
- **Padding**: 10px horizontal (px-2.5)
- **Font Size**: 12px (text-xs)
- **Border Radius**: 9999px (rounded-full)

### Quick Action Button
- **Icon Container**: 48px × 48px (w-12 h-12)
- **Border Radius**: 12px (rounded-xl)
- **Padding**: 12px horizontal, 8px vertical
- **Font Size**: 12px (text-xs)
- **Min Width**: 80px

### Section Tab
- **Height**: Auto
- **Padding**: 16px horizontal, 10px vertical
- **Font Size**: 13px
- **Border Radius**: 20px (rounded-full)
- **Border**: 2px solid (active), transparent (inactive)
- **Min Width**: 80px

---

## 🎭 State Variations

### Badge States
- **Default**: Normal opacity, colored background
- **Hover**: (No hover state - static element)

### Quick Action States
- **Default**: Normal state with colored icon container
- **Hover**: opacity-80, scale-105
- **Active**: scale-95

### Tab States
- **Inactive**: 
  - Light background: rgba(139,92,246,0.05)
  - No border
  - Secondary text color
- **Active**: 
  - Colored background: {accentColor}18
  - Colored border: accentColor
  - Colored text: accentColor
  - Shadow: md
  - Scale: 105%

---

## 📱 Responsive Behavior

### Desktop (≥768px)
- Badge: Regular size
- Quick Actions: Row layout, centered
- Tabs: Scrollable if needed, no wrap
- All labels visible

### Tablet (640-767px)
- Badge: Regular size
- Quick Actions: Row layout, may wrap
- Tabs: Scrollable
- Labels visible

### Mobile (<640px)
- Badge: Slightly smaller text
- Quick Actions: May stack or scroll
- Tabs: Horizontal scroll
- Some labels may be abbreviated

---

## 🌓 Dark Mode

All components automatically adapt to dark mode:
- Badge backgrounds become more opaque
- Quick action containers adjust opacity
- Tab backgrounds and borders adjust
- Text colors invert appropriately
- Shadows adjust for visibility

---

## ✨ Animation & Transitions

### Badge
- No animations (static element)

### Quick Actions
- **Hover**: Scale 1.05, opacity 0.8 (200ms ease)
- **Active**: Scale 0.95 (200ms ease)

### Tabs
- **Hover**: Opacity 0.7, scale 1.02 (200ms ease)
- **Active**: Scale 1.05 (200ms ease)
- **Tab Switch**: Content fade-in (optional)

---

## 🔍 Accessibility

### Badge
- Semantic HTML
- Color contrast meets WCAG AA
- Text readable at all sizes

### Quick Actions
- Buttons with proper labels
- Keyboard accessible
- Focus indicators
- Screen reader friendly

### Tabs
- ARIA roles (optional enhancement)
- Keyboard navigation (arrow keys recommended)
- Focus management
- Active state indicators

---

## 🎯 Best Practices

### Usage Guidelines
1. **Always show badge** if profile_type is set
2. **Show quick actions** only for non-default types
3. **Always show tabs** (at minimum: Info, Feed, Photos)
4. **Respect user preferences** for accent color
5. **Maintain consistency** with rest of profile design

### Don'ts
- ❌ Don't show quick actions for default type
- ❌ Don't hide badge (unless profile_type is default or null)
- ❌ Don't override accent colors
- ❌ Don't remove essential tabs (Info always needed)
- ❌ Don't break responsive layout

### Do's
- ✅ Default to 'default' type if profile_type is null
- ✅ Use placeholder actions until features are built
- ✅ Keep badge inline with username
- ✅ Make tabs scrollable on mobile
- ✅ Use type-specific colors consistently

---

## 📊 Component Hierarchy

```
ModernProfilePage
├── ProfileHeader
│   ├── Avatar
│   ├── DisplayName
│   ├── Username + ProfileTypeBadge ← NEW
│   ├── Bio
│   └── ActionButtons
├── ProfileQuickActionsRow ← NEW (conditional)
├── ProfileSectionTabs ← NEW
└── TabContent (conditional render)
    ├── InfoTab (default selected)
    ├── TypeSpecificTabs
    ├── FeedTab
    └── PhotosTab
```

---

## 🎬 User Flow

1. User lands on profile page
2. **Badge appears** next to username (if profile has type)
3. **Quick actions show** below header (if not default type)
4. **Section tabs appear** with type-specific options
5. User clicks tab → Content switches
6. User clicks quick action → Modal/alert appears
7. All interactions are smooth and responsive

---

## 🔗 Related Components

### Existing Components Used
- `ModernLinksSection` - For links display
- `SocialCountsWidget` - For follower counts
- `TopSupportersWidget` - For supporter list
- `TopStreamersWidget` - For streamer list
- `StatsCard` - For statistics
- `SocialMediaBar` - For social links

### New Components
- `ProfileTypeBadge` - Type indicator
- `ProfileQuickActionsRow` - Action buttons
- `ProfileSectionTabs` - Tab navigation

---

## 📚 References

- Mobile implementation: `mobile/components/Profile*.tsx`
- Type definitions: `PROFILE_TYPE_VISUAL_COMPARISON.md`
- Architecture: `PROFILE_TYPE_ARCHITECTURE.md`
- Testing: `PROFILE_TYPE_TESTING_GUIDE.md`

---

## 🎉 Complete!

This visual guide documents all the UI components, layouts, colors, and behaviors for the web profile type system. Use this as a reference for design decisions, troubleshooting, or future enhancements.

