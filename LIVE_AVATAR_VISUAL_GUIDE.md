# Live Avatar Indicator - Visual Guide

## 🎨 Component States

### 1. Regular Avatar (Not Live)
```
┌─────────────┐
│   ╭─────╮   │
│  │  👤  │   │  ← Normal avatar
│   ╰─────╯   │     with subtle white ring
└─────────────┘
```

### 2. Live Avatar (Pulsing Red Ring)
```
┌─────────────┐
│ ╔═══════╗   │
│ ║ ╭───╮ ║   │  ← Outer pulsing ring (red)
│ ║ │ 👤│ ║   │  ← Inner red ring (6px)
│ ║ ╰───╯ ║   │  ← Avatar
│ ╚═══════╝   │
│     🔴LIVE  │  ← Badge (optional)
└─────────────┘
```

## 📐 Size Variants

| Size | Pixels | Usage |
|------|--------|-------|
| `xs` | 24×24 | Compact lists, inline mentions |
| `sm` | 32×32 | Chat messages, viewer list |
| `md` | 40×40 | User menu, cards |
| `lg` | 48×48 | Profile headers |
| `xl` | 64×64 | Large profile displays |

## 🎯 Click Behavior by Context

### Profile Page Hero
```
┌────────────────────────────────┐
│  ╔════════╗                    │
│  ║  👤   ║  Username           │ ← Clickable avatar
│  ║ LIVE  ║  @username          │    navigates to /live/username
│  ╚════════╝                    │
│  [Follow] [Message] [Share]    │
└────────────────────────────────┘
```

### Chat Message
```
┌────────────────────────────────┐
│ ╔═══╗ Username  2:30 PM        │
│ ║👤 ║ This is my message...    │ ← Avatar clickable
│ ╚═══╝                          │    navigates to /live/username
└────────────────────────────────┘
```

### Viewer List
```
┌────────────────┐
│ Viewers (12)   │
├────────────────┤
│ ╔═══╗ User1    │ ← Live user avatar (clickable)
│ ╚═══╝          │    navigates to /live/user1
│                │
│ 📹 User2       │ ← Webcam icon (actively streaming)
│                │    draggable to grid
│                │
│ ╭─╮ User3      │ ← Regular avatar (not live)
│ ╰─╯            │    shows profile on click
└────────────────┘
```

### User Menu (Top Nav)
```
┌─────────────────────────────────┐
│  [Logo]         ╔═══╗ ▼         │ ← Live indicator on own avatar
│                 ║👤 ║            │    (not clickable - opens menu)
│                 ╚═══╝            │
└─────────────────────────────────┘
```

## 🎭 Animation Sequence

### Red Ring Pulse Animation
```
Frame 1:  ╔═════╗   (100% opacity)
Frame 2:  ╔═════╗   (75% opacity)
Frame 3:  ╔═════╗   (50% opacity)
Frame 4:  ╔═════╗   (75% opacity)
Frame 1:  ╔═════╗   (100% opacity)
          ↻ Loop
```

### Hover Scale Effect
```
Normal:   ╔═════╗
          ║ 👤  ║   (scale: 1.0)
          ╚═════╝

Hover:    ╔═════╗
          ║ 👤  ║   (scale: 1.05)
          ╚═════╝
          ↑ Smooth transition
```

## 🎨 Color Specifications

### Live State Colors
```
Red Ring:      #ef4444  (Tailwind: red-500)
Ring Width:    6px
Ring Style:    solid

Badge BG:      #ef4444  (Tailwind: bg-red-500)
Badge Text:    #ffffff  (white)
Pulse Dot:     #ffffff  (white, animated)
```

### Normal State Colors
```
Ring:          rgba(255, 255, 255, 0.3)  (Tailwind: ring-white/30)
Ring Width:    2-4px depending on size
```

## 📱 Responsive Layout

### Desktop (lg+)
```
Profile Avatar:  128×128px  (w-32 h-32)
Ring Width:      6px
Badge Size:      text-xs
```

### Mobile (sm)
```
Profile Avatar:  96×96px   (w-24 h-24)
Ring Width:      4px
Badge Size:      text-[10px]
```

