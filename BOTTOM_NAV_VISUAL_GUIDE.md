# Bottom Navigation - Visual Guide

## 📱 Mobile View (< 768px)

```
┌─────────────────────────────────────┐
│  [Logo]              [@] [≡]        │  ← Simplified Header
├─────────────────────────────────────┤
│                                     │
│                                     │
│          PAGE CONTENT               │
│                                     │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  🏠     📰     📹     💬●    🏆    │  ← Bottom Nav (NEW)
│ Home   Feed  Rooms  Messages Ranks │
│              [active]               │
└─────────────────────────────────────┘
```

## 🖥️ Desktop View (≥ 768px)

```
┌──────────────────────────────────────────────────────┐
│ [Logo]  Home  Feed  Rooms  🏆  💬  🔔  [@] [≡]     │  ← Full Header
├──────────────────────────────────────────────────────┤
│                                                      │
│                                                      │
│                  PAGE CONTENT                        │
│                                                      │
│                                                      │
│                                                      │
└──────────────────────────────────────────────────────┘
     (No Bottom Nav - All navigation in header)
```

---

## 🎨 Bottom Nav Tabs

### 1. Home Tab
```
  🏠
 Home
[Active: Purple]
[Inactive: Gray]
```
- Route: `/`
- Landing page with search & carousels
- Profile discovery

### 2. Feed Tab
```
  📰
 Feed
[Active: Purple]
[Inactive: Gray]
```
- Route: `/feed`
- Social feed/posts
- Community content

### 3. Rooms Tab
```
  📹
 Rooms
[Active: Purple]
[Inactive: Gray]
```
- Route: `/rooms` **[NEW PAGE]**
- Browse all live streaming rooms
- Live indicators & viewer counts
- Search & filter functionality

### 4. Messages Tab
```
  💬●
Messages
[Active: Purple]
[Inactive: Gray]
[Badge: Red dot with count]
```
- Route: `/messages` **[NEW PAGE]**
- Full conversations page
- Two-panel layout
- Real-time unread badges

### 5. Ranks Tab
```
  🏆
 Ranks
[Active: Purple]
[Inactive: Gray]
```
- Route: `/leaderboards` **[NEW PAGE]**
- Top gifters & earners
- Moved from modal to dedicated page

---

## 🎯 Active State Visualization

### Inactive Tab
```
┌─────────┐
│    📹   │  ← Icon (24px, gray)
│  Rooms  │  ← Label (10px, gray)
└─────────┘
   [Gray, small]
```

### Active Tab
```
┌─────────┐
│    📹   │  ← Icon (25px, purple, scaled 1.05)
│  Rooms  │  ← Label (10px, purple, bold)
└─────────┘
   [Purple, larger]
```

### Pressed State
```
┌─────────┐
│    📹   │  ← Scales to 0.95
│  Rooms  │  ← Slight muted background
└─────────┘
   [Feedback animation]
```

---

## 🔴 Badge System (Messages)

### No Unread Messages
```
  💬
Messages
  [No badge]
```

### With Unread Messages
```
  💬●
Messages
 [1-9: Shows number]
 [10-99: Shows number]
 [100+: Shows "99+"]
```

