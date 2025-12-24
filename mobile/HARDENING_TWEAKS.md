# Hardening Tweaks - Mobile Selection Engine

## Summary

Two stability improvements to the selection engine integration before merge.

## 1. Stable `joinedAt` Per Identity

### Problem
```typescript
// Before
joinedAt: p.joinedAt?.getTime() || Date.now()
```

If `p.joinedAt` is missing, `Date.now()` returns a different value each render, causing unstable sorting.

### Solution
```typescript
// Track first seen timestamp per identity
const firstSeenTimestampRef = useRef<Map<string, number>>(new Map());

// In toParticipantLite
let joinedAt: number;
if (p.joinedAt) {
  joinedAt = p.joinedAt.getTime();
  // Cache for future use
  if (!firstSeenTimestampRef.current.has(p.identity)) {
    firstSeenTimestampRef.current.set(p.identity, joinedAt);
  }
} else {
  // Use cached or create stable timestamp
  if (firstSeenTimestampRef.current.has(p.identity)) {
    joinedAt = firstSeenTimestampRef.current.get(p.identity)!;
  } else {
    joinedAt = Date.now();
    firstSeenTimestampRef.current.set(p.identity, joinedAt);
  }
}
```

**Result**: Each identity gets a stable `joinedAt` that doesn't change across renders.

## 2. Stable Random Seed Across App Relaunches

### Problem
```typescript
// Before
const [randomSeed] = useState(() => Math.floor(Date.now() / 1000));
```

Seed changes every time app launches, causing random mode to reshuffle on relaunch.

### Solution
```typescript
// Persist seed to SecureStore
const [randomSeed, setRandomSeed] = useState<number>(0);

useEffect(() => {
  const loadOrCreateSeed = async () => {
    try {
      const { getItemAsync, setItemAsync } = await import('expo-secure-store');
      const stored = await getItemAsync('mylivelinks_random_seed');
      if (stored) {
        setRandomSeed(parseInt(stored, 10));
      } else {
        const newSeed = Math.floor(Date.now() / 1000);
        await setItemAsync('mylivelinks_random_seed', String(newSeed));
        setRandomSeed(newSeed);
      }
    } catch (error) {
      console.warn('[SEED] SecureStore error, using session seed:', error);
      setRandomSeed(Math.floor(Date.now() / 1000));
    }
  };
  loadOrCreateSeed();
}, []);
```

**Result**: 
- Seed persists across app relaunches
- Random mode shows same order each time (unless participants change)
- Fallback to session seed if SecureStore fails

## Why These Matter

### Stable `joinedAt`
- **Prevents**: Sort order flickering on rerenders
- **Ensures**: "Newest" mode works correctly even if LiveKit loses join time
- **Guarantees**: Each identity has consistent timestamp throughout session

### Stable Random Seed
- **Prevents**: Random reshuffle on every app relaunch
- **Ensures**: Users see consistent grid across sessions
- **Improves**: User experience (familiar layout)

## Testing

### Test 1: Stable joinedAt
1. Connect to room
2. Note participant order
3. Force rerender (e.g., toggle overlay)
4. **Verify**: Order unchanged

### Test 2: Stable Random Seed
1. Launch app, note grid order
2. Kill app completely
3. Relaunch app
4. **Verify**: Same grid order (if same participants present)

## Cleanup

```typescript
// Clear map on unmount
return () => {
  // ...existing cleanup...
  firstSeenTimestampRef.current.clear();
};
```

## Files Modified

```
mobile/hooks/useLiveRoomParticipants.ts
```

- Added `firstSeenTimestampRef` Map for stable joinedAt
- Added SecureStore persistence for randomSeed
- Updated `toParticipantLite` to use stable joinedAt
- Added cleanup for firstSeenTimestampRef

## Commit Message (Append to Previous)

```
Integrate selection engine for stable 12-tile grid (deterministic + anti-thrash)

- Copy Agent 3's selection engine (lib/live/) to mobile
- Map LiveKit participants to ParticipantLite format
- Eligibility derived from LiveKit only (hasVideo, not DB flags)
- Call selectGridParticipants with stable seed for deterministic random
- Persist currentSelection between renders for anti-thrash
- Remove simple "first 12" logic in favor of tested algorithm
- No DB dependencies (no is_published, live_available, viewer_count)
- Grid12 component unchanged, all gestures preserved

Hardening tweaks:
- Use Map<identity, timestamp> ref for stable joinedAt fallback
- Persist random seed to SecureStore (survives app relaunch)
- Clear firstSeen cache on unmount
```

## Status: ✅ COMPLETE

Both hardening tweaks applied. Selection engine is now fully stable across renders and app relaunches.

