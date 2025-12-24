# ROOT CAUSE ANALYSIS - LiveKit Publish/Subscribe Loops

## 1. PUBLISH CONTROLLERS - PROOF OF CONFLICT

### Controller #1: Auto-Start Effect (useLiveKitPublisher.ts:383-438)
**File:** `hooks/useLiveKitPublisher.ts`  
**Function:** `useEffect` auto-start  
**Trigger:** `enabled` prop changes  
**Dependencies:** `[enabled, isRoomConnected, room, isPublishing, startPublishing]`  
**Expected:** Start publishing when enabled=true  
**Actual:** Starts correctly BUT `enabled` flips rapidly

### Controller #2: GoLiveButton Enabled Logic (GoLiveButton.tsx:247-249)
**File:** `components/GoLiveButton.tsx`  
**Function:** `shouldEnablePublisher` useMemo  
**Condition:** `isLive && selectedVideoDevice && selectedAudioDevice && liveStreamId && isRoomConnected && sharedRoom`  
**Problem:** `isLive` comes from DB realtime subscription (line 76-112)  
**When `is_published` flips:** `isLive` changes → `shouldEnablePublisher` changes → `enabled` prop changes → auto-start effect fires

### Controller #3: Realtime Stop Handler (GoLiveButton.tsx:85-88)
**File:** `components/GoLiveButton.tsx`  
**Function:** Realtime subscription handler  
**Trigger:** `live_available` changes to `false`  
**Action:** Calls `stopPublishing()`  
**Expected:** Only stop when user explicitly stops  
**Actual:** May trigger incorrectly if DB state flips

### Controller #4: Manual Start (GoLiveButton.tsx:503)
**File:** `components/GoLiveButton.tsx`  
**Function:** `handleStartLive()`  
**Trigger:** User clicks "Start Live"  
**Action:** Calls `startPublishing()` manually  
**Status:** ✅ CORRECT - explicit user action

### Controller #5: Component Unmount (useLiveKitPublisher.ts:358)
**File:** `hooks/useLiveKitPublisher.ts`  
**Function:** Cleanup effect  
**Trigger:** Component unmounts  
**Action:** Calls `stopPublishing()`  
**Status:** ✅ CORRECT - cleanup

---

## 2. THE EXACT LOOP CHAIN

```
LOOP #1: Publish/Unpublish (Every 1-3 seconds)

1. User clicks "Go Live"
   → GoLiveButton.handleStartLive() sets live_available=true in DB
   → GoLiveButton realtime handler sees live_available=true
   → Sets isLive=true (line 106)
   → shouldEnablePublisher becomes true
   → enabled prop becomes true

2. useLiveKitPublisher auto-start effect fires (line 396)
   → Calls startPublishing()
   → Creates tracks, publishes to LiveKit
   → onPublished() callback fires

3. Tile for current user mounts/updates
   → useViewerHeartbeat starts (Tile.tsx:655)
   → Sends heartbeat → creates active_viewers record

4. active_viewers INSERT triggers realtime (LiveRoom.tsx:637)
   → Calls update_publish_state_from_viewers() RPC (debounced 5s)
   → RPC sets is_published=true in DB

5. live_streams UPDATE triggers realtime (LiveRoom.tsx:580)
   → Calls loadLiveStreamers() (debounced)
   → Updates liveStreamers state with NEW object references

6. liveStreamers state change causes grid rerender
   → All Tile components rerender
   → Tile subscription effect dependencies change (liveStreamId is same number but new prop)
   → Effect cleanup runs → useViewerHeartbeat cleanup runs
   → Removes viewer from active_viewers (THIS IS THE BUG)

7. active_viewers DELETE triggers realtime (LiveRoom.tsx:637)
   → Calls update_publish_state_from_viewers() RPC
   → RPC sees active_viewer_count=0
   → Sets is_published=false in DB

8. live_streams UPDATE triggers realtime (LiveRoom.tsx:580)
   → GoLiveButton realtime handler sees is_published=false
   → BUT isLive is still true (because live_available is still true)
   → shouldEnablePublisher stays true
   → enabled stays true
   → Publisher should NOT stop...

9. BUT: Something else is causing stopPublishing to be called
   → Need to trace this

10. Loop repeats from step 2
```

