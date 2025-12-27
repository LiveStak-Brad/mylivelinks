# ✅ MOBILE LIVEROOM - LOCKED SPEC v2 COMPLETE

## 📋 IMPLEMENTATION SUMMARY

### ✅ **1. BOTTOM NAV REMOVED**
- LiveRoom renders full screen
- No bottom tab bar visible
- No reserved space
- Bottom nav returns when exiting

### ✅ **2. CAMERA GRID BETWEEN COLUMNS**
**Layout:** `[LEFT COLUMN] [CAMERA GRID] [RIGHT COLUMN]`
- LEFT: 80px fixed width
- RIGHT: 80px fixed width
- CAMERA: `flex: 1` (fills remaining space)
- Cameras NEVER covered by buttons

### ✅ **3. VECTOR-STYLE BUTTONS (No containers)**
- ❌ NO circles
- ❌ NO backgrounds
- ❌ NO boxed UI
- ✅ Clean icon + label
- ✅ Distinct colors per button

### ✅ **4. GO LIVE - ONLY CIRCULAR BUTTON**
- 🔴 Red filled circle (64×64)
- "GO LIVE" text inside
- White dot indicator (hollow/solid states)
- Positioned: **Bottom Left**
- Subtle red glow

### ✅ **5. BUTTON PLACEMENT**

**LEFT COLUMN (Bottom):**
- 🔴 **GO LIVE** (bottom left)

**RIGHT COLUMN (Top to Bottom):**
- ← **Back** (blue #4a9eff) - TOP RIGHT
- 🎁 **Gift** (pink #ff6b9d)
- **PiP** (purple #9d50ff) - Text style
- ↗ **Share** (cyan #50d9ff)

### ✅ **6. SWIPE GESTURES**
- ✅ Swipe UP → Chat
- ✅ Swipe DOWN → Viewers/Leaderboards
- ✅ Swipe LEFT → Stats
- ✅ Swipe RIGHT → Options
- ✅ Overlays slide over (no unmount)

### ✅ **7. SCREEN STAYS AWAKE**
- ✅ `useKeepAwake()` hook added
- ✅ Prevents black screensaver
- ✅ Active during entire LiveRoom session

### ✅ **8. CAMERA PRIORITY**
- ✅ 0 padding
- ✅ 0 margins
- ✅ Hairline dividers only
- ✅ Fills space between columns

---

## 📁 FILES CHANGED

### 1. **`mobile/package.json`**
```json
"expo-keep-awake": "~12.8.2"
```

### 2. **`mobile/screens/LiveRoomScreen.tsx`**

#### Added Imports:
```typescript
import { useKeepAwake } from 'expo-keep-awake';
```

#### Keep Awake:
```typescript
useKeepAwake(); // Prevents screen timeout
```

#### New Layout Structure:
```tsx
<View style={styles.container}>
  {/* LEFT COLUMN */}
  <View style={styles.leftColumn}>
    <View style={styles.spacer} />
    <TouchableOpacity style={styles.goLiveButton}>
      <View style={styles.goLiveDot} />
      <Text style={styles.goLiveText}>GO{'\n'}LIVE</Text>
    </TouchableOpacity>
  </View>

  {/* CAMERA GRID */}
  <View style={styles.cameraGrid}>
    <Grid12 {...props} />
  </View>

  {/* RIGHT COLUMN */}
  <View style={styles.rightColumn}>
    <TouchableOpacity onPress={handleExitLive}>
      <Text style={{ color: '#4a9eff' }}>←</Text>
      <Text style={{ color: '#4a9eff' }}>Back</Text>
    </TouchableOpacity>
    <View style={styles.spacer} />
    <TouchableOpacity>
      <Text style={{ color: '#ff6b9d' }}>🎁</Text>
      <Text style={{ color: '#ff6b9d' }}>Gift</Text>
    </TouchableOpacity>
    <TouchableOpacity>
      <Text style={{ color: '#9d50ff' }}>PiP</Text>
    </TouchableOpacity>
    <TouchableOpacity>
      <Text style={{ color: '#50d9ff' }}>↗</Text>
      <Text style={{ color: '#50d9ff' }}>Share</Text>
    </TouchableOpacity>
  </View>
</View>
```

#### New Styles:
```typescript
container: {
  flex: 1,
  flexDirection: 'row', // [LEFT] [CAMERA] [RIGHT]
},

leftColumn: {
  width: 80,
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  justifyContent: 'flex-end', // GO LIVE at bottom
},

rightColumn: {
  width: 80,
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  justifyContent: 'flex-start', // Back at top
  gap: 24,
},

cameraGrid: {
  flex: 1, // Fills remaining space
},

goLiveButton: {
  width: 64,
  height: 64,
  borderRadius: 32, // ONLY circular button
  backgroundColor: '#ff3366',
  shadowColor: '#ff3366',
  shadowOpacity: 0.8,
},

vectorButton: {
  // NO container, NO background
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 48,
  minWidth: 48,
},

vectorIcon: {
  fontSize: 28, // Clean vector style
},

vectorLabel: {
  fontSize: 10,
  fontWeight: '700',
},
```

---

## 🔨 BUILD INSTRUCTIONS

```bash
cd mobile
npx expo install expo-keep-awake
eas build --profile preview --platform ios --clear-cache
```

---

## 🧪 VERIFICATION CHECKLIST

### ✅ Bottom Nav
- [ ] Bottom tab bar NOT visible in LiveRoom
- [ ] Bottom tab bar returns when exiting

### ✅ Layout
- [ ] Camera grid fills space BETWEEN columns
- [ ] LEFT column: 80px width
- [ ] RIGHT column: 80px width
- [ ] Cameras NOT covered by buttons

### ✅ Buttons
- [ ] GO LIVE: circular, red, bottom left
- [ ] Back: vector icon, blue, TOP RIGHT
- [ ] Gift: vector icon, pink
- [ ] PiP: text style, purple
- [ ] Share: vector icon, cyan
- [ ] NO other circular buttons

### ✅ Screen Awake
- [ ] Screen stays on during entire session
- [ ] No black screensaver
- [ ] No timeout

### ✅ Swipes
- [ ] Swipe UP → Chat
- [ ] Swipe DOWN → Viewers
- [ ] Swipe LEFT → Stats
- [ ] Swipe RIGHT → Options

---

## 📸 VISUAL VERIFICATION

**Expected Layout:**
```
┌────────┬──────────────────────────┬────────┐
│        │                          │  ←     │ ← Back (blue)
│        │                          │  Back  │
│        │                          │        │
│        │      CAMERA GRID         │  🎁    │ ← Gift (pink)
│        │                          │  Gift  │
│        │                          │        │
│        │                          │  PiP   │ ← PiP (purple)
│        │                          │        │
│  🔴    │                          │  ↗     │ ← Share (cyan)
│ GO     │                          │  Share │
│ LIVE   │                          │        │
└────────┴──────────────────────────┴────────┘
  LEFT           CAMERA               RIGHT
  80px           flex:1               80px
```

---

## ✅ STATUS: READY FOR BUILD

**Dependencies added:** `expo-keep-awake`  
**Linter errors:** None  
**Files changed:** 2  
**Build required:** YES

---

**Date:** Dec 27, 2025  
**Spec version:** v2 (LOCKED)

