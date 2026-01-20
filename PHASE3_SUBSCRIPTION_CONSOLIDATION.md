# PHASE 3: SUBSCRIPTION CONSOLIDATION - IMPLEMENTATION GUIDE

**Date:** 2026-01-18  
**Status:** IN PROGRESS  
**Goal:** Eliminate per-tile subscriptions, move to room-level with batched commits

---

## ARCHITECTURE CHANGE

### Current (Per-Tile) - 24 Channels
```
Tile.tsx (×12):
  - live_streams subscription per tile (12 channels)
  - gifts subscription per tile (12 channels)
  - LiveKit event listeners per tile
  - Direct state updates on every event
```

### Target (Room-Level) - 2 Channels
```
LiveRoom.tsx:
  - 1 live_streams subscription (all streamers)
  - 1 gifts subscription (all streamers)
  - LiveKit events managed centrally
  - Batched commits (50-100ms debounce)
  - Fan out via props to Tiles

Tile.tsx:
  - Pure render component
  - Receives data via props only
  - No subscriptions
  - No event listeners
```

---

## CHANGES REQUIRED

### 1. LiveRoom.tsx - Add Room-Level State Management ✅ STARTED

**Lines 158-197:** Added batched commit infrastructure
```typescript
// PHASE 3: Room-level subscription state with batched commits
const streamStatusMapRef = useRef<Map<string, { ended: boolean; liveAvailable: boolean }>>(new Map());
const giftEventsMapRef = useRef<Map<string, any[]>>(new Map());
const streamStatusCommitTimerRef = useRef<NodeJS.Timeout | null>(null);
const giftEventsCommitTimerRef = useRef<NodeJS.Timeout | null>(null);

const scheduleStreamStatusCommit = useCallback(() => {
  if (streamStatusCommitTimerRef.current) return;
  streamStatusCommitTimerRef.current = setTimeout(() => {
    // Process updates from map
    // Commit to state
    // Clear map
  }, 50);
}, []);

const scheduleGiftEventsCommit = useCallback(() => {
  if (giftEventsCommitTimerRef.current) return;
  giftEventsCommitTimerRef.current = setTimeout(() => {
    // Process gift events from map
    // Commit to state
    // Clear map
  }, 100);
}, []);
```

### 2. LiveRoom.tsx - Add Room-Level Gifts Subscription ⏳ TODO

**Location:** After live_streams subscription (~line 1350)

```typescript
// PHASE 3: Room-level gifts subscription
useEffect(() => {
  if (!currentUserId) return;
  
  // Get all streamer IDs currently in room
  const streamerIds = liveStreamers.map(s => s.profile_id);
  if (streamerIds.length === 0) return;
  
  const giftsChannel = supabase
    .channel('room-gifts')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'gifts',
      },
      async (payload: any) => {
        const gift = payload.new as any;
        
        // Only process if recipient is in current room
        if (!streamerIds.includes(gift.recipient_id)) return;
        
        // Fetch sender and gift type
        const [senderProfile, giftType] = await Promise.all([
          supabase.from('profiles').select('username').eq('id', gift.sender_id).single(),
          supabase.from('gift_types').select('name, icon_url').eq('id', gift.gift_type_id).single(),
        ]);
        
        if (senderProfile.data && giftType.data) {
          // Store in map
          const existing = giftEventsMapRef.current.get(gift.recipient_id) || [];
          giftEventsMapRef.current.set(gift.recipient_id, [
            ...existing,
            {
              id: `${gift.id}-${Date.now()}`,
              giftName: giftType.data.name,
              giftIcon: giftType.data.icon_url,
              senderUsername: senderProfile.data.username,
              coinAmount: gift.coin_amount,
            }
          ]);
          
          // Schedule batched commit
          scheduleGiftEventsCommit();
        }
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(giftsChannel);
  };
}, [liveStreamers, currentUserId, supabase, scheduleGiftEventsCommit]);
```

### 3. LiveRoom.tsx - Pass Gift Events to Tiles ⏳ TODO

**Location:** Tile rendering section (~line 3200)

Add prop to Tile component:
```typescript
<Tile
  // ... existing props
  giftAnimations={giftEvents.get(slot.streamer?.profile_id || '') || []}
  onGiftAnimationComplete={(giftId) => {
    // Remove completed animation from map
    setGiftEvents(prev => {
      const newMap = new Map(prev);
      const streamerId = slot.streamer?.profile_id || '';
      const animations = newMap.get(streamerId) || [];
      newMap.set(streamerId, animations.filter(a => a.id !== giftId));
      return newMap;
    });
  }}
/>
```

