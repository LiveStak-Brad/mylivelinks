# CONNECTION STATE AUDIT - /live Room Lifecycle

## Executive Summary

**Critical Issues Found:**
1. **Streamers create SEPARATE room connection** - They don't use the shared room, causing dual connections
2. **Auto-fill only runs when NO saved layout exists** - Users with saved slots don't get auto-filled
3. **Reconnection loops from state dependencies** - Tile subscriptions re-run when streamers reload
4. **Tile switching timeout** - Heartbeat doesn't update fast enough when moving streamers into view

---

## 1. CONNECTION STATE DIAGRAM

### VIEWER Flow (Non-Streaming User)

```
idle
  ↓ [Page Load: /live]
connecting [LiveRoom.tsx:101-227 - connectSharedRoom()]
  ↓ [Room.connect() succeeds]
connected [LiveRoom.tsx:162-168 - handleConnected()]
  ↓ [Tile renders with isLive=true]
subscribing [Tile.tsx:81-155 - useEffect subscribes to tracks]
  ↓ [Track received]
subscribed [Tile.tsx:103-117 - handleTrackSubscribed()]
  ↓ [User closes tile OR streamer stops publishing]
unsubscribing [Tile.tsx:120-130 - handleTrackUnsubscribed()]
  ↓ [Cleanup]
connected [Still connected, just no tracks]
```

**Files:**
- `components/LiveRoom.tsx:100-227` - Shared room connection (viewers)
- `components/Tile.tsx:81-155` - Track subscription logic

### STREAMER Flow (Publishing User)

```
idle
  ↓ [User clicks "Go Live"]
connecting [useLiveKitPublisher.ts:163-430 - startPublishing()]
  ↓ [Room.connect() succeeds]
connected [useLiveKitPublisher.ts:183-199 - RoomEvent.Connected]
  ↓ [Tracks created]
publishing_on [useLiveKitPublisher.ts:263-277 - publishTrack()]
  ↓ [Watchers drop to 0 OR user clicks "Stop Live"]
publishing_off [useLiveKitPublisher.ts:433-416 - stopPublishing()]
  ↓ [Unpublish tracks, but stay connected]
connected [Room still connected, just not publishing]
  ↓ [User clicks "Stop Live" completely]
disconnecting [useLiveKitPublisher.ts:471-492 - disconnect()]
  ↓
idle
```

**Files:**
- `components/GoLiveButton.tsx:234-259` - Publisher hook setup
- `hooks/useLiveKitPublisher.ts:163-430` - Publishing connection
- `hooks/useLiveKitPublisher.ts:433-492` - Stop publishing/disconnect

### CRITICAL PROBLEM: Dual Room Connections

**When a streamer is ALSO viewing other streamers:**

```
Streamer has TWO separate room connections:
1. Publisher room: useLiveKitPublisher → 'live_central' (for publishing)
2. Viewer room: LiveRoom sharedRoom → 'live_central' (for viewing)

Both connect to same room name but are SEPARATE Room instances!
This causes:
- Double connection overhead
- Potential token conflicts
- Confusion about which connection to use
- Reconnection issues when one disconnects
```

**Files:**
- `components/LiveRoom.tsx:94-227` - Shared viewer room
- `hooks/useLiveKitPublisher.ts:163-430` - Separate publisher room
- `components/GoLiveButton.tsx:117` - Publisher uses same room name

---

## 2. WHERE RECONNECTION LOOPS HAPPEN

### Issue #1: Tile Subscription Effect Re-runs on Streamer Reload

**File:** `components/Tile.tsx:81-155`

**Problem:**
```typescript
useEffect(() => {
  // ... subscription logic ...
}, [sharedRoom, isRoomConnected, isLive, liveStreamId, streamerId]);
```

