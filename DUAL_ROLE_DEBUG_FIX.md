# Dual Role Runtime Bug - Debug Instrumentation & Fixes

## Changes Made

### 1. Debug Instrumentation (NEXT_PUBLIC_DEBUG_LIVEKIT=1)

**Files Changed:**
- `components/LiveRoom.tsx` - Room connection/participant/track events
- `components/Tile.tsx` - Tile subscription attempts and track attachment
- `hooks/useLiveKitPublisher.ts` - Publishing state transitions

**Debug Logs Added:**

#### LiveRoom.tsx
- Room connect: `room.state`, `room.name`, `localParticipant.sid`, `identity`, `remoteParticipantsCount`
- Participant connected/disconnected: `identity`, `sid`, `trackPublicationsCount`
- Track subscribed/unsubscribed: `participantIdentity`, `trackKind`, `trackSid`

#### Tile.tsx
- Subscription effect: `slotIndex`, `streamerId`, `liveStreamId`, `isLiveAvailable`, `isLive`, `hasSharedRoom`, `isRoomConnected`, `alreadySubscribed`
- Track subscription: `slotIndex`, `streamerId`, `trackKind`, `trackSid`, `hasVideoRef`, `hasAudioRef`
- Remote participant lookup: `slotIndex`, `streamerId`, `foundParticipant`, `trackPublicationsCount`, `publications` array
- Video/audio attachment: `slotIndex`, `streamerId`, `trackSid` when attached to DOM

#### useLiveKitPublisher.ts
- Publishing: `kind`, `attempt`, `roomState`, `localParticipantSid`
- Publishing complete: `publishedTracksCount`, `publishedTracks` array

### 2. Echo Prevention Fix

**File Changed:** `components/Tile.tsx`

**Issue:** Echo prevention was checking `pub.isSubscribed` on local publications, which is unreliable.

**Fix:** 
- Added `isCurrentUserPublishing` prop to `Tile` (passed from `LiveRoom`)
- `GoLiveButton` reports publishing state via `onPublishingChange` callback
- Echo prevention now uses reliable flag: `shouldMuteForEcho = isCurrentUser && isCurrentUserPublishing`
- **CRITICAL:** Only mutes current user's OWN tile, never other tiles

### 3. Heartbeat Subscription State Fix

**File Changed:** `components/Tile.tsx`

**Issue:** Heartbeat was sending `isSubscribed: true` hardcoded, not reflecting actual subscription state.

**Fix:**
- Track actual subscription state: `isActuallySubscribed = !!(videoTrack || audioTrack)`
- Heartbeat now uses actual state: `isSubscribed: isActuallySubscribed`

## Reproduction Steps

1. Set `NEXT_PUBLIC_DEBUG_LIVEKIT=1` in `.env.local`
2. Browser A: Login as UserA → Go to `/live` → Click "Go Live"
3. Browser B: Login as UserB → Go to `/live` → Click "Go Live" (or stay viewer)
4. On Browser A: Click Browser B's tile to make it active/unmuted

## What to Look For in Debug Logs

### When UserA Goes Live:
```
[DEBUG] Publishing complete, local tracks: { publishedTracksCount: 2, publishedTracks: [...] }
[DEBUG] Room connected: { remoteParticipantsCount: X }
[DEBUG] Participant connected: { identity: "userB-id", trackPublicationsCount: 2 }
```

### When UserA Tries to View UserB:
```
[DEBUG] Tile subscription effect: { slotIndex: 2, streamerId: "userB-id", isLiveAvailable: true, ... }
[DEBUG] Found remote participant for tile: { slotIndex: 2, streamerId: "userB-id", trackPublicationsCount: 2 }
[DEBUG] Tile track subscribed: { slotIndex: 2, trackKind: "video", ... }
[DEBUG] Video track attached to DOM: { slotIndex: 2, streamerId: "userB-id", ... }
```

### If Tiles Are Closing:
Look for:
- `[DEBUG] Remote participant NOT found for tile` - means streamer not in room
- `[DEBUG] Tile subscription blocked (missing requirements)` - means subscription prevented
- `[DEBUG] Track unsubscribed` - means tracks being removed

## Suspected Issues to Verify

1. **Are remoteParticipants present when UserA is publishing?**
   - Check: `[DEBUG] Room connected: { remoteParticipantsCount: X }`
   - If count is 0 or 1 (only self), other streamers aren't in room

2. **Are tracks subscribed but not attached?**
   - Check: `[DEBUG] Tile track subscribed` but no `[DEBUG] Video track attached to DOM`
   - Means subscription works but DOM attachment fails

3. **Is subscription effect being blocked?**
   - Check: `[DEBUG] Tile subscription blocked (missing requirements)`
   - Look at which requirement is missing

4. **Are tiles being cleared from grid?**
   - Check console for `setGridSlots` calls
   - Look for `autoFillGrid()` or `loadUserGridLayout()` being called when going live

## Next Steps

1. Run reproduction with `NEXT_PUBLIC_DEBUG_LIVEKIT=1`
2. Capture console logs during Steps A/B
3. Identify where subscription/tracks are being blocked
4. Apply targeted fix based on debug output




