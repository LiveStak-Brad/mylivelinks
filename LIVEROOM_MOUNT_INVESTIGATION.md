# 🔍 Mobile LiveRoom Mount Investigation Report

**Date:** December 26, 2025  
**Status:** Investigation Complete — NO REBUILD NEEDED YET  
**Objective:** Prove LiveRoom is reachable and stays mounted in dev

---

## ✅ A) Debug Pill Added — LiveRoom Mount Tracker

### Implementation Complete:
**File Created:** `mobile/components/LiveRoomMountPill.tsx`

**Features:**
- ✅ Top-left debug pill (only visible in `__DEV__`)
- ✅ Shows `mountedAt` timestamp
- ✅ Shows `renderCount` (increments on each render)
- ✅ Shows `routeName` (current screen from navigation state)
- ✅ Shows `isFocused` (✅ Focused / ⚠️ Unfocused)
- ✅ Console logs on mount/unmount
- ✅ Console logs on focus changes

**Location in Code:**
```tsx
// mobile/screens/LiveRoomScreen.tsx
import { LiveRoomMountPill } from '../components/LiveRoomMountPill';

return (
  <GestureHandlerRootView style={styles.root}>
    {/* MOUNT DEBUG PILL - Always visible in __DEV__ */}
    <LiveRoomMountPill />
    ...
  </GestureHandlerRootView>
);
```

**What to Watch For:**
- If pill **disappears** → LiveRoom unmounted (BAD)
- If `renderCount` **spikes rapidly** (e.g., 100+ in seconds) → render loop (BAD)
- If `isFocused` becomes `⚠️ Unfocused` → navigation focus lost (INVESTIGATE)
- If console shows `[LIVEROOM_MOUNT] Unmounting!` → component being torn down (BAD)

---

## ✅ B) Navigation Structure — Confirmed NOT in PageShell

### Current Architecture:

```
Root Stack (App.tsx):
├─ Gate
├─ Auth
├─ CreateProfile
├─ MainTabs (Bottom Tab Navigator)
│  ├─ Home
│  ├─ Feed
│  ├─ Rooms ← RoomsScreen
│  │  └─ (Conditional Render)
│  │     ├─ Rooms List (with PageShell + bottom nav)
│  │     └─ LiveRoomScreen (WITHOUT PageShell, no bottom nav) ✅
│  ├─ Messages
│  └─ Noties
├─ Wallet
├─ EditProfile
└─ ... (other screens)
```

### LiveRoom Rendering Logic:

**File:** `mobile/screens/RoomsScreen.tsx`

```tsx
export function RoomsScreen({ navigation }: Props) {
  const [liveRoomEnabled, setLiveRoomEnabled] = useState(false);

  // CRITICAL: LiveRoom renders OUTSIDE PageShell
  if (liveRoomEnabled) {
    return (
      <LiveRoomScreen
        enabled={true}
        onExitLive={() => setLiveRoomEnabled(false)}
        onNavigateToRooms={() => setLiveRoomEnabled(false)}
        onNavigateWallet={() => {
          setLiveRoomEnabled(false);
          navigation.getParent()?.navigate('Wallet' as never);
        }}
      />
    );
  }

  // Rooms list view (with PageShell + bottom nav)
  return (
    <PageShell ...>
      <TouchableOpacity onPress={() => setLiveRoomEnabled(true)}>
        <Text>🔴 Enter Live Room</Text>
      </TouchableOpacity>
    </PageShell>
  );
}
```

### ✅ Verification:

| Requirement | Status | Evidence |
|-------------|--------|----------|
| LiveRoom NOT in PageShell | ✅ YES | Returns early, bypasses PageShell |
| Bottom nav hidden | ✅ YES | PageShell not rendered when `liveRoomEnabled=true` |
| LiveRoom pushed as own component | ✅ YES | Conditional render at RoomsScreen level |
| Bottom nav restores on exit | ✅ YES | `onExitLive()` sets `liveRoomEnabled=false` |

**Conclusion:** LiveRoom is correctly isolated from tab navigator chrome.

---

## ✅ C) Redirect Trigger Analysis — NO REDIRECTS FOUND

### Checked Files:

#### 1. **`mobile/screens/LiveRoomScreen.tsx`**
**Result:** ❌ NO NAVIGATION CALLS

```tsx
// Only 2 useEffect hooks:
1. Load user profile (line 46)
   - Does NOT navigate anywhere
   - Only sets local state: setCurrentUser()

2. Auto-exit focus if participant leaves (line 210)
   - Does NOT navigate anywhere
   - Only updates UI state: setFocusedIdentity(null)
```

**No `navigate()`, `router.push()`, or navigation redirects.**

---

#### 2. **`mobile/contexts/AuthContext.tsx`**
**Result:** ❌ NO NAVIGATION CALLS

```bash
grep result: No matches found for "navigate|router|Gate|Home"
```

**AuthContext does NOT trigger navigation.**

---

#### 3. **`mobile/screens/GateScreen.tsx`**
**Result:** ⚠️ HAS REDIRECT LOGIC (but only fires ONCE on app init)

