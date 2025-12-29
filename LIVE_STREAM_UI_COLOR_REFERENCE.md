# 🎨 LIVE STREAM UI — BRAND COLOR QUICK REFERENCE

## APPROVED COLOR PALETTE

### Primary States:
```tsx
// Default/Idle Icons
const DEFAULT_ICON = "#ffffff";  // White

// Featured/Active Action
const FEATURED_ICON = "#a855f7";  // Brand Purple

// Live/Broadcasting Indicator
const LIVE_INDICATOR = "#ef4444";  // Brand Red

// Destructive Actions
const DESTRUCTIVE = "#ef4444";  // Brand Red
```

---

## ICON COLOR RULES

### ✅ WHEN TO USE EACH COLOR:

#### WHITE (`#ffffff`):
- **Usage:** Default state for all utility icons
- **Examples:** Settings, PiP, Mixer, Share, Volume, Menu
- **Principle:** Neutral, functional, non-distracting

#### PURPLE (`#a855f7`):
- **Usage:** Featured or primary actions that should stand out
- **Examples:** Gift button, Premium features
- **Principle:** Brand emphasis, intentional focus

#### RED (`#ef4444`):
- **Usage:** Live indicators, broadcasting state, stop/end actions
- **Examples:** Live camera icon, Stop streaming, End call
- **Principle:** State communication, urgency

---

## MOBILE LIVE SCREEN ICON REFERENCE

### File: `mobile/screens/LiveRoomScreen.tsx`

```tsx
// LEFT COLUMN
<Ionicons name="arrow-back" size={28} color="#4a9eff" />      // Back (blue, system)
<Ionicons name="color-wand" size={26} color="#ffffff" />      // Filter (white)
<Ionicons 
  name="videocam" 
  size={26} 
  color={isLive ? "#ef4444" : "#ffffff"}                       // Camera (white/red)
/>

// RIGHT COLUMN
<Ionicons name="settings-sharp" size={26} color="#ffffff" />  // Options (white)
<Ionicons name="gift" size={26} color="#a855f7" />           // Gift (purple)
<Ionicons name="contract" size={26} color="#ffffff" />       // PiP (white)
<Ionicons name="options" size={26} color="#ffffff" />        // Mixer (white)
<Ionicons name="share-outline" size={26} color="#ffffff" />  // Share (white)
```

---

## 🚫 FORBIDDEN COLORS (DO NOT USE)

### Previously Used (Now Removed):
```tsx
"#fbbf24"  // Yellow — REMOVED
"#ff6b9d"  // Pink — REMOVED
"#a78bfa"  // Light Purple — REMOVED (use #a855f7 instead)
"#10b981"  // Green 1 — REMOVED
"#34d399"  // Green 2 — REMOVED
```

### Why Removed:
- ❌ No brand association
- ❌ Creates visual noise
- ❌ "Random color" vibes
- ❌ Inconsistent with professional broadcast UI

---

## ICON SIZING STANDARDS

```tsx
// Standard Icons (Mobile)
size={26}  // Default for all action icons

// Special Cases
size={28}  // Back/Navigation (slightly larger for emphasis)
size={20}  // DEPRECATED — old Go Live icon size (DO NOT USE)

// Touch Targets (All Buttons)
width: 48
height: 48
```

---

## STATE-BASED COLOR EXAMPLES

### Go Live Button:
```tsx
// State 1: Not Live
<Ionicons name="videocam" size={26} color="#ffffff" />

// State 2: Broadcasting
<Ionicons name="videocam" size={26} color="#ef4444" />
```

### Volume/Mute:
```tsx
// State 1: Unmuted
<Ionicons name="volume-high" size={26} color="#ffffff" />

// State 2: Muted
<Ionicons name="volume-mute" size={26} color="#ef4444" />  // Red for "off"
```

