# Live Central Room Naming ✅

## Summary
Renamed the live streaming room to **"Live Central"** consistently across mobile and web platforms.

## Changes Made

### Web (Home Page Rooms Section)
**File:** `components/rooms/RoomsCarousel.tsx`

**Before:**
- Title: "Coming Soon Rooms"
- Description: "Vote with interest — we open rooms when enough people sign up."

**After:**
- Title: "Rooms"
- Description: "Live Central is live now! More themed rooms coming soon based on your votes."

---

### Mobile (Rooms Screen)
**File:** `mobile/screens/RoomsScreen.tsx`

**Before:**
- Room Title: "Live Streaming Room"
- Button Text: "🔴 Enter Live Room"

**After:**
- Room Title: "Live Central"
- Button Text: "🔴 Enter Live Central"

---

## Technical Details

### LiveKit Room Name (Already Correct)
**File:** `lib/livekit-constants.ts`

```typescript
export const LIVEKIT_ROOM_NAME = 'live_central' as const;
```

✅ This is the technical identifier used by both mobile and web to connect to the same room.

---

## Result

**Mobile and Web now both show:**
- Display Name: **"Live Central"**
- Technical Room: `live_central` (same LiveKit room)
- Users on mobile and web will join the **exact same room**

---

**Status:** ✅ Complete, ready for next build