```tsx
React.useEffect(() => {
  if (authLoading) return;

  let target: Target;

  if (!session) {
    target = 'Auth';
  } else if (profileLoading) {
    return;
  } else if (needsOnboarding || !isComplete) {
    target = 'CreateProfile';
  } else {
    target = 'MainTabs'; // ← Navigates to MainTabs (normal flow)
  }

  // GUARD: Only navigate if target changed
  if (lastTargetRef.current === target) return;
  lastTargetRef.current = target;

  navigation.reset({ index: 0, routes: [{ name: target }] });
}, [authLoading, isComplete, needsOnboarding, navigation, profileLoading, session]);
```

**Analysis:**
- ✅ This only fires **once** on app launch
- ✅ It navigates TO `MainTabs` (not AWAY from it)
- ✅ Has guard: `if (lastTargetRef.current === target) return;`
- ✅ Does NOT re-fire when already at MainTabs

**Conclusion:** GateScreen is NOT the issue.

---

#### 4. **`mobile/screens/RoomsScreen.tsx`**
**Result:** ❌ NO AUTOMATIC REDIRECTS

```tsx
// Only navigation calls are user-triggered:
- onNavigateHome={() => navigation.navigate('Home')} ← triggered by PageHeader (not auto)
- onNavigateToProfile(username) ← triggered by PageHeader (not auto)
```

**No auto-redirect logic. No "if no rooms live, go to Home" logic.**

---

#### 5. **`mobile/hooks/useLiveRoomParticipants.ts`**
**Result:** ❌ NO NAVIGATION CALLS

```tsx
// On LiveKit connection failure (line 354):
catch (error: any) {
  console.error('[ROOM] Connection error', error);
  isConnectingRef.current = false;
  hasConnectedRef.current = false;
  // NO navigation.navigate() call - just logs error
}
```

**LiveKit errors do NOT trigger navigation.**

---

#### 6. **`mobile/components/ui/PageShell.tsx` & `BottomNav.tsx`**
**Result:** ❌ NO AUTO-REDIRECTS

```bash
grep result: Only 1 navigation call:
  navigation.navigate(route as any); // User-triggered tab press only
```

**No watchdog effects in UI components.**

---

### 🔍 Summary — Redirect Triggers

| Potential Cause | Found? | Impact |
|-----------------|--------|--------|
| `if (!session) navigate('Home')` | ❌ NO | N/A |
| "Fallback route" in App.tsx | ❌ NO | N/A |
| "No rooms live" redirect | ❌ NO | N/A |
| LiveKit failure → navigate | ❌ NO | N/A |
| PageShell watchdog | ❌ NO | N/A |
| AuthContext redirect | ❌ NO | N/A |
| GateScreen re-fire | ⚠️ Guarded | Shouldn't re-fire |

**Conclusion:** ✅ **NO AUTOMATIC REDIRECT LOGIC FOUND**

---

## 📊 Expected Behavior in Dev (Expo Go / Dev Client)

### When You Tap "Enter Live Room":

1. **`RoomsScreen`** state changes: `setLiveRoomEnabled(true)`
2. **`RoomsScreen`** conditionally renders `<LiveRoomScreen />` (bypasses PageShell)
3. **Bottom nav disappears** (PageShell not rendered)
4. **LiveRoomMountPill appears** (top-left, blue border)
5. **Pill shows:**
   - `mountedAt: HH:MM:SS`
   - `Renders: 1` (or 2-3 initially, stabilizes quickly)
   - `Route: Rooms` (still technically on Rooms tab)
   - `✅ Focused`
6. **Console logs:**
   ```
   [LIVEROOM_MOUNT] Mounted at: HH:MM:SS
   [LIVEROOM_MOUNT] Focus changed: true
   [ROOM] useLiveRoomParticipants invoked
   [ROOM] Creating LiveKit Room instance
   ...
   ```

### If LiveRoom Stays Mounted (GOOD):

- ✅ Pill stays visible for 30+ seconds
- ✅ `Renders` count stays low (under 10)
- ✅ `✅ Focused` stays green
- ✅ No console log: `[LIVEROOM_MOUNT] Unmounting!`

### If LiveRoom Unmounts (BAD):

- ❌ Pill disappears after a few seconds
- ❌ Console shows: `[LIVEROOM_MOUNT] Unmounting! Rendered X times`
- ❌ Screen returns to Rooms list (or kicks to Home)

---

## 🧪 Test Plan — NO REBUILD YET

### Step 1: Run in Dev Mode
```bash
cd mobile
npm start
# Press 'i' for iOS simulator OR 'a' for Android emulator
```

### Step 2: Navigate to LiveRoom
1. Open app
2. Tap **Rooms** tab (bottom nav)
3. Tap **"🔴 Enter Live Room"** button
4. Watch **top-left for LiveRoomMountPill**

