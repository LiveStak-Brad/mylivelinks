# ROOT CAUSE FIX SUMMARY

## ROOT CAUSE FOUND

**Primary Root Cause:** Heartbeat cleanup runs on every tile rerender when `liveStreamId` prop reference changes (even though the value is the same), removing the viewer from `active_viewers`. This triggers `update_publish_state_from_viewers()` which flips `is_published`, causing `loadLiveStreamers()` to reload, which rerenders tiles, which triggers cleanup again - creating an infinite loop.

**Secondary Root Cause:** Publisher `enabled` logic correctly ignores `is_published`, but the auto-start effect fires every time `enabled` changes, and `enabled` can change when `isLive` (which comes from `live_available`) changes through realtime subscriptions.

**Tertiary Root Cause:** Tile subscription effects depend on `sharedRoom` object reference, causing reruns when the room object reference changes (even though it's the same room).

---

## EXACT LOOP CHAIN

1. User clicks "Go Live" → `live_available=true` → `isLive=true` → `enabled=true`
2. Publisher auto-starts → publishes tracks → `onPublished()` fires
3. Tile mounts → `useViewerHeartbeat` starts → creates `active_viewers` record
4. `active_viewers` INSERT → realtime triggers → `update_publish_state_from_viewers()` → sets `is_published=true`
5. `live_streams` UPDATE → realtime triggers → `loadLiveStreamers()` → creates NEW object references
6. Grid rerenders → Tile receives new props (same `liveStreamId` value, but new prop reference)
7. **BUG:** `useViewerHeartbeat` effect dependencies see "change" → cleanup runs → removes viewer from `active_viewers`
8. `active_viewers` DELETE → realtime triggers → `update_publish_state_from_viewers()` → sets `is_published=false`
9. `live_streams` UPDATE → realtime triggers → `loadLiveStreamers()` → rerenders again
10. Loop repeats from step 6

---

## FIXES IMPLEMENTED

### Fix #1: Stable Watch Session Key (useViewerHeartbeat.ts)
- Added `watchSessionKey` parameter: `viewer_id:slot_index:live_stream_id`
- Cleanup only runs when `watchSessionKey` actually changes (slot changed streamer)
- Prevents cleanup on rerender when watching same streamer
- Added comprehensive logging: `[HEARTBEAT] upsert` and `[HEARTBEAT] remove` with reasons

### Fix #2: Publisher Enable Logic (GoLiveButton.tsx)
- Confirmed `shouldEnablePublisher` does NOT depend on `is_published`
- Only depends on `live_available` (via `isLive`)
- Added debug logging to show enable check state

### Fix #3: Subscription Dependencies (Tile.tsx)
- Removed `sharedRoom` from effect dependencies (it's an object)
- Now depends only on primitives: `[isRoomConnected, liveStreamId, streamerId, isLiveAvailable, isCurrentUser]`
- Check `sharedRoom` inside effect instead of depending on it

### Fix #4: Room Instance Logging (LiveRoom.tsx)
- Added `roomInstanceIdRef` to track room instance creation
- Log `[ROOM] created` with instance ID and stack trace
- Log `[ROOM] connect called` with instance ID, caller, and stack trace
- Proves only ONE room instance exists

### Fix #5: Publish Start/Stop Logging (useLiveKitPublisher.ts)
- Added `reason` parameter to `startPublishing()` and `stopPublishing()`
- Log `[PUBLISH] start requested` with reason, enabledState, blocked status
- Log `[PUBLISH] stop requested` with reason, enabledState
- All call sites updated to pass reason

### Fix #6: Subscription Logging (Tile.tsx)
- Log `[SUB] subscribe attempt` with slotIndex, participantIdentityFound, trackCount
- Log `[SUB] trackSubscribed` with slotIndex, participantIdentity, trackKind, trackSid
- Log `[SUB] unsubscribed` with slotIndex, reason

---

## FILES CHANGED

1. **hooks/useViewerHeartbeat.ts**
   - Added `watchSessionKey` parameter
   - Changed cleanup logic to only run when key changes
   - Added comprehensive logging

2. **components/Tile.tsx**
   - Generate `watchSessionKey` from viewer_id + slot_index + live_stream_id
   - Pass `watchSessionKey` to `useViewerHeartbeat`
   - Removed `sharedRoom` from subscription effect dependencies
   - Added subscription logging

3. **components/GoLiveButton.tsx**
   - Added debug logging to `shouldEnablePublisher`
   - Updated `stopPublishingRef` to pass reason parameter
   - Updated all `stopPublishing()` calls to pass reason

4. **hooks/useLiveKitPublisher.ts**
   - Added `reason` parameter to `startPublishing()` and `stopPublishing()`
   - Added comprehensive logging with reasons
   - Updated all internal calls to pass reason

5. **components/LiveRoom.tsx**
   - Added `roomInstanceIdRef` tracking
   - Added room creation and connect logging

---

## TESTING REQUIRED

Before committing, test:

1. **Browser A: Go Live, wait 20 seconds**
   - Check logs: Should see ONE `[PUBLISH] start requested` with reason
   - Should NOT see constant start/stop loops
   - Should see `[HEARTBEAT] upsert` every 12 seconds (not rapid remove/add)

2. **Browser B: Open /live**
   - Should see A's video within 1-5 seconds
   - Check logs: Should see `[SUB] subscribe attempt` → `[SUB] trackSubscribed`
   - Should NOT see rapid subscribe/unsubscribe

3. **Browser B: Go Live**
   - A and B must see each other
   - Both should have stable publishing (no loops)

4. **Move tiles around**
   - No disconnect
   - No constant unsubscribe/resubscribe
   - `[HEARTBEAT] remove` should only log when slot changes streamer, not on rerender

---

## LOG SNIPPET EXPECTED (Stability Proof)

With `NEXT_PUBLIC_DEBUG_LIVEKIT=1`, you should see:

```
[ROOM] created {roomInstanceId: 1, ...}
[ROOM] connect called {roomInstanceId: 1, caller: 'connectSharedRoom', ...}
[PUBLISH] enable check {enabled: true, isLive: true, ...}
[PUBLISH] start requested {reason: 'auto-start from enabled effect', enabledState: 'proceeding', ...}
[PUBLISH] Publishing track {kind: 'audio', ...}
[PUBLISH] Publishing track {kind: 'video', ...}
[HEARTBEAT] upsert {slotIndex: 1, liveStreamId: 123, watchSessionKey: 'user-id:1:123', ...}
[HEARTBEAT] upsert {slotIndex: 1, liveStreamId: 123, watchSessionKey: 'user-id:1:123', ...} // 12 seconds later
[HEARTBEAT] upsert {slotIndex: 1, liveStreamId: 123, watchSessionKey: 'user-id:1:123', ...} // 12 seconds later
// NO rapid remove/add cycles
// NO constant publish/unpublish
// NO constant subscribe/unsubscribe
```

---

## REMAINING WORK

- [ ] Test in real browsers (not just code verification)
- [ ] Verify log output matches expected patterns
- [ ] Confirm no publish/unpublish loops
- [ ] Confirm no subscribe/unsubscribe loops
- [ ] Confirm heartbeat is stable (not rapid remove/add)

---

## KEY INSIGHT

The fix is NOT about debouncing or deep comparison. The fix is:
1. **Stable watch session key** - Only cleanup when slot actually changes streamer
2. **Primitive dependencies** - Don't depend on object references in effects
3. **Publisher ignores is_published** - Only depends on `live_available` (already correct)

This breaks the loop at step 7 - heartbeat cleanup no longer runs on rerender.