**CRITICAL BUG IDENTIFIED:** Step 6 - Heartbeat cleanup runs on rerender even though `liveStreamId` value hasn't changed. This removes the viewer, which flips `is_published`, which causes another reload.

---

## 3. ROOM INSTANCE PROOF

**File:** `components/LiveRoom.tsx`  
**Room Creation:** Line 172 - `const room = new Room()`  
**Connect Call:** Line 315 - `await room.connect()`  
**Guard:** Line 126 - `roomConnectionRef.current.connecting` check  
**Status:** ✅ Only ONE room instance created, only ONE connect call

**PROOF NEEDED:** Add runtime logging to verify:
- Room instance ID (incrementing counter)
- Stack trace on connect call
- Verify only one instance exists

---

## 4. HEARTBEAT CLEANUP BUG

**File:** `hooks/useViewerHeartbeat.ts`  
**Current Dependencies:** `[liveStreamId, enabled, sendHeartbeat, cleanup]` (line 96)  
**Problem:** When Tile rerenders with same `liveStreamId` value but new prop reference, effect sees dependency change → cleanup runs → removes viewer

**Root Cause:** React sees `liveStreamId` as "changed" even though it's the same number because:
- Tile receives new `liveStreamId` prop (same value, but new prop)
- Effect dependencies include `liveStreamId`
- React runs cleanup → removes viewer from DB
- This triggers publish state update → reload → repeat

**Fix Required:** Use stable watch session key based on primitive values only.

---

## 5. PUBLISHER ENABLE LOGIC BUG

**File:** `components/GoLiveButton.tsx`  
**Current Logic:** `isLive && selectedVideoDevice && selectedAudioDevice && liveStreamId && isRoomConnected && sharedRoom`  
**Problem:** `isLive` comes from `live_available` in DB, but it's also affected by `is_published` changes through realtime

**CRITICAL:** Publisher should be enabled based on:
- `live_available === true` (user pressed Go Live)
- NOT `is_published` (this is derived from viewers)

**Current Bug:** If `is_published` flips, it may indirectly affect `isLive` through realtime updates, causing `enabled` to toggle.

---

## 6. SUBSCRIPTION CHURN BUG

**File:** `components/Tile.tsx`  
**Current Dependencies:** `[sharedRoom, isRoomConnected, liveStreamId, streamerId, isLiveAvailable, isCurrentUser]` (line 484)  
**Problem:** `liveStreamId` is a number, but when `liveStreamers` reloads, Tile receives new props → React sees "new" `liveStreamId` prop → effect reruns → cleanup → unsubscribe → resubscribe

**Fix Required:** Dependencies should be primitives only, and cleanup should only run when streamer actually changes.

---

## ROOT CAUSE SUMMARY

**Primary Root Cause:** Heartbeat cleanup runs on rerender when `liveStreamId` prop reference changes, removing the viewer from `active_viewers`, which flips `is_published`, which triggers reload, which rerenders tiles, which triggers cleanup again.

**Secondary Root Cause:** Publisher `enabled` logic may be indirectly affected by `is_published` changes through realtime subscriptions, causing rapid toggling.

**Tertiary Root Cause:** Tile subscription effects rerun when `liveStreamId` prop reference changes (even though value is same), causing unsubscribe/resubscribe loops.

---

## FIXES REQUIRED

1. **Stable Watch Session:** Heartbeat should use stable key (viewer_id + slot_index + live_stream_id) and only cleanup when slot actually changes streamer
2. **Publisher Enable Logic:** Remove `is_published` from enable condition - only use `live_available`
3. **Subscription Stability:** Use primitive dependencies only, add guards to prevent cleanup on rerender
4. **Room Instance Logging:** Add runtime proof of single instance
5. **Comprehensive Logging:** Add all required instrumentation