### Step 3: Observe for 30 Seconds
- [ ] Pill appears immediately (blue border, white text)
- [ ] `mountedAt` timestamp is frozen (e.g., `10:30:45`)
- [ ] `Renders` count is LOW (1-10, NOT 100+)
- [ ] `Route` shows `Rooms`
- [ ] `✅ Focused` is GREEN (not orange)
- [ ] Pill STAYS VISIBLE (does not disappear)

### Step 4: Check Console Logs
```
Expected:
  [LIVEROOM_MOUNT] Mounted at: 10:30:45
  [LIVEROOM_MOUNT] Focus changed: true
  [ROOM] useLiveRoomParticipants invoked
  [ROOM] Creating LiveKit Room instance

NOT expected:
  [LIVEROOM_MOUNT] Unmounting! Rendered 45 times ← BAD
```

### Step 5: Tap Back Button (LEFT side control)
- [ ] LiveRoom closes
- [ ] Returns to Rooms list
- [ ] Bottom nav reappears
- [ ] Console shows: `[LIVEROOM_MOUNT] Unmounting! Rendered X times` ← GOOD (expected on manual exit)

---

## 📝 Output Summary

### 1. ✅ Exact file where LiveRoom is registered:

**Navigation Registration:**
- `mobile/App.tsx` (line 61): `<Stack.Screen name="MainTabs" component={MainTabs} />`
- `mobile/navigation/MainTabs.tsx` (line 96): `<Tab.Screen name="Rooms" component={RoomsScreen} />`
- `mobile/screens/RoomsScreen.tsx` (line 18-34): Conditional render of `<LiveRoomScreen />`

**LiveRoom is NOT a stack screen. It's conditionally rendered INSIDE `RoomsScreen`.**

---

### 2. ✅ Exact code that opens it (Rooms → LiveRoom):

**File:** `mobile/screens/RoomsScreen.tsx` (line 57-63)

```tsx
<TouchableOpacity
  style={[styles.enterButton, { backgroundColor: theme.colors.accent }]}
  onPress={() => setLiveRoomEnabled(true)} // ← Opens LiveRoom
  activeOpacity={0.8}
>
  <Text style={styles.enterButtonText}>🔴 Enter Live Room</Text>
</TouchableOpacity>
```

**Trigger:** User taps button → `setLiveRoomEnabled(true)` → `RoomsScreen` returns `<LiveRoomScreen />`

---

### 3. ✅ Whether any session/watchdog effect can redirect:

**Result:** ❌ **NO SESSION WATCHDOG EFFECTS FOUND**

| Location | Effect Type | Triggers Navigation? |
|----------|-------------|---------------------|
| `LiveRoomScreen.tsx` | Load user profile | ❌ NO |
| `AuthContext.tsx` | Auth state change | ❌ NO |
| `GateScreen.tsx` | Initial auth routing | ⚠️ Once only (guarded) |
| `RoomsScreen.tsx` | UI interaction | ❌ NO (user-triggered only) |
| `useLiveRoomParticipants` | LiveKit error | ❌ NO |
| `PageShell` | Watchdog | ❌ NO |

**Conclusion:** No automatic redirect logic that would kick user out of LiveRoom.

---

### 4. 📸 Screenshot Requirement:

**I cannot provide a screenshot** (I'm an AI and can't run the app).

**You need to:**
1. Run `npm start` in `mobile/` folder
2. Open in simulator/emulator
3. Navigate: Rooms → Enter Live Room
4. Take screenshot showing **LiveRoomMountPill** (top-left) after 30 seconds
5. Verify pill is still visible and `Renders` count is low

---

## 🚫 Rules Followed

- ✅ Did NOT ask to rebuild
- ✅ Did NOT remove features
- ✅ Did NOT add "test mode" (used `__DEV__` flag)
- ✅ Did NOT move logic around
- ✅ DID add debug instrumentation (LiveRoomMountPill)
- ✅ DID trace exact navigation flow
- ✅ DID identify all potential redirect triggers (found NONE)

---

## 🎯 Next Steps

### If Pill Stays Visible (GOOD):
✅ LiveRoom is stable in dev  
✅ Proceed to EAS preview build  
✅ Test on physical device  

### If Pill Disappears (BAD):
❌ LiveRoom is unmounting unexpectedly  
❌ Check these additional causes:
1. React Native DevTools auto-reload (fast refresh killing component)
2. Expo Go memory pressure (force-killing background tabs)
3. Tab navigator internal state reset
4. RoomsScreen itself remounting (check parent)

### Debugging Commands:
```bash
# In console, check navigation state
console.log(navigation.getState());

# Check if RoomsScreen is remounting
Add console.log('[ROOMS] Rendering, liveRoomEnabled:', liveRoomEnabled);
to RoomsScreen.tsx line 12
```

---

## 📌 Summary

**LiveRoom Mount Stability:**
- ✅ Debug pill added (top-left, `__DEV__` only)
- ✅ Navigation structure confirmed correct (NOT in PageShell)
- ✅ NO automatic redirect logic found
- ⏳ Waiting for visual confirmation in dev

**Status:** Ready to test in dev — NO REBUILD NEEDED YET

**Once pill stays visible for 30+ seconds → proceed to EAS preview build**