Badge Style:
- Background: Red (#EF4444)
- Text: White
- Border: 2px white border
- Position: Top-right of icon
- Animation: Pop-in (scale from 0)

---

## 📐 Layout Specifications

### Bottom Nav Container
```
Height: 68px + safe-area-inset-bottom
Width: 100vw (max 600px centered)
Background: bg-background/98 + blur
Border-top: 1px border
Shadow: Soft upward shadow
Z-index: 50
```

### Individual Tab
```
Width: 20% (1/5 of container)
Min-width: 60px
Padding: 8px 4px
Tap target: 60px+ height
Border-radius: 12px (on press)
```

### Spacing
```
Icon: 24×24px (w-6 h-6)
Gap between icon & label: 4px
Label font: 10px (0.625rem)
Grid columns: 5 equal
Grid gap: 2px horizontal
```

---

## 🎨 Color Palette

### Light Mode
- Active: `hsl(var(--primary))` → Purple (#8B5CF6)
- Inactive: `hsl(var(--muted-foreground))` → Gray
- Background: `hsl(var(--background)/0.98)` → White/98%
- Border: `hsl(var(--border)/0.5)` → Light gray

### Dark Mode
- Active: `hsl(var(--primary))` → Purple (#A78BFA)
- Inactive: `hsl(var(--muted-foreground))` → Light gray
- Background: `hsl(var(--background)/0.98)` → Dark/98%
- Border: `hsl(var(--border)/0.5)` → Dark gray

---

## 📱 Safe Area Insets

### iPhone X/11/12/13/14/15 Series
```
┌─────────────────────────────────────┐
│          Content Area               │
│                                     │
├─────────────────────────────────────┤
│  🏠     📰     📹     💬     🏆    │
│ Home   Feed  Rooms  Messages Ranks │
├─────────────────────────────────────┤
│ ▓▓▓ Home Indicator Area (34px) ▓▓▓ │  ← Safe area
└─────────────────────────────────────┘
```

Bottom Nav respects `env(safe-area-inset-bottom)` for:
- iPhone home indicator
- Android gesture bar
- Notched devices

---

## 🔄 Interaction States

### Tab Press Animation
```
Normal → Pressed → Released
 1.0  →   0.95   →   1.0
(200ms ease-out animation)
```

### Route Change Flow
```
1. User taps tab
2. Tab scales down (pressed)
3. Route navigation starts
4. Tab releases (scale back)
5. New route loads
6. Active state updates
7. Icon color changes to purple
8. Icon scales to 1.05
```

### Badge Update Flow
```
1. New message received
2. MessagesContext updates
3. Badge appears (pop-in animation)
4. Count displayed
5. User taps Messages tab
6. Navigate to /messages
7. User reads messages
8. Badge count decreases
9. Badge disappears when count = 0
```

---

## 📊 Responsive Breakpoints

| Breakpoint | Width | Bottom Nav | Header |
|------------|-------|------------|--------|
| Mobile     | < 640px | ✅ Visible | Simplified |
| Tablet     | 640-767px | ✅ Visible | Simplified |
| Desktop    | ≥ 768px | ❌ Hidden | Full |
| Large      | ≥ 1024px | ❌ Hidden | Full |

---

## 🎯 Touch Target Sizes

Following WCAG 2.1 Level AAA guidelines:

```
Minimum: 44px × 44px
Actual:  60px × 68px ✅

Icon:    24px × 24px
Padding: 18px all sides
Total:   60px × 68px (exceeds minimum)
```

---

## 🚀 Animation Timings

| Animation | Duration | Easing |
|-----------|----------|--------|
| Tab press | 200ms | ease-out |
| Color change | 200ms | ease-out |
| Badge pop-in | 200ms | ease-out |
| Route transition | 300ms | cubic-bezier |
| Icon scale | 200ms | ease-out |

---

## 📝 Code Examples

### Check if Bottom Nav is Visible
```typescript
// Bottom nav shows when screen < 768px
const showBottomNav = window.innerWidth < 768;
```

### Navigate to Rooms
```typescript
import { useRouter } from 'next/navigation';
const router = useRouter();
router.push('/rooms');
```

### Access Unread Count
```typescript
import { useMessages } from '@/components/messages';
const { totalUnreadCount } = useMessages();
```

---

## ✅ Accessibility Checklist

- [x] Proper ARIA labels on all tabs
- [x] `aria-current="page"` on active tab
- [x] Keyboard navigation support
- [x] Focus visible states
- [x] Touch targets > 44px
- [x] Color contrast ratios met
- [x] Screen reader announcements
- [x] Badge counts announced

---

## 🎨 Design System Integration

### Uses Existing Tokens
- ✅ Color system (primary, muted, foreground)
- ✅ Spacing scale (0.25rem increments)
- ✅ Border radius (0.75rem, 9999px)
- ✅ Typography (0.625rem labels)
- ✅ Shadow system (soft upward shadow)
- ✅ Z-index scale (50 for nav)
- ✅ Transition timings (200ms)

### Maintains Consistency
- ✅ Matches existing navigation patterns
- ✅ Same active states as header nav
- ✅ Same badge style as notifications
- ✅ Same press feedback as buttons
- ✅ Same color palette throughout

---

## 🎉 Ready to Use!

The bottom navigation is fully implemented and ready to test. Simply resize your browser to mobile width or open on a mobile device to see it in action!

**All 5 tabs are functional and navigate to their respective pages.**

