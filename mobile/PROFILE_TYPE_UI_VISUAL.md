# Profile Type UI — Visual Reference

## 📱 Edit Profile Screen

```
┌─────────────────────────────────┐
│  ← Back      Edit Profile       │
├─────────────────────────────────┤
│                                 │
│  USERNAME                       │
│  @johnsmith                     │
│                                 │
│  DISPLAY NAME                   │
│  ┌───────────────────────────┐ │
│  │ John Smith                │ │
│  └───────────────────────────┘ │
│                                 │
│  BIO                            │
│  ┌───────────────────────────┐ │
│  │ Content creator...        │ │
│  │                           │ │
│  │                           │ │
│  └───────────────────────────┘ │
│                                 │
│  PROFILE TYPE                   │
│  ┌───────────────────────────┐ │
│  │ Creator               ›   │ │ ← NEW: Tappable row
│  └───────────────────────────┘ │
│  ⚠️ Changing type may hide/    │ ← Warning text
│     show sections. Nothing is  │
│     deleted.                   │
│                                 │
│  ┌───────────────────────────┐ │
│  │         Save              │ │
│  └───────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

---

## 🎯 Profile Type Picker Modal

```
┌─────────────────────────────────┐
│                                 │
│   ╔═══════════════════════════╗ │
│   ║ Choose Profile Type    ✕  ║ │
│   ╠═══════════════════════════╣ │
│   ║                           ║ │
│   ║ ┏━━━━━━━━━━━━━━━━━━━━━━┓ ║ │
│   ║ ┃ 📡  Streamer         ┃ ║ │
│   ║ ┃     Live streaming   ┃ ║ │
│   ║ ┃     and broadcasting ┃ ║ │
│   ║ ┗━━━━━━━━━━━━━━━━━━━━━━┛ ║ │
│   ║                           ║ │
│   ║ ┏━━━━━━━━━━━━━━━━━━━━━━┓ ║ │
│   ║ ┃ 🎵  Musician / Artist┃ ║ │
│   ║ ┃     Music performances┃ ║ │
│   ║ ┃     and creative arts ┃ ║ │
│   ║ ┗━━━━━━━━━━━━━━━━━━━━━━┛ ║ │
│   ║                           ║ │
│   ║ ┏━━━━━━━━━━━━━━━━━━━━━━┓ ║ │
│   ║ ┃ 🎭  Comedian         ┃ ║ │
│   ║ ┃     Comedy shows and ┃ ║ │
│   ║ ┃     entertainment    ┃ ║ │
│   ║ ┗━━━━━━━━━━━━━━━━━━━━━━┛ ║ │
│   ║                           ║ │
│   ║ ┏━━━━━━━━━━━━━━━━━━━━━━┓ ║ │
│   ║ ┃ 💼  Business / Brand ┃ ║ │
│   ║ ┃     Professional and ┃ ║ │
│   ║ ┃     corporate        ┃ ║ │
│   ║ ┗━━━━━━━━━━━━━━━━━━━━━━┛ ║ │
│   ║                           ║ │
│   ║ ┏━━━━━━━━━━━━━━━━━━━━━━┓ ║ │
│   ║ ┃ ✨  Creator      ✓   ┃ ║ │ ← Selected (checkmark)
│   ║ ┃     General content  ┃ ║ │
│   ║ ┃     creation         ┃ ║ │
│   ║ ┗━━━━━━━━━━━━━━━━━━━━━━┛ ║ │
│   ║                           ║ │
│   ╠═══════════════════════════╣ │
│   ║ ┌───────────────────────┐ ║ │
│   ║ │     Continue          │ ║ │ ← Primary action
│   ║ └───────────────────────┘ ║ │
│   ║                           ║ │
│   ║    Skip for now           ║ │ ← Secondary (if enabled)
│   ║                           ║ │
│   ╚═══════════════════════════╝ │
│                                 │
└─────────────────────────────────┘
```

---

## 🎨 Visual States

### Unselected Card
```
┌─────────────────────────────────┐
│ 📡  Streamer                    │
│     Live streaming and          │
│     broadcasting content        │
└─────────────────────────────────┘
  ↑
  Regular border (subtle)
```

### Selected Card
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✨  Creator                  ✓ ┃
┃     General content           ┃
┃     creation                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  ↑                              ↑
  Accent border                  Checkmark badge
  (purple/blue)                  (accent color)
```

### Pressed State
```
┌─────────────────────────────────┐
│ 🎵  Musician / Artist           │  ← Slightly dimmed
│     Music performances and      │  ← Scale: 0.98
│     creative arts               │
└─────────────────────────────────┘
```

---

## 🌗 Theme Support

### Dark Mode
- Background: Dark surface modal
- Cards: Subtle white overlay
- Selected: Purple accent with increased opacity
- Text: Light primary colors
- Borders: White with transparency

### Light Mode
- Background: White surface
- Cards: Clean white cards
- Selected: Light purple tint
- Text: Dark primary colors
- Borders: Dark with transparency

---

## 📐 Layout Specs

### Modal Dimensions
- Max height: 85% of screen
- Padding: 20px around modal
- Border radius: 18px
- Shadow/elevation: Modal level

### Card Specs
- Padding: 16px
- Border radius: 14px
- Border width: 2px (selected), 1px (unselected)
- Gap between cards: 12px

### Typography
- Header title: 18px, weight 800
- Card title: 15px, weight 700
- Card description: 13px, weight 400, line height 18px
- Icon size: 32px
- Chevron: 24px

### Buttons
- Continue height: 48px
- Border radius: 14px
- Font: 16px, weight 700

---

## 🎯 Interactive Hotspots

1. **Profile Type Row** → Opens modal
2. **Type Card** → Selects that type
3. **Continue Button** → Confirms and closes
4. **Skip Button** → Sets Creator and closes
5. **Close Button (✕)** → Dismisses modal
6. **Backdrop** → Dismisses modal

---

## 🔄 User Flow

```
Edit Profile Screen
        ↓
   Tap "Profile Type" row
        ↓
   Modal opens (centered)
        ↓
   Tap desired profile type card
        ↓
   Card highlights (purple border + checkmark)
        ↓
   Tap "Continue"
        ↓
   Modal closes
        ↓
   Profile Type row updates
        ↓
   Tap "Save" to persist
```

---

## 💡 Design Highlights

✨ **Icon-First Design**: Large emoji icons for quick visual scanning  
✨ **Single Column**: Easy thumb-reach on mobile  
✨ **Clear Selection**: Accent border + checkmark = obvious feedback  
✨ **Warning Text**: Amber color draws attention to important info  
✨ **Smooth Animations**: Fade-in modal, scale-down on press  
✨ **Accessible**: Large touch targets, clear labels  

---

## 📱 Device Compatibility

- ✅ iPhone (all sizes)
- ✅ iPad (scales appropriately)
- ✅ Android phones
- ✅ Android tablets
- ✅ Works in both portrait and landscape

---

## 🎨 Color Palette

### Accent Colors
- Primary accent: `#8B5CF6` (purple)
- Secondary accent: `#5E9BFF` (blue)
- Success: `#16A34A` (green)
- Warning: `#f59e0b` (amber)
- Danger: `#EF4444` (red)

### Text Colors (Dark Mode)
- Primary: `#E5E7EB` (light gray)
- Secondary: `#CBD5E1` (medium gray)
- Muted: `#94A3B8` (dark gray)

### Text Colors (Light Mode)
- Primary: `#0F172A` (dark slate)
- Secondary: `#334155` (slate)
- Muted: `#6B7280` (gray)

---

**End of Visual Reference**



