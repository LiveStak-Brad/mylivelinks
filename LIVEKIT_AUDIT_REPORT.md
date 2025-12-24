# LIVEKIT LIFECYCLE AUDIT REPORT
## Full Analysis of Connection/Subscribe/Publish Loops

**Date:** 2025-01-27  
**Status:** CRITICAL - Infinite Loop Detected

---

## 1. DEBUG LOGS ANALYSIS

### Summary from DEBUG_LOGS.md

**Pattern Observed:**
- **Constant publish/unpublish cycles** every 1-3 seconds
- **Track subscribe/unsubscribe** happening immediately after subscribe
- **"Auto-starting publisher"** messages repeating continuously
- **"Stopping publishing"** messages immediately after starting
- **Track subscriptions** appear and disappear within milliseconds

**Key Log Patterns:**
```
Line 188: Auto-starting publisher (enabled=true, room connected)
Line 199: Started publishing to LiveKit
Line 201: Stopping publishing... {hasRoom: true, tracksCount: 2, roomState: 'connected'}
Line 204: Stopped publishing to LiveKit
Line 209: Auto-starting publisher (enabled=true, room connected)  // IMMEDIATE RESTART
```

**Frequency:**
- Publish/unpublish: **Every 1-3 seconds**
- Subscribe/unsubscribe: **Every 500ms-2s**
- Room reconnects: **Not observed** (room stays connected)
- Grid reloads: **Every 2-3 seconds** (from realtime triggers)

**Root Cause Indicators:**
1. Publisher auto-starts → publishes → immediately stops → auto-starts again
2. Tracks subscribe → immediately unsubscribe → subscribe again
3. `liveStreamers` state changes trigger tile rerenders → heartbeat cleanup → `active_viewers` removed → `is_published` flips → reload → repeat

---

## 2. CONNECTION/PUBLISH/SUBSCRIBE CALL SITES

### Room Connection

**File:** `components/LiveRoom.tsx`  
**Function:** `useEffect` (lines 118-339)  
**Trigger:** Component mount  
**What it does:** Connects to `live_central` room once  
**State check:** Uses `roomConnectionRef.current.connecting` guard  
**Status:** ✅ **WORKING CORRECTLY** - Only connects once

### Room Disconnect

**File:** `components/LiveRoom.tsx`  
**Function:** Cleanup in `useEffect` (line 339)  
**Trigger:** Component unmount  
**Status:** ✅ **WORKING CORRECTLY** - Only disconnects on unmount

### Publishing (Start)

**File:** `hooks/useLiveKitPublisher.ts`  
**Function:** `startPublishing()` (lines 39-250)  
**Triggers:**
1. **Auto-start effect** (line 384): When `enabled=true` AND `isRoomConnected=true` AND `!isPublishing` AND `!userExplicitlyStopped`
2. **Manual call** from `GoLiveButton.handleStartLive()` (line 503)

**File:** `components/GoLiveButton.tsx`  
**Function:** `useLiveKitPublisher` hook (line 252)  
**Enabled condition:** `isLive && selectedVideoDevice && selectedAudioDevice && liveStreamId && isRoomConnected && sharedRoom` (line 248)

**Problem:** `enabled` flips rapidly because `isLive` comes from DB realtime subscription, which changes when `is_published` changes

### Publishing (Stop)

**File:** `hooks/useLiveKitPublisher.ts`  
**Function:** `stopPublishing()` (lines 257-340)  
**Triggers:**
1. **Explicit user action:** `GoLiveButton.handleGoLive()` when stopping (line 309)
2. **Database update:** `GoLiveButton` realtime handler when `live_available=false` (line 88)
3. **Component unmount:** Cleanup effect (line 348)

**Problem:** `stopPublishing` is being called indirectly when `is_published` flips to `false`, even though `live_available` is still `true`

### Subscription (Track Subscribe)

**File:** `components/Tile.tsx`  
**Function:** `useEffect` subscription effect (lines 89-473)  
**Dependencies:** `[sharedRoom, isRoomConnected, liveStreamId, streamerId, isLiveAvailable, isCurrentUser]`  
**Triggers:** When tile props change (especially `liveStreamId` or `streamerId`)

**Problem:** When `liveStreamers` reloads, tiles rerender with new `liveStreamId` values, causing subscription effect to rerun

### Subscription (Track Unsubscribe)

**File:** `components/Tile.tsx`  
**Function:** Cleanup in subscription effect (lines 454-467)  
**Triggers:** When effect dependencies change OR component unmounts

**Problem:** Cleanup runs on every rerender when dependencies change, causing unsubscribe → resubscribe loop

