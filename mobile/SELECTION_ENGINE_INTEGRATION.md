# Selection Engine Integration - Mobile

## Summary

Agent 3's tested selection engine has been integrated into mobile. The 12-tile grid now uses **deterministic, anti-thrash selection** based on LiveKit state only.

## ✅ Integration Complete

### Files Added (3)

```
mobile/lib/live/
├── types.ts                      # ParticipantLite, SortMode, SelectionInput/Output
├── selectGridParticipants.ts     # Core selection algorithm
└── index.ts                      # Exports
```

**Source**: Copied verbatim from `lib/live/` (Agent 3's module) with no edits.

### Files Modified (1)

```
mobile/hooks/useLiveRoomParticipants.ts
```

## Key Changes

### 1. LiveKit Participants → ParticipantLite Mapping

```typescript
const toParticipantLite = (p: RemoteParticipant): ParticipantLite => {
  const hasVideo = Array.from(p.videoTrackPublications.values()).some(pub => pub.track);
  const hasAudio = Array.from(p.audioTrackPublications.values()).some(pub => pub.track);

  return {
    identity: p.identity,
    hasVideo,        // Derived from LiveKit only
    hasAudio,        // Derived from LiveKit only
    joinedAt: p.joinedAt?.getTime() || Date.now(),
    isSelf: false,
    metrics: undefined, // Not using DB metrics
  };
};
```

**Eligibility**: Derived from LiveKit only (`hasVideo === true`), NOT from DB fields like `is_published` or `live_available`.

### 2. Selection Engine Call

```typescript
const result = selectGridParticipants({
  participants: participantsLite,
  mode: sortMode,                    // 'random' by default
  currentSelection: currentSelectionRef.current,  // Persisted for anti-thrash
  seed: randomSeed,                  // Stable per session
  pinned: [],                        // No pinning in mobile yet
});
```

### 3. Anti-Thrash Persistence

```typescript
// Ref persists between renders
const currentSelectionRef = useRef<string[]>([]);

// After each selection, save for next render
currentSelectionRef.current = result.selection;
```

**Why**: Prevents grid thrashing when participants join/leave. Existing tiles stay visible unless they become ineligible.

### 4. Stable Random Seed

```typescript
const [randomSeed] = useState<number>(() => Math.floor(Date.now() / 1000));
```

**Why**: Same seed throughout session = deterministic random order. No flickering on rerender.

### 5. Sort Mode

```typescript
const [sortMode] = useState<SortMode>('random');
```

**Current**: Always 'random' mode.  
**Future**: Could be configurable ('newest', 'most_viewed', etc.) but would require metrics from Supabase.

## Selection Rules (from Agent 3's Engine)

1. **Eligibility**: Must have `hasVideo === true` (publishing video)
2. **Max 12**: Only 12 participants displayed at once
3. **Anti-thrash**: Preserve current selection when possible
4. **Deterministic random**: Same seed + same participants = same order
5. **Pinning support**: Ready for pinned tiles (not used yet)

## What Changed from Previous Implementation

### Before (Simple "LiveKit Order")

```typescript
participants.forEach((p, idx) => {
  if (idx < TOTAL_TILES) {
    items.push({ id: p.identity, participant: p, isAutofill: false });
  }
});
```

**Issues**:
- Just took first 12 in whatever order LiveKit gave
- No stability (could thrash on every update)
- No deterministic ordering

### After (Selection Engine)

```typescript
const result = selectGridParticipants({
  participants: participantsLite,
  mode: sortMode,
  currentSelection: currentSelectionRef.current,
  seed: randomSeed,
});
```

**Improvements**:
- ✅ Deterministic (same seed = same order)
- ✅ Anti-thrash (preserves current selection)
- ✅ Stable random mode
- ✅ Ready for other sort modes
- ✅ Tested algorithm (Agent 3's unit tests)

## Debug Logging

When `EXPO_PUBLIC_DEBUG_LIVE=1`:

```
[SELECTION] Grid selection: {
  total: 15,
  eligible: 12,
  selected: 12,
  mode: 'random',
  reason: 'Selected top 12 from 12 eligible'
}
```

## Grid12 Unchanged

The Grid12 component is **completely unchanged**. It still:
- Renders 12 tiles
- Never unmounts
- Supports reordering (tileSlots)
- Handles focus mode
- Preserves all gestures

**What changed**: The participants it receives are now filtered by the selection engine.

## No DB Dependencies

**CRITICAL**: Mobile does NOT use DB fields for selection:

❌ `is_published` - Not checked  
❌ `live_available` - Not checked  
❌ `viewer_count` - Not used for gating  
❌ Metrics (views/gifts/follows) - Not loaded yet  

✅ `hasVideo` - Derived from LiveKit track publications  
✅ `hasAudio` - Derived from LiveKit track publications  
✅ `joinedAt` - From LiveKit participant  

**Why**: Mobile is viewer-only and uses LiveKit as source of truth for who's streaming.

## Performance

- **Selection**: O(n log n) where n = total participants (typically < 20)
- **Anti-thrash**: Reduces unnecessary tile recreation
- **Deterministic**: No random flicker on rerender
- **Stable seed**: Consistent across session

## Future Enhancements

1. **Sort modes**: Add UI to switch between 'random', 'newest', 'most_viewed'
2. **Metrics**: Load views/gifts/follows from Supabase for sorting
3. **Pinning**: Allow users to pin favorite streamers
4. **Dynamic seed**: Change seed periodically for variety

## Testing

### Unit Tests (from Agent 3)

Agent 3's selection engine includes comprehensive unit tests:
- `lib/live/selectGridParticipants.test.ts`

These tests verify:
- Max 12 selection
- Anti-thrash behavior
- Deterministic random
- Pinning logic
- Edge cases

### Manual Testing

1. **Web goes live** → Mobile should show video within 2-3 seconds
2. **Multiple web users** → Mobile shows up to 12
3. **User leaves** → Tile removed, others stay stable
4. **Rapid join/leave** → No thrashing (existing tiles preserved)
5. **Rerender** → Same order (deterministic seed works)

## Commit Message

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
```

## Status: ✅ COMPLETE

Mobile now uses Agent 3's tested selection engine for stable, deterministic 12-tile selection. No DB dependencies. All gestures preserved.

