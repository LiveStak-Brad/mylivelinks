# ✅ Room Name Verification - Web + Mobile

## Critical Requirement

**Both web and mobile MUST use the exact same room name constant.**

## Current Configuration

### Web
**File:** `lib/livekit-constants.ts`
```typescript
export const LIVEKIT_ROOM_NAME = 'live_central' as const;
```

**Used in:**
- `components/LiveRoom.tsx`
- `app/api/livekit/token/route.ts`
- All web token requests

### Mobile
**File:** `mobile/lib/livekit-constants.ts`
```typescript
export const LIVEKIT_ROOM_NAME = 'live_central' as const;
```

**Used in:**
- `mobile/hooks/useLiveRoomParticipants.ts`
- All mobile token requests

---

## ✅ Verification

| Platform | Room Name | Status |
|----------|-----------|--------|
| Web | `live_central` | ✅ Correct |
| Mobile | `live_central` | ✅ Correct |

**Result:** Both platforms use identical room name ✅

---

## Why This Matters

If room names don't match:
- ❌ Web and mobile clients join different rooms
- ❌ Users can't see each other
- ❌ No cross-platform viewing
- ❌ Appears as "empty room" on mobile

With matching room names:
- ✅ Web publisher appears in mobile room
- ✅ Mobile viewers see web streams
- ✅ Same participant list across platforms
- ✅ Unified chat and presence

---

## Enforcement

### No Per-Platform Defaults

**❌ WRONG:**
```typescript
// Web
const ROOM_NAME = 'web-live-central';

// Mobile  
const ROOM_NAME = 'mobile-live-central';
```

**✅ CORRECT:**
```typescript
// Web (lib/livekit-constants.ts)
export const LIVEKIT_ROOM_NAME = 'live_central' as const;

// Mobile (mobile/lib/livekit-constants.ts)
export const LIVEKIT_ROOM_NAME = 'live_central' as const;
```

### Single Source of Truth

Both platforms import from their respective constants files:
- Web: `import { LIVEKIT_ROOM_NAME } from '@/lib/livekit-constants'`
- Mobile: `import { LIVEKIT_ROOM_NAME } from '../lib/livekit-constants'`

**Never hardcode room name in components!**

---

## Testing Verification

### Quick Test
1. Web user goes live
2. Mobile app connects
3. Check mobile logs: `[ROOM] Connected: { room: 'live_central', ... }`
4. Check participant list on mobile
5. ✅ Should see web publisher

### Debug Logs
Enable debug mode:
- Web: `NEXT_PUBLIC_DEBUG_LIVEKIT=1`
- Mobile: `EXPO_PUBLIC_DEBUG_LIVE=1`

Look for:
```
[TOKEN] room=live_central ...  (both platforms)
[ROOM] Connected: { room: 'live_central', ... }  (both platforms)
```

---

## Change Procedure

If room name needs to change:

1. ✅ Update web constant: `lib/livekit-constants.ts`
2. ✅ Update mobile constant: `mobile/lib/livekit-constants.ts`
3. ✅ Update integration docs
4. ✅ Test web → mobile viewing
5. ✅ Test mobile → web viewing
6. ✅ Deploy both simultaneously

**Never deploy only one platform with a different room name!**

---

**Status: ✅ VERIFIED - Both platforms use `live_central`**