### Chat/Lists (all screens)
```
Avatar Size:     32×32px   (w-8 h-8)
Ring Width:      2-3px
Badge:           Hidden (showLiveBadge={false})
```

## 🔄 State Transitions

### User Goes Live
```
Before:          After:
╭─────╮    →    ╔═════╗
│ 👤  │         ║ 👤  ║
╰─────╯         ╚═════╝
                  🔴LIVE

Animation: Fade-in ring (200ms ease-out)
```

### User Ends Stream
```
Before:          After:
╔═════╗    →    ╭─────╮
║ 👤  ║         │ 👤  │
╚═════╝         ╰─────╯
  🔴LIVE

Animation: Fade-out ring (200ms ease-out)
```

## 🎯 Implementation Examples

### Basic Live Avatar
```tsx
<LiveAvatar
  avatarUrl="/path/to/avatar.jpg"
  username="johndoe"
  displayName="John Doe"
  isLive={true}
  size="md"
/>
```

### Chat Message Avatar (no badge)
```tsx
<LiveAvatar
  avatarUrl={msg.avatar_url}
  username={msg.username}
  isLive={msg.is_live}
  size="sm"
  showLiveBadge={false}  // Hide badge in tight spaces
/>
```

### Profile Hero (large, clickable)
```tsx
<LiveAvatar
  avatarUrl={profile.avatar_url}
  username={profile.username}
  displayName={profile.display_name}
  isLive={profile.is_live}
  size="xl"
  showLiveBadge={true}
  navigateToLive={true}  // Navigate to /live/username
/>
```

### Custom Click Handler
```tsx
<LiveAvatar
  avatarUrl={user.avatar_url}
  username={user.username}
  isLive={user.is_live}
  size="md"
  onClick={() => {
    // Custom action
    openUserProfile(user.id);
  }}
/>
```

## 🌟 Key Visual Principles

1. **Immediate Recognition**: Red = Live (universal standard)
2. **Pulsing Animation**: Draws attention without being distracting
3. **Clickable Affordance**: Hover effect indicates interactivity
4. **Consistent Size**: Same component, predictable behavior
5. **Subtle When Not Live**: Doesn't dominate when inactive
6. **Clear CTAs**: Badge text is short ("LIVE") and visible

## 🎬 User Journey

### Discovering Someone is Live
```
1. User scrolling feed/chat
   ↓
2. Notices red pulsing ring on avatar
   ↓
3. Recognizes "LIVE" badge (if shown)
   ↓
4. Hovers → cursor changes, avatar scales slightly
   ↓
5. Clicks → navigates to /live/username
   ↓
6. Instantly watching live stream
```

### Streamer Feedback
```
1. User starts stream
   ↓
2. Own avatar in top-right shows red ring
   ↓
3. Confirmation: "I'm live!"
   ↓
4. Continues streaming with visual indicator
```

## 📊 Component Hierarchy

```
App
├── UserMenu (top nav)
│   └── LiveAvatar (user's own avatar)
│
├── Profile Page
│   └── Hero
│       └── LiveAvatar (large, clickable when live)
│
├── Live Room
│   ├── Chat
│   │   └── Message[]
│   │       └── LiveAvatar (per message)
│   │
│   └── ViewerList
│       └── Viewer[]
│           ├── Webcam Icon (if publishing)
│           └── LiveAvatar (if not publishing)
│
└── Feed/Other Pages
    └── Various LiveAvatar instances
```

## ✨ Polish Details

### Shadow & Depth
```css
/* Avatar has subtle shadow */
shadow-lg

/* Badge has shadow for readability */
shadow-lg on badge

/* Ring has no shadow (prevents visual noise) */
```

### Transition Timing
```css
/* Hover scale */
transition-transform (default: 150ms ease-out)

/* Ring pulse */
animate-pulse (1.5s ease-in-out infinite)

/* State changes */
fade-in/out (200ms ease-out)
```

### Z-Index Layers
```
Base Avatar:     z-0
Inner Ring:      z-0 (part of avatar)
Outer Pulsing:   z-0 (behind inner ring)
Badge:           z-10 (on top)
```

---

**Result**: A polished, intuitive, and visually consistent live indicator system that works beautifully across all screen sizes and contexts! 🎉