**Why it loops:**
1. `active_viewers` changes → triggers `loadLiveStreamers()` (LiveRoom.tsx:454)
2. `loadLiveStreamers()` updates `liveStreamers` state
3. Tile receives new `isLive` prop (from updated streamer data)
4. Tile's useEffect sees `isLive` changed → re-runs subscription
5. This causes unsubscribe → subscribe cycle even though nothing actually changed

**Fix:** Use refs to track actual subscription state, not props

---

### Issue #2: loadLiveStreamers Triggers loadUserGridLayout

**File:** `components/LiveRoom.tsx:405-467`

**Problem:**
```typescript
useEffect(() => {
  loadLiveStreamers().then(() => {
    loadUserGridLayout(); // This runs every time streamers reload
  });
  
  // Also triggers on live_streams changes
  channel.on('postgres_changes', { table: 'live_streams' }, () => {
    loadLiveStreamers().then(() => {
      loadUserGridLayout(); // Re-runs, potentially clearing tiles
    });
  });
}, [sortMode, mounted]);
```

**Why it loops:**
- Every `live_streams` update triggers full reload
- `loadUserGridLayout` can change `gridSlots`
- Tile components re-render with new props
- Subscriptions re-evaluate

**Fix:** Only reload grid layout when it actually needs to change (user action, not streamer updates)

---

### Issue #3: useLiveKitPublisher Auto-Start Effect

**File:** `hooks/useLiveKitPublisher.ts:525-534`

**Problem:**
```typescript
useEffect(() => {
  if (enabled && !isConnected && !isPublishing) {
    startPublishing(); // Auto-starts when enabled becomes true
  } else if (!enabled && roomRef.current) {
    stopPublishing(); // Auto-stops when enabled becomes false
  }
}, [enabled, isConnected, isPublishing, startPublishing, stopPublishing]);
```

**Why it loops:**
- `enabled` prop changes when `isLive` state updates
- `startPublishing`/`stopPublishing` are in dependencies
- If these functions recreate, effect re-runs
- Can cause connect → disconnect → connect cycles

**Fix:** Remove functions from dependencies, use refs for stable references

---

### Issue #4: Heartbeat Cleanup on Tile Change

**File:** `hooks/useViewerHeartbeat.ts:68-96`

**Problem:**
```typescript
useEffect(() => {
  // ... heartbeat setup ...
  return () => {
    cleanup(); // Removes from active_viewers when tile unmounts
  };
}, [enabled, liveStreamId, sendHeartbeat, cleanup]);
```

**Why it loops:**
- When `liveStreamId` changes (moving streamer to different tile)
- Old heartbeat cleanup runs → removes viewer from `active_viewers`
- New heartbeat starts → adds viewer back
- This triggers `update_publish_state_from_viewers()` RPC
- Which updates `is_published` → triggers `loadLiveStreamers()`
- Which can cause tile re-renders → subscription changes

**Fix:** Don't cleanup heartbeat immediately on `liveStreamId` change, use debounce

---

## 3. VERIFY "JOIN ONCE" RULE

### ✅ COMPLIANT: Viewer Room Connection

**File:** `components/LiveRoom.tsx:100-227`

**Status:** ✅ GOOD
- Connects ONCE on mount
- Depends only on `[supabase, authDisabled]` (stable)
- Does NOT depend on tiles, filters, chat, presence
- Stays connected until unmount

**Issue:** None - this is correct

---

### ❌ VIOLATION: Streamer Publisher Connection

**File:** `hooks/useLiveKitPublisher.ts:163-430`

**Status:** ❌ BAD
- Creates SEPARATE room connection (not using shared room)
- Auto-starts/stops based on `enabled` prop
- `enabled` depends on `isLive`, `selectedVideoDevice`, `selectedAudioDevice`, `liveStreamId`
- These can change frequently, causing connect/disconnect cycles

**Fix Required:** Streamers should use shared room and toggle publishing, not reconnect

---

### ❌ VIOLATION: Tile Subscriptions Re-run Too Often

**File:** `components/Tile.tsx:81-155`