### Generic Toggle:
```tsx
// State 1: Inactive
<Ionicons name="icon-name" size={26} color="#ffffff" />

// State 2: Active/Enabled
<Ionicons name="icon-name" size={26} color="#a855f7" />  // Purple for "on"
```

---

## ADDING NEW ICONS — CHECKLIST

When adding a new icon to the live stream UI:

- [ ] Is this a default utility icon? → Use `#ffffff`
- [ ] Is this a featured action? → Use `#a855f7`
- [ ] Does it indicate live/broadcast state? → Use `#ef4444`
- [ ] Is it destructive (stop/delete)? → Use `#ef4444`
- [ ] Does it have multiple states? → White (default), Purple/Red (active)
- [ ] Is the size `26` (or `28` for navigation)?
- [ ] Is the touch target `48x48`?
- [ ] Does it follow the brand color system?

---

## AVOID THESE COMMON MISTAKES

### ❌ DON'T:
```tsx
// Random one-off color per icon
<Ionicons name="settings" color="#fbbf24" />  // Yellow
<Ionicons name="gift" color="#ff6b9d" />      // Pink
<Ionicons name="share" color="#34d399" />     // Green

// Inconsistent sizing
<Ionicons name="icon1" size={20} />
<Ionicons name="icon2" size={24} />
<Ionicons name="icon3" size={28} />
```

### ✅ DO:
```tsx
// Consistent sizing, state-based colors
<Ionicons name="settings" size={26} color="#ffffff" />
<Ionicons name="gift" size={26} color="#a855f7" />
<Ionicons name="share" size={26} color="#ffffff" />
```

---

## WEB vs MOBILE CONSISTENCY

### Mobile (React Native):
```tsx
<Ionicons name="videocam" size={26} color="#ffffff" />
```

### Web (Tailwind):
```tsx
<svg className="w-6 h-6 text-white" />
// Equivalent to size={24} in RN
// Use text-white, text-purple-600, text-red-500
```

### Color Mapping (Web):
```tsx
text-white      →  #ffffff  (default)
text-purple-600 →  #a855f7  (featured)
text-red-500    →  #ef4444  (live/destructive)
```

---

## TESTING GUIDE

### Visual Verification:
1. **Open Mobile Live Screen (landscape)**
2. **Check Right Column:**
   - Options: White ✅
   - Gift: Purple ✅
   - PiP: White ✅
   - Mixer: White ✅
   - Share: White ✅
3. **Check Left Column:**
   - Filter: White ✅
   - Camera (not live): White ✅
   - Camera (live): Red ✅

### Color Accuracy:
- Use color picker to verify exact hex values
- Test on multiple devices (OLED vs LCD)
- Check in light/dark environments

---

## FUTURE ADDITIONS

### When Adding Filters Feature:
```tsx
// Filter button already in place:
<Ionicons name="color-wand" size={26} color="#ffffff" />

// When active:
<Ionicons name="color-wand" size={26} color="#a855f7" />  // Purple = enabled
```

### When Adding Chat Button:
```tsx
// Default (no new messages):
<Ionicons name="chatbubble-outline" size={26} color="#ffffff" />

// With notification indicator:
<View>
  <Ionicons name="chatbubble" size={26} color="#a855f7" />
  <Badge count={5} />  // Use brand purple for badge
</View>
```

---

## COMMIT REFERENCE

Original enforcement commit:
```
🎨 Enforce brand colors on live stream UI + redesign Go Live button

Files: mobile/screens/LiveRoomScreen.tsx
Date: December 28, 2025
```

---

## CONTACT / QUESTIONS

If you need to add a new icon or are unsure which color to use:

1. **Check this guide first**
2. **Default to white** (`#ffffff`) unless there's a specific reason
3. **Use purple** (`#a855f7`) sparingly for featured actions
4. **Use red** (`#ef4444`) only for live/broadcasting/destructive states

**When in doubt:** White is always safe.

---

✅ **Keep this file updated** when adding new icons or UI elements to the live stream screen.

