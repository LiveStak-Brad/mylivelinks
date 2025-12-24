# Room Name Alignment Fix

## Issue

**Mobile and web were using different LiveKit room names:**

- ❌ **Mobile**: `'mylivelinks-main'` (hardcoded in `useLiveRoomParticipants.ts`)
- ❌ **Web**: `'live_central'` (from `lib/livekit-constants.ts`)

**Result**: Web and mobile clients were in different LiveKit rooms and couldn't see each other's participants.

## Fix

**Updated mobile to match web's room name:**

```typescript
// mobile/hooks/useLiveRoomParticipants.ts
const ROOM_NAME = 'live_central'; // Global room for all streams (matches web)
```

## Verification

### Web Room Name
```typescript
// lib/livekit-constants.ts
export const LIVEKIT_ROOM_NAME = 'live_central' as const;
```

Used in:
- `components/LiveRoom.tsx` (imports `LIVEKIT_ROOM_NAME`)
- `components/ViewerVideoPreview.tsx` (hardcoded `'live_central'`)

### Mobile Room Name
```typescript
// mobile/hooks/useLiveRoomParticipants.ts
const ROOM_NAME = 'live_central'; // Global room for all streams (matches web)
```

Used in:
- Token request: `roomName: ROOM_NAME`
- Room connection: `room.connect(url, token)`
- Debug logs: `room: ROOM_NAME`

## ✅ Status: ALIGNED

Both web and mobile now use `'live_central'` as the room name.

## Rule

**"No per-platform defaults"** - Web and mobile MUST always use the same room name constant.

If the room name ever needs to change:
1. Update `lib/livekit-constants.ts` → `LIVEKIT_ROOM_NAME`
2. Update `mobile/hooks/useLiveRoomParticipants.ts` → `ROOM_NAME`
3. Verify both match before deploying

## Testing

### Before Fix
1. Web user joins room → In `live_central`
2. Mobile user joins room → In `mylivelinks-main` (different room!)
3. **Result**: Can't see each other ❌

### After Fix
1. Web user joins room → In `live_central`
2. Mobile user joins room → In `live_central` (same room!)
3. **Result**: Can see each other's video ✅

## Commit Message

```
Mobile: fix room name to match web ('live_central')

- Changed mobile ROOM_NAME from 'mylivelinks-main' to 'live_central'
- Ensures web and mobile clients connect to the same LiveKit room
- Adds comment warning against per-platform defaults
- Critical fix: mobile and web were in different rooms
```

---

**Fixed**: 2025-12-24  
**Impact**: CRITICAL - Multi-platform room compatibility

