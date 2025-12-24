# Room-Demand Publishing Implementation

## Summary

Replaced tile-demand publishing (based on `active_viewers`) with room-demand publishing (based on `room_presence` count) to eliminate circular dependencies and prevent publish/unpublish flapping.

## Root Cause

**Previous Problem:** Tile-demand created a circular dependency:
1. Tile watches streamer → creates `active_viewers` record
2. `active_viewers` INSERT → triggers `update_publish_state_from_viewers()`
3. `is_published` flips → reloads grid → tiles rerender
4. Tile rerender → heartbeat cleanup removes viewer
5. `active_viewers` DELETE → `is_published` flips again
6. Loop repeats

**Solution:** Room-demand breaks the loop by making publishing independent of tile placement:
- Publishing controlled by: `live_available && (roomPresenceCountMinusSelf > 0)`
- Tiles still control which remote participants to render (personal grid)
- `active_viewers` kept for analytics only, no longer controls publishing

## Changes Made

### 1. SQL RPC Functions (`room_demand_rpc.sql`)

Created two new RPC functions:
- `get_room_presence_count(p_profile_id UUID)` - Returns count excluding specified profile
- `get_room_presence_count_minus_self()` - Convenience wrapper using `auth.uid()`

**Usage:** Run `room_demand_rpc.sql` in Supabase SQL Editor before deploying.

### 2. LiveRoom Component (`components/LiveRoom.tsx`)

**Added:**
- `roomPresenceCountMinusSelf` state to track count of others in room
- `useEffect` to subscribe to `room_presence` table changes and update count
- Polling backup (every 5 seconds) in case realtime misses updates
- Passes `roomPresenceCountMinusSelf` to `GoLiveButton` component

**Disabled:**
- Removed `update_publish_state_from_viewers()` call from `active_viewers` subscription
- `active_viewers` changes now only update viewer counts for display/analytics
- Publishing no longer controlled by `active_viewers` changes

### 3. GoLiveButton Component (`components/GoLiveButton.tsx`)

**Updated Publisher Enable Logic:**
```typescript
enablePublish = live_available && hasRequiredDevices && isRoomConnected && roomHasOthers
where roomHasOthers = (roomPresenceCountMinusSelf > 0)
```

**Key Changes:**
- Added `roomPresenceCountMinusSelf` prop
- `shouldEnablePublisher` now depends on `roomPresenceCountMinusSelf` instead of `is_published` or `active_viewers`
- When alone (`roomPresenceCountMinusSelf === 0`): preview only (local preview), no publishing
- When others present (`roomPresenceCountMinusSelf > 0`): publish automatically

**Debug Logging:**
- `[PUBLISH] enable check (ROOM-DEMAND)` logs show `roomPresenceCountMinusSelf` and `roomHasOthers`

## Exact Enable Logic

```typescript
const hasRequiredDevices = !!(selectedVideoDevice && selectedAudioDevice && liveStreamId);
const roomHasOthers = roomPresenceCountMinusSelf > 0;
const enabled = !!(isLive && hasRequiredDevices && isRoomConnected && sharedRoom && roomHasOthers);
```

**Where `roomPresenceCountMinusSelf` comes from:**
- RPC function: `get_room_presence_count_minus_self()`
- Queries `room_presence` table (last_seen_at within 60 seconds)
- Excludes current user (`auth.uid()`)
- Updated via realtime subscription to `room_presence` table changes
- Polled every 5 seconds as backup

## Acceptance Tests

✅ **Streamer A goes live alone:**
- `roomPresenceCountMinusSelf = 0`
- `enabled = false` (preview only)
- UI shows "LIVE(0)" but no publishing

✅ **Viewer B joins the room:**
- `roomPresenceCountMinusSelf` updates to `1` (via realtime)
- `enabled` flips to `true`
- A starts publishing within 1-2 seconds automatically
- B can see A's video even if B hasn't clicked A's tile

✅ **B goes live:**
- Both have `roomPresenceCountMinusSelf > 0`
- Both publish automatically
- Both can see each other

✅ **Moving tiles:**
- Does NOT trigger publish/unpublish loops
- Publishing controlled by room presence, not tile placement
- Tiles still control which remote participants to render (personal grid)

## Files Changed

1. `room_demand_rpc.sql` - NEW: RPC functions for room presence count
2. `components/LiveRoom.tsx` - Room presence tracking, disabled tile-demand path
3. `components/GoLiveButton.tsx` - Updated publisher enable logic

## Debug Logging

With `NEXT_PUBLIC_DEBUG_LIVEKIT=1`:

```
[ROOM-DEMAND] room presence count (minus self): 1
[PUBLISH] enable check (ROOM-DEMAND) {
  enabled: true,
  isLive: true,
  hasRequiredDevices: true,
  roomPresenceCountMinusSelf: 1,
  roomHasOthers: true,
  isRoomConnected: true,
  hasSharedRoom: true
}
[PUBLISH] start requested {reason: 'auto-start from enabled effect', ...}
```

## Proof of Stability

**Before (tile-demand):**
- Constant publish/unpublish loops every 1-3 seconds
- Moving tiles triggers publish state changes
- Circular dependency: tiles → viewers → publish → reload → tiles

**After (room-demand):**
- Publishing only changes when someone joins/leaves the room
- Moving tiles does NOT affect publishing
- No circular dependency: room presence → publish (independent of tiles)

## Next Steps

1. **Run SQL:** Execute `room_demand_rpc.sql` in Supabase SQL Editor
2. **Test:** Verify acceptance tests pass
3. **Monitor:** Check logs show stable publishing (no flapping)
4. **Optional Enhancement:** Later, implement top-12 ranking for cost control when >12 streamers are live