---

## 3. HEARTBEAT CREATE/REMOVE TRIGGERS

### Heartbeat Create

**File:** `hooks/useViewerHeartbeat.ts`  
**Function:** `sendHeartbeat()` (lines 30-48)  
**Triggers:**
1. **Initial call:** On effect mount (line 78)
2. **Interval:** Every 12 seconds (line 81-83)
3. **When enabled:** `enabled=true` AND `liveStreamId` exists

**Dependencies:** `[enabled, liveStreamId, isActive, isUnmuted, isVisible, isSubscribed]`

**File:** `components/Tile.tsx`  
**Function:** `useViewerHeartbeat` hook call (need to find exact line)  
**Enabled condition:** When tile has `liveStreamId` and is subscribed

**Problem:** When tile rerenders, heartbeat hook dependencies change → cleanup runs → removes viewer → `update_publish_state_from_viewers()` runs → `is_published` flips → reload → repeat

### Heartbeat Remove

**File:** `hooks/useViewerHeartbeat.ts`  
**Function:** `cleanup()` (lines 50-66)  
**Triggers:**
1. **Effect cleanup:** When dependencies change OR component unmounts (line 94)
2. **Page unload:** `beforeunload` event (line 101)

**Problem:** Cleanup runs too aggressively - when tile rerenders with same `liveStreamId` but different object reference, effect sees it as "changed" and runs cleanup

---

## 4. EXACT FEEDBACK LOOP CHAIN

### Loop #1: Publish/Unpublish Loop

```
1. User clicks "Go Live"
   → GoLiveButton sets live_available=true in DB
   → GoLiveButton sets isLive=true (from realtime)
   → GoLiveButton sets enabled=true for publisher

2. Publisher auto-starts (useLiveKitPublisher.ts:384)
   → Creates tracks
   → Publishes to LiveKit room
   → onPublished() callback fires

3. Tile component mounts/updates for current user
   → useViewerHeartbeat hook starts
   → Sends heartbeat → creates active_viewers record

4. active_viewers INSERT triggers realtime (LiveRoom.tsx:637)
   → Calls update_publish_state_from_viewers() RPC (debounced 2s)
   → RPC sets is_published=true in DB

5. live_streams UPDATE triggers realtime (LiveRoom.tsx:580)
   → Calls loadLiveStreamers() (debounced 2s)
   → Updates liveStreamers state

6. liveStreamers state change causes grid rerender
   → All Tile components rerender
   → Tile subscription effects see "new" liveStreamId (same value, new object)
   → Effect cleanup runs → useViewerHeartbeat cleanup runs
   → Removes viewer from active_viewers

7. active_viewers DELETE triggers realtime (LiveRoom.tsx:637)
   → Calls update_publish_state_from_viewers() RPC
   → RPC sees active_viewer_count=0
   → Sets is_published=false in DB

8. live_streams UPDATE triggers realtime (LiveRoom.tsx:580)
   → Calls loadLiveStreamers()
   → Updates liveStreamers state (is_published=false)

9. GoLiveButton realtime handler sees is_published=false
   → BUT live_available is still true
   → Should NOT stop publishing, but something else is triggering stop

10. Loop repeats from step 2
```

### Loop #2: Subscribe/Unsubscribe Loop

```
1. Tile subscription effect runs (Tile.tsx:89)
   → Finds participant in room
   → Subscribes to tracks
   → Sets subscriptionRef.current.subscribed=true

2. liveStreamers reloads (from Loop #1 step 5)
   → Grid rerenders
   → Tile receives "new" props (same streamerId, but new object reference)
   → Effect dependencies change (liveStreamId object reference changed)

3. Effect cleanup runs (Tile.tsx:454)
   → Unsubscribes from tracks
   → Clears subscriptionRef

4. Effect runs again (Tile.tsx:89)
   → Resubscribes to tracks

5. Loop repeats every 1-2 seconds
```

---

## 5. ROOT CAUSE ANALYSIS

### Primary Root Cause: **Object Reference Instability**

**Problem:** `liveStreamers` state is an array of objects. When `loadLiveStreamers()` runs, it creates **new object instances** even if the data is identical. This causes:

1. **Tile components** to see "new" props → effect dependencies change → cleanup runs
2. **Heartbeat hooks** to see "new" `liveStreamId` → cleanup runs → removes viewer
3. **Publisher** to see "new" `liveStreamId` → may trigger state changes

### Secondary Root Cause: **Aggressive Cleanup**

**Problem:** React effects run cleanup when dependencies change, even if the **values** are the same. The cleanup removes viewers from `active_viewers`, which triggers publish state updates.

