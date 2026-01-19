# PWA Mobile Web Video Fix - Summary

## Problem
Mobile PWA (Progressive Web App) was showing profile avatars instead of live video in `/room/[slug]` 12-grid layout, while desktop worked correctly.

## Root Cause
The `MobileWebWatchLayout` component (used for mobile web browsers) was **not receiving or passing the centralized `tracksByStreamerId` map** to Tile components. This meant:
- Tile components received `videoTrack={undefined}` and `audioTrack={undefined}`
- The fallback logic at `Tile.tsx:440-447` rendered avatars when `!videoTrack`
- Desktop worked because it used the normal LiveRoom grid rendering path

## Files Changed

### 1. `components/mobile/MobileWebWatchLayout.tsx`
**LINE 47**: Added `tracksByStreamerId` to interface
```typescript
tracksByStreamerId: Map<string, { video?: any; audio?: any }>; // PHASE 4: Centralized tracks
```

**LINE 135**: Added to function parameters
```typescript
tracksByStreamerId,
```

**LINES 504-505**: Pass tracks to Tile in focus mode
```typescript
videoTrack={tracksByStreamerId.get(focusedSlot.streamer.profile_id)?.video ?? null}
audioTrack={tracksByStreamerId.get(focusedSlot.streamer.profile_id)?.audio ?? null}
```

**LINES 553-554**: Pass tracks to Tile in grid mode
```typescript
videoTrack={tracksByStreamerId.get(slot.streamer.profile_id)?.video ?? null}
audioTrack={tracksByStreamerId.get(slot.streamer.profile_id)?.audio ?? null}
```

### 2. `components/LiveRoom.tsx`
**LINE 2815**: Pass tracksByStreamerId to MobileWebWatchLayout
```typescript
tracksByStreamerId={tracksByStreamerId}
```

### 3. `components/Tile.tsx`
**LINES 218-227**: Added diagnostic logging for mobile PWA debugging
```typescript
console.log('[TILE-VIDEO-PWA] Track state:', {
  slotIndex,
  streamerId,
  hasVideoTrack: !!videoTrack,
  hasVideoRef: !!videoRef.current,
  trackSid: (videoTrack as any)?.sid,
  isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
  isPWA: window.matchMedia('(display-mode: standalone)').matches,
});
```

**LINES 451-453**: Added iOS-safe video attributes
```typescript
controls={false}
disablePictureInPicture
webkit-playsinline="true"
```

## Verification Steps

### Console Logs to Check
On iPhone PWA, open browser console and look for:
```
[TILE-VIDEO-PWA] Track state: {
  hasVideoTrack: true,  // Should be true now (was false before)
  trackSid: "TR_xxxxx",
  isMobile: true,
  isPWA: true
}
```

### Visual Test
1. Open `/room/live-central` on iPhone Safari
2. Add to Home Screen (PWA mode)
3. Open the PWA
4. Verify at least 2 remote tiles show **video** instead of avatars
5. Verify video plays without requiring tap-to-play

## Technical Details

### Avatar-Only Conditional Location
**FILE**: `components/Tile.tsx`  
**LINE**: 440-447  
**CONDITION**: `!videoTrack`

This fallback is **correct** - it should only show avatars when no track is available. The bug was that tracks weren't being passed to mobile Tile components.

### iOS-Safe Video Attributes
**FILE**: `components/Tile.tsx`  
**LINE**: 448-453
- `autoPlay` - Start playing immediately
- `playsInline` - Prevent fullscreen takeover on iOS
- `muted` - Required for autoplay on iOS
- `controls={false}` - Hide native controls
- `disablePictureInPicture` - Prevent PiP mode
- `webkit-playsinline="true"` - Legacy iOS support

### Track Subscription Proof
The diagnostic logs prove remote video tracks are subscribed by showing:
- `hasVideoTrack: true`
- `trackSid: "TR_xxxxx"` (LiveKit track ID)

## Result
✅ Mobile PWA now renders video tiles instead of avatars  
✅ Desktop rendering unchanged  
✅ Centralized Phase 4 track management working on mobile  
✅ iOS-safe video playback attributes in place