### 4. Tile.tsx - Remove Supabase Subscriptions ⏳ TODO

**Lines to Remove:** 1043-1129

Remove these useEffect blocks:
```typescript
// REMOVE: Per-tile live_streams subscription (lines 1043-1071)
useEffect(() => {
  if (!liveStreamId) return;
  const streamChannel = supabase
    .channel(`stream-status:${liveStreamId}`)
    // ... subscription code
}, [liveStreamId, ...]);

// REMOVE: Per-tile gifts subscription (lines 1073-1129)
useEffect(() => {
  if (!streamerId || !liveStreamId) return;
  const giftsChannel = supabase
    .channel(`gifts:recipient:${streamerId}`)
    // ... subscription code
}, [streamerId, liveStreamId, ...]);
```

### 5. Tile.tsx - Add Gift Animation Props ⏳ TODO

**Lines to Modify:** TileProps interface (~line 25)

```typescript
interface TileProps {
  // ... existing props
  giftAnimations?: GiftAnimationData[]; // NEW: Receive from parent
  onGiftAnimationComplete?: (giftId: string) => void; // NEW: Callback when animation done
}
```

**Lines to Modify:** Gift animation rendering (~line 1120)

Replace `activeGiftAnimations` state with `giftAnimations` prop:
```typescript
// BEFORE:
const [activeGiftAnimations, setActiveGiftAnimations] = useState<GiftAnimationData[]>([]);

// AFTER:
// Use giftAnimations prop directly
{giftAnimations?.map((animation) => (
  <GiftAnimation
    key={animation.id}
    giftName={animation.giftName}
    giftIcon={animation.giftIcon}
    senderUsername={animation.senderUsername}
    coinAmount={animation.coinAmount}
    onComplete={() => onGiftAnimationComplete?.(animation.id)}
  />
))}
```

### 6. Remove ALL Console Logs ⏳ TODO

**Files to Clean:**
- `components/Tile.tsx` - Remove ALL console.* (even DEBUG_LIVEKIT gated)
- `components/LiveRoom.tsx` - Remove ALL console.* from hot paths
- `components/ViewerList.tsx` - Already cleaned ✅
- `components/StreamChat.tsx` - Already cleaned ✅

**Rule:** No console.* in:
- useEffect hooks
- Event handlers
- Track subscription callbacks
- Realtime event handlers

---

## TESTING CHECKLIST

After implementation:

### Channel Count Verification
```javascript
// In browser console:
// 1. Open DevTools → Network tab → WS filter
// 2. Count active WebSocket frames
// Expected: ~6-8 channels (down from 28)
```

### Re-render Verification
```javascript
// In React DevTools → Profiler
// 1. Record 30 seconds
// 2. Check Tile component render count
// Expected: <10 renders per tile in 30s
```

### Functional Verification
- [ ] Tiles still show video correctly
- [ ] Gift animations still appear
- [ ] Stream end closes tile correctly
- [ ] Viewer list updates correctly
- [ ] Chat messages appear correctly
- [ ] No rotating lag (test all 3 lk modes)

---

## ACCEPTANCE CRITERIA

✅ **Channel Reduction:**
- Before: 28 active channels
- After: 6-8 active channels
- Reduction: 70-78%

✅ **No Rotating Lag:**
- Test Mode A, B, C
- 60 seconds each
- No cascading lag pattern

✅ **Minimal Re-renders:**
- Tile re-renders <10 per 30 seconds
- State updates batched (50-100ms)
- No render storms on realtime events

✅ **Functional Correctness:**
- All features work as before
- No regressions
- Viewer list accurate
- Chat functional

---

## IMPLEMENTATION ORDER

1. ✅ Add batched commit infrastructure (LiveRoom state management)
2. ⏳ Add room-level gifts subscription (LiveRoom)
3. ⏳ Pass gift events to Tiles via props (LiveRoom → Tile)
4. ⏳ Remove per-tile Supabase subscriptions (Tile.tsx)
5. ⏳ Update Tile to use gift animation props (Tile.tsx)
6. ⏳ Remove ALL console.* from hot paths (all files)
7. ⏳ Test and verify acceptance criteria

---

## CURRENT STATUS

**Completed:**
- Batched commit infrastructure added to LiveRoom
- streamStatusMapRef and giftEventsMapRef created
- scheduleStreamStatusCommit and scheduleGiftEventsCommit callbacks added

**Next Steps:**
1. Add room-level gifts subscription in LiveRoom
2. Wire up gift events to Tile props
3. Remove per-tile subscriptions from Tile.tsx
4. Remove all console logs
5. Test and verify