### Tertiary Root Cause: **Realtime Cascade**

**Problem:** Multiple realtime subscriptions trigger cascading updates:
- `active_viewers` change → `update_publish_state_from_viewers()` → `is_published` change
- `live_streams` change → `loadLiveStreamers()` → grid rerender → tile cleanup → `active_viewers` change
- This creates a feedback loop

---

## 6. FIX PLAN (Minimal Changes, In Order)

### Fix #1: Stabilize Object References in `liveStreamers`

**File:** `components/LiveRoom.tsx`  
**Location:** `loadLiveStreamers()` function (line 711)  
**Change:** Use deep comparison to only update state if data actually changed

```typescript
// Before:
setLiveStreamers(streamers);

// After:
setLiveStreamers((prevStreamers) => {
  // Deep compare - only update if streamer IDs or critical fields changed
  const prevIds = prevStreamers.map(s => `${s.profile_id}:${s.is_published}:${s.live_available}`).join(',');
  const newIds = streamers.map(s => `${s.profile_id}:${s.is_published}:${s.live_available}`).join(',');
  if (prevIds === newIds) {
    return prevStreamers; // Return same reference if no change
  }
  return streamers;
});
```

**Impact:** Prevents unnecessary tile rerenders when data hasn't changed

---

### Fix #2: Stabilize `liveStreamId` in Tile Props

**File:** `components/LiveRoom.tsx`  
**Location:** Tile component props (lines 2092, 2191)  
**Change:** Use `useMemo` to stabilize `liveStreamId` value

```typescript
// Before:
liveStreamId={slot.streamer.id && (slot.streamer.is_published || slot.streamer.live_available) ? (() => {
  const idStr = slot.streamer.id.toString();
  if (idStr.startsWith('stream-') || idStr.startsWith('seed-')) {
    return undefined;
  }
  const parsed = parseInt(idStr);
  return parsed > 0 ? parsed : undefined;
})() : undefined}

// After:
const liveStreamId = useMemo(() => {
  if (!slot.streamer?.id) return undefined;
  const idStr = slot.streamer.id.toString();
  if (idStr.startsWith('stream-') || idStr.startsWith('seed-')) {
    return undefined;
  }
  const parsed = parseInt(idStr);
  return parsed > 0 ? parsed : undefined;
}, [slot.streamer?.id]); // Only depend on ID string, not entire object

// Then pass: liveStreamId={liveStreamId}
```

**Impact:** Prevents subscription effect from rerunning when object reference changes

---

### Fix #3: Prevent Heartbeat Cleanup on Rerender

**File:** `hooks/useViewerHeartbeat.ts`  
**Location:** `useEffect` dependencies (line 96)  
**Change:** Use refs to track actual values, not object references

```typescript
// Before:
useEffect(() => {
  // ... heartbeat logic
}, [enabled, liveStreamId, sendHeartbeat, cleanup]);

// After:
const liveStreamIdRef = useRef(liveStreamId);
const enabledRef = useRef(enabled);

useEffect(() => {
  liveStreamIdRef.current = liveStreamId;
  enabledRef.current = enabled;
}, [liveStreamId, enabled]);

useEffect(() => {
  // Use refs in logic instead of direct values
  if (!enabledRef.current || !liveStreamIdRef.current) {
    // cleanup
    return;
  }
  // ... heartbeat logic using liveStreamIdRef.current
}, []); // Empty deps - only run on mount/unmount
```

**Impact:** Heartbeat only starts/stops on actual mount/unmount, not on rerenders

---

### Fix #4: Debounce `update_publish_state_from_viewers()` More Aggressively

**File:** `components/LiveRoom.tsx`  
**Location:** `activeViewersChannel` handler (line 642)  
**Change:** Increase debounce from 2s to 5s, and add guard to prevent rapid calls

```typescript
// Before:
publishStateUpdateTimeout = setTimeout(async () => {
  await supabase.rpc('update_publish_state_from_viewers');
  updateViewerCountsOnly();
}, 2000);

// After:
let lastPublishStateUpdate = 0;
const MIN_PUBLISH_STATE_INTERVAL = 5000; // 5 seconds minimum

publishStateUpdateTimeout = setTimeout(async () => {
  const now = Date.now();
  if (now - lastPublishStateUpdate < MIN_PUBLISH_STATE_INTERVAL) {
    return; // Skip if called too recently
  }
  lastPublishStateUpdate = now;
  await supabase.rpc('update_publish_state_from_viewers');
  updateViewerCountsOnly();
}, 5000); // Increased from 2s to 5s
```