**Status:** ❌ BAD
- Effect depends on `isLive`, `liveStreamId`, `streamerId`
- These props change when `loadLiveStreamers()` runs
- Causes unsubscribe → subscribe cycles even when streamer state didn't actually change

**Fix Required:** Use refs to track actual subscription state, compare before re-subscribing

---

## 4. AUTO-FILL AUDIT

### Current Auto-Fill Logic

**File:** `components/LiveRoom.tsx:736-930`

**Flow:**
1. `loadUserGridLayout()` runs on mount and when streamers change
2. Checks if user has saved `user_grid_slots`
3. If `data.length > 0` (has saved slots):
   - Loads saved slots
   - Only auto-fills empty slots IF they exist AND streamers available (line 893-919)
4. If `data.length === 0` (no saved slots):
   - Calls `autoFillGrid()` (line 926)

### Why Auto-Fill Fails

**Root Cause #1: Auto-fill only runs INSIDE saved layout branch**
- Line 893-919: Auto-fill only happens if user has SOME saved slots
- If user has NO saved slots, `autoFillGrid()` runs (line 926) ✅
- If user has saved slots but they're all empty/closed, auto-fill still runs ✅
- **BUT:** If user has 1 saved slot and 11 empty, auto-fill should fill the 11 empty ones
- **Current code DOES fill them** (line 893-919), so this might not be the issue

**Root Cause #2: Auto-fill depends on `liveStreamers` being loaded**
- `loadUserGridLayout()` runs BEFORE `liveStreamers` might be fully loaded
- Line 790: `const streamer = liveStreamers.find(...)` - if `liveStreamers` is empty, no streamers found
- Auto-fill logic at line 894 checks `liveStreamers.length > 0`
- If streamers aren't loaded yet, auto-fill doesn't run

**Root Cause #3: Auto-fill doesn't run on initial join if streamers load slowly**
- `loadLiveStreamers()` is async
- `loadUserGridLayout()` is called in `.then()` but might run before streamers are set in state
- Race condition: grid loads before streamers are available

**Fix Plan:**
1. Ensure `loadLiveStreamers()` completes and sets state BEFORE `loadUserGridLayout()` runs
2. Add explicit auto-fill trigger after streamers are loaded
3. Check if user just joined (no recent activity) and force auto-fill

---

## 5. TILE SWITCHING TIMEOUT BUG

### Current Flow When Moving Streamer Into View

**File:** `components/Tile.tsx:81-155`

**What happens:**
1. User drags streamer to empty tile OR clicks to add streamer
2. `handleAddStreamer()` or `handleDrop()` updates `gridSlots`
3. Tile component receives new `streamerId`/`liveStreamId` props
4. Tile's subscription effect runs (line 81)
5. Checks: `if (!sharedRoom || !isRoomConnected || !isLive || !liveStreamId || !streamerId)`
6. If streamer is `live_available` but not `is_published` yet:
   - `isLive = false` → effect returns early (line 86)
   - No subscription happens
   - No heartbeat sent (because `isLive = false`)

**Root Cause:**
- Heartbeat is enabled when `isLive || (isLiveAvailable && isCurrentUser)` (line 304)
- But for OTHER users' tiles, heartbeat only enabled when `isLive = true`
- When streamer moves into view, `isLive` might be false (not published yet)
- Heartbeat doesn't start → `active_viewers` not created → publishing doesn't start
- Circular dependency: need watchers to publish, but need to be watching to create watcher record

**Additional Issue:**
- When `isLive` changes from false → true, subscription effect re-runs
- But if tracks aren't available yet (publishing just started), subscription finds nothing
- No retry mechanism to wait for tracks

**Fix Plan:**
1. Enable heartbeat for ALL `live_available` streamers, not just `is_published`
2. Add retry logic in Tile subscription to wait for tracks if streamer is publishing
3. Ensure heartbeat starts immediately when tile becomes visible, even if not published yet