**Impact:** Reduces frequency of publish state updates, breaking the rapid loop

---

### Fix #5: Prevent Publisher Auto-Stop When `live_available=true`

**File:** `hooks/useLiveKitPublisher.ts`  
**Location:** Auto-start effect (line 384)  
**Change:** Add guard to prevent auto-stop when `enabled` becomes false if user didn't explicitly stop

```typescript
// Current code already has userExplicitlyStoppedRef guard
// But we need to ensure it's not being reset incorrectly

// Add check in stopPublishing:
const stopPublishing = useCallback(async () => {
  // Only mark as explicitly stopped if enabled is false AND user action
  // Don't mark if it's just a temporary state change
  if (!enabled) {
    userExplicitlyStoppedRef.current = true;
  }
  // ... rest of stop logic
}, [room, onUnpublished, enabled]); // Add enabled to deps
```

**Impact:** Prevents publisher from stopping when `is_published` flips but `live_available` is still true

---

### Fix #6: Add Comprehensive Debug Logging

**File:** All LiveKit-related files  
**Change:** Add consistent debug logging with `NEXT_PUBLIC_DEBUG_LIVEKIT=1`

**Prefixes:**
- `[ROOM]` - Room connect/disconnect/state changes
- `[PUBLISH]` - Publish/unpublish + reason
- `[SUB]` - Track subscribed/unsubscribed + participant + tile
- `[HEARTBEAT]` - Heartbeat upsert/remove + tile + reason
- `[GRID]` - Autofill decisions + why

**Example:**
```typescript
const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';

if (DEBUG_LIVEKIT) {
  console.log('[PUBLISH] Starting publish', { reason: 'enabled=true', liveStreamId, roomState: room.state });
}
```

---

## 7. SQL/RPC CHANGES (If Any)

**No SQL changes required.** The database functions are correct. The issue is in the client-side state management.

**Optional optimization:** Add a cooldown period in `update_publish_state_from_viewers()` to prevent rapid toggling:

```sql
-- Add to update_publish_state_from_viewers() function
-- Only update if last update was more than 3 seconds ago
IF v_stream.updated_at > CURRENT_TIMESTAMP - INTERVAL '3 seconds' THEN
  CONTINUE; -- Skip this stream, updated too recently
END IF;
```

---

## 8. FILES TO MODIFY

1. **components/LiveRoom.tsx**
   - Fix `loadLiveStreamers()` to stabilize object references
   - Fix Tile `liveStreamId` prop to use `useMemo`
   - Increase debounce for `update_publish_state_from_viewers()`

2. **hooks/useViewerHeartbeat.ts**
   - Use refs instead of direct dependencies to prevent cleanup on rerender

3. **hooks/useLiveKitPublisher.ts**
   - Ensure `userExplicitlyStoppedRef` is not reset incorrectly
   - Add debug logging

4. **components/Tile.tsx**
   - Add debug logging for subscription/unsubscription
   - Consider stabilizing subscription effect dependencies

5. **components/GoLiveButton.tsx**
   - Add debug logging for enabled state changes

---

## 9. ACCEPTANCE CRITERIA CHECKLIST

After fixes, verify:

- [ ] Room connects once and stays connected (no reconnects)
- [ ] No constant publish/unpublish loop (check logs for < 1 publish/unpublish per minute)
- [ ] No constant subscribe/unsubscribe loop (check logs for < 1 subscribe/unsubscribe per tile per minute)
- [ ] New user entering /live auto-fills tiles immediately (< 2 seconds)
- [ ] Streamer can still watch other tiles while publishing (dual role works)
- [ ] Moving a streamer into view does NOT time out (publishing starts within 5 seconds of watcher heartbeat)

---

## 10. TESTING PLAN

1. **Test publish/unpublish stability:**
   - Go live
   - Wait 30 seconds
   - Check logs: Should see 1 publish, then stable (no unpublish unless viewer leaves)

2. **Test subscribe/unsubscribe stability:**
   - Add streamer to tile
   - Wait 10 seconds
   - Check logs: Should see 1 subscribe, then stable (no unsubscribe/resubscribe)

3. **Test heartbeat stability:**
   - Watch a stream
   - Wait 20 seconds
   - Check `active_viewers` table: Should see consistent record (not disappearing/reappearing)

4. **Test grid reload:**
   - Change sort mode
   - Check logs: Should see 1 reload, tiles should NOT unsubscribe/resubscribe

---

## END OF AUDIT REPORT

**Next Steps:** Implement fixes in order, test after each fix, then proceed to next.