---

## 6. MINIMAL CHANGES REQUIRED

### Fix #1: Streamers Use Shared Room (CRITICAL)

**File:** `hooks/useLiveKitPublisher.ts`

**Change:**
- Accept `sharedRoom` prop instead of creating own connection
- Only toggle publishing on/off, don't connect/disconnect
- Remove room connection logic, keep only track publishing logic

**Impact:** Eliminates dual connections, reduces reconnection loops

---

### Fix #2: Stabilize Tile Subscriptions

**File:** `components/Tile.tsx:81-155`

**Change:**
- Use ref to track which streamer we're subscribed to
- Only unsubscribe if streamer actually changed
- Only subscribe if not already subscribed to this streamer
- Compare streamer ID before re-running effect

**Impact:** Prevents unnecessary unsubscribe/subscribe cycles

---

### Fix #3: Fix Auto-Fill Timing

**File:** `components/LiveRoom.tsx:405-467`

**Change:**
- Ensure `loadLiveStreamers()` completes and state is set before `loadUserGridLayout()`
- Add explicit auto-fill check after streamers load
- Don't reload grid layout on every streamer update (only on user actions)

**Impact:** Auto-fill works reliably on join

---

### Fix #4: Enable Heartbeat for All Live Available Streamers

**File:** `components/Tile.tsx:298-314`

**Change:**
- Enable heartbeat when `live_available = true`, not just `is_published = true`
- This ensures watcher record exists even before publishing starts
- Publishing will start automatically when watcher record is created

**Impact:** Fixes timeout when moving streamers into view

---

### Fix #5: Add Retry Logic for Track Subscription

**File:** `components/Tile.tsx:81-155`

**Change:**
- If streamer is `live_available` but no tracks found, retry subscription after delay
- Wait for tracks to become available (publishing might be starting)
- Max retries: 3, with exponential backoff

**Impact:** Handles race condition when publishing starts

---

## 7. SQL/RPC CHANGES NEEDED

**None required** - All issues are in client-side connection logic.

---

## 8. ACCEPTANCE TESTS

### Test 1: Streamer Can View Other Streams
1. User A goes live
2. User A opens /live page
3. User B goes live
4. **Expected:** User A sees User B's stream in their grid
5. **Current:** User A might not see User B (dual connection issue)

### Test 2: Auto-Fill on Join
1. User A is live
2. User B (new user) opens /live
3. **Expected:** User B's grid auto-fills with User A's stream
4. **Current:** Grid might stay empty

### Test 3: Move Streamer Into View
1. User A is live but not published (no watchers)
2. User B opens /live, grid is empty
3. User B drags User A into tile 1
4. **Expected:** User A starts publishing, User B sees video within 2 seconds
5. **Current:** Times out, reconnects, or doesn't show video

### Test 4: No Reconnection Loops
1. Open browser DevTools → Network tab
2. Filter for WebSocket connections
3. User goes live, views other streamers, moves tiles around
4. **Expected:** One stable WebSocket connection, no reconnects
5. **Current:** Multiple connections, frequent reconnects

### Test 5: Streamer Views Own Stream
1. User A goes live
2. User A opens /live page
3. **Expected:** User A sees themselves in slot 1, can see other streamers
4. **Current:** Might not see other streamers due to dual connection

---

## SUMMARY OF FIXES

1. **Streamers use shared room** - Remove separate publisher room connection
2. **Stabilize subscriptions** - Use refs to prevent re-subscription loops  
3. **Fix auto-fill timing** - Ensure streamers load before grid layout
4. **Enable heartbeat for all live streamers** - Not just published ones
5. **Add retry logic** - Wait for tracks when publishing starts

**Estimated Impact:**
- Eliminates reconnection loops
- Fixes auto-fill on join
- Fixes timeout when moving streamers
- Allows streamers to view other streams
- Reduces connection overhead by 50% (one room instead of two)

