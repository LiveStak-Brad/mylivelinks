# Selection Engine Integration Review

**Reviewer**: Agent #3 (Selection Engine Author)  
**Date**: 2024-12-24  
**Target**: Agent #2's LiveKit Integration PR  
**Status**: ❌ **NOT INTEGRATED** - Critical Integration Missing

---

## Executive Summary

**The grid selection engine (lib/live) is NOT integrated into the LiveRoom component.**

While the selection engine was successfully implemented and tested, Agent #2 has not used it in `components/LiveRoom.tsx`. The component has placeholders for integration (sortMode, randomSeed state) but defaults to a database-driven approach with hardcoded client-side autofill logic.

---

## Integration Checklist

### ❌ 1. Selection Engine Import
**Status**: **NOT PRESENT**

```typescript
// Expected in components/LiveRoom.tsx:
import { useGridSelection } from "@/lib/live";
// OR
import { selectGridParticipants } from "@/lib/live";

// Actual: MISSING - No imports from lib/live found
```

**Finding**: The selection engine module is not imported anywhere in the component.

---

### ⚠️ 2. Identity Stability
**Status**: **PARTIALLY CORRECT**

**Current Implementation** (line 1590-1594 in LiveRoom.tsx):
```typescript
const usedStreamerIds = new Set(
  currentSlots
    .filter(s => s.streamer)
    .map(s => s.streamer!.profile_id)
);
```

✅ **GOOD**: Uses `profile_id` as identity (stable UUID)  
✅ **GOOD**: No `displayName` or `username` used as identity  
❌ **ISSUE**: This is local deduplication, not passed to selection engine

**Recommendation**: When integrating, use `profile_id` as the `identity` field:
```typescript
const participants: ParticipantLite[] = liveStreamers.map(s => ({
  identity: s.profile_id,  // ✅ Stable UUID
  hasVideo: s.is_published,
  joinedAt: parseISO(s.created_at).getTime(),
  metrics: {
    views: s.viewer_count,
    gifts: s.gifts_received_count,
    follows: s.follower_count,
  },
}));
```

---

### ❌ 3. Eligibility Correctness
**Status**: **PARTIALLY CORRECT** 

**Current Implementation** (line 1618-1626 in LiveRoom.tsx):
```typescript
const sorted = [...availableStreamers].sort((a, b) => {
  if (a.is_published !== b.is_published) {
    return a.is_published ? -1 : 1;  // Prioritize is_published
  }
  if (a.live_available !== b.live_available) {
    return a.live_available ? -1 : 1;
  }
  return b.viewer_count - a.viewer_count;
});
```

✅ **GOOD**: Uses `is_published` as primary filter (actual publishing state)  
⚠️ **CONFUSION**: Also checks `live_available` (database flag, not LiveKit state)  

**Issue**: The component queries streamers from database, not from LiveKit Room.participants. This means:
- No actual LiveKit participant integration
- `is_published` is a database flag, not real-time LiveKit publishing state
- No integration with `Room.participants` or track publication events

**Expected Integration**:
```typescript
// Get LiveKit participants from sharedRoom
const livekitParticipants = Array.from(sharedRoom.participants.values());

// Convert to ParticipantLite
const participants = livekitParticipants.map(p => ({
  identity: p.identity,  // LiveKit participant identity
  hasVideo: p.isCameraEnabled,  // REAL-TIME video publishing state
  hasAudio: p.isMicrophoneEnabled,
  joinedAt: p.joinedAt ?? Date.now(),
}));

// Use selection engine
const { selection } = useGridSelection({
  participants,
  mode: sortMode,
  seed: randomSeed,
});
```

**Current State**: LiveKit room exists (`sharedRoom`) but its participants are NOT being used for grid selection.

---

### ❌ 4. Anti-Thrash (currentSelection)
**Status**: **NOT IMPLEMENTED**

**Current Implementation**:
- `autoFillGrid` function (line 1552) rebuilds grid from scratch each time
- No `currentSelection` passed to any selection logic
- No stability mechanism to prevent constant reordering

**Finding**: The selection engine's anti-thrash feature is not being used.

**Example of Missing Logic**:
```typescript
// Current: No anti-thrash
autoFillGrid(); // Rebuilds entire grid

// Expected with selection engine:
const { selection } = useGridSelection({
  participants,
  mode: sortMode,
  currentSelection: gridSlots
    .filter(s => !s.isEmpty)
    .map(s => s.streamer!.profile_id),  // Pass current selection
  seed: randomSeed,
});
```

**Impact**: 
- Grid may reorder frequently when streamers update
- Viewers experience "thrashing" (tiles jumping around)
- Poor user experience

---

### ⚠️ 5. Seed Stability
**Status**: **GOOD BUT UNUSED**

**Current Implementation** (line 89):
```typescript
const [randomSeed] = useState<number>(() => Math.floor(Date.now() / 1000));
```

✅ **GOOD**: Seed is stable per page load (useState initializer only runs once)  
✅ **GOOD**: Not regenerated on render  
❌ **ISSUE**: randomSeed is defined but **never used** in any logic

**Current Random Logic**: When `sortMode === 'random'`, it just queries unsorted data from database (line 944):
```typescript
if (sortMode === 'random' || error) {
  const fallbackResult = await supabase.rpc('get_available_streamers_filtered', {
    p_viewer_id: user.id,
  });
  // No client-side shuffle with seed
}
```

**Expected Usage**:
```typescript
const { selection } = useGridSelection({
  participants,
  mode: sortMode,
  seed: randomSeed,  // ✅ Pass seed for deterministic random
});
```

---

### ❌ 6. Sort Mode Integration
**Status**: **PARTIALLY IMPLEMENTED**

**Current Implementation** (line 87-88, 2161-2168):
```typescript
type LiveSortMode = 'random' | 'most_viewed' | 'most_gifted' | 'newest';
const [sortMode, setSortMode] = useState<LiveSortMode>('random');

const handleSortModeChange = (mode: LiveSortMode) => {
  if (mode === sortMode) return;
  setSortMode(mode);
  loadLiveStreamers();  // Reloads from database with new mode
};
```

⚠️ **ISSUE**: Sort modes are implemented **server-side** via RPC functions, not using the selection engine.

**Current Flow**:
1. User selects sort mode
2. Component calls `loadLiveStreamers()`
3. RPC function `get_live_grid` sorts in database
4. Returns sorted list
5. Client places in grid without additional sorting

**Expected Flow**:
1. User selects sort mode
2. Selection engine sorts participants client-side
3. Grid updates instantly without database query
4. Deterministic and stable

**Missing Sort Modes**: The LiveSortMode type is missing `most_followed` which the selection engine supports:
```typescript
// Current: 'random' | 'most_viewed' | 'most_gifted' | 'newest'
// Selection Engine: 'random' | 'most_viewed' | 'most_gifted' | 'most_followed' | 'newest'
```

---

### ⚠️ 7. Manual Reorder / Focus Mode Conflict
**Status**: **POTENTIAL CONFLICT**

**Current Implementation**:
- Grid has manual drag-and-drop (line 76-77: `draggedSlot`, `hoveredSlot`)
- Grid has pinning (GridSlot.isPinned field)
- Grid has focus mode (uiPanels.focusMode)

**Issue**: If selection engine is integrated without considering manual layout, it could override user's manual arrangements.

**Recommendation**:
```typescript
// Only use selection engine when no manual layout exists
const hasManualLayout = gridSlots.some(s => s.isPinned || hasBeenManuallyArranged);

if (!hasManualLayout && !uiPanels.focusMode) {
  // Use selection engine for autofill
  const { selection } = useGridSelection({
    participants,
    mode: sortMode,
    seed: randomSeed,
    currentSelection: getCurrentSelection(),
  });
  
  // Fill only empty slots from selection
  fillEmptySlots(selection);
} else {
  // Manual layout is active, don't override
  // Only fill empty non-pinned slots
}
```

**Current State**: The pinning field exists but selection engine integration would need to respect it.

---

## Critical Issues Found

### 🔴 Issue #1: Selection Engine Not Integrated
**Severity**: Critical  
**Location**: `components/LiveRoom.tsx`  

The selection engine is not imported or used. All grid selection logic is custom-built and doesn't leverage the tested, deterministic engine.

**Fix Required**:
```typescript
// Add import
import { useGridSelection } from "@/lib/live";
import type { ParticipantLite } from "@/lib/live";

// Replace autoFillGrid logic with selection engine
const participants: ParticipantLite[] = liveStreamers.map(s => ({
  identity: s.profile_id,
  hasVideo: s.is_published,
  joinedAt: new Date(s.created_at).getTime(),
  metrics: {
    views: s.viewer_count,
    gifts: s.gifts_received_count ?? 0,
    follows: s.follower_count ?? 0,
  },
}));

const { selection, hasOverflow } = useGridSelection({
  participants,
  mode: sortMode,
  seed: randomSeed,
  currentSelection: gridSlots
    .filter(s => !s.isEmpty)
    .map(s => s.streamer!.profile_id),
  pinned: gridSlots
    .filter(s => s.isPinned && s.streamer)
    .map(s => s.streamer!.profile_id),
});
```

---

### 🔴 Issue #2: No LiveKit Participant Integration
**Severity**: Critical  
**Location**: `components/LiveRoom.tsx`  

The component has a LiveKit room connection (`sharedRoom`) but doesn't use `room.participants` for grid selection. Instead, it queries database for streamer lists.

**Current**: Database-driven selection (stale data, latency)  
**Expected**: LiveKit participant-driven selection (real-time, accurate)

**Fix Required**:
```typescript
// Track LiveKit participants
const [livekitParticipants, setLivekitParticipants] = useState<RemoteParticipant[]>([]);

useEffect(() => {
  if (!sharedRoom) return;
  
  const updateParticipants = () => {
    const participants = Array.from(sharedRoom.participants.values());
    setLivekitParticipants(participants);
  };
  
  // Initial load
  updateParticipants();
  
  // Listen for changes
  sharedRoom.on(RoomEvent.ParticipantConnected, updateParticipants);
  sharedRoom.on(RoomEvent.ParticipantDisconnected, updateParticipants);
  sharedRoom.on(RoomEvent.TrackPublished, updateParticipants);
  sharedRoom.on(RoomEvent.TrackUnpublished, updateParticipants);
  
  return () => {
    sharedRoom.off(RoomEvent.ParticipantConnected, updateParticipants);
    sharedRoom.off(RoomEvent.ParticipantDisconnected, updateParticipants);
    sharedRoom.off(RoomEvent.TrackPublished, updateParticipants);
    sharedRoom.off(RoomEvent.TrackUnpublished, updateParticipants);
  };
}, [sharedRoom]);
```

---

### 🟡 Issue #3: randomSeed Defined But Unused
**Severity**: Medium  
**Location**: Line 89 in `components/LiveRoom.tsx`

The `randomSeed` state exists but is never passed to any logic. Random mode gets unsorted data from database instead of using deterministic shuffle.

**Fix Required**: Pass seed to selection engine (see Issue #1 fix)

---

### 🟡 Issue #4: No Anti-Thrash Mechanism
**Severity**: Medium  
**Location**: `autoFillGrid` function (line 1552)

The autofill logic doesn't preserve current selection for stability. Grid may thrash when streamers update.

**Fix Required**: Pass `currentSelection` to selection engine (see Issue #1 fix)

---

### 🟢 Issue #5: Missing "most_followed" Sort Mode
**Severity**: Low  
**Location**: Line 87 type definition

The LiveSortMode type doesn't include `'most_followed'` which the selection engine supports.

**Fix Required**:
```typescript
type LiveSortMode = 'random' | 'most_viewed' | 'most_gifted' | 'most_followed' | 'newest';
```

---

## Integration Priority

### Must Have (Before Merge)
1. ✅ **Import selection engine** - Add useGridSelection import
2. ✅ **Convert streamers to ParticipantLite** - Map database streamers to engine format
3. ✅ **Pass currentSelection** - Implement anti-thrash
4. ✅ **Use randomSeed** - Pass seed to selection engine
5. ✅ **Respect pinned slots** - Pass pinned array to engine

### Should Have (Before Production)
6. ✅ **Integrate LiveKit participants** - Use room.participants instead of database queries
7. ✅ **Real-time hasVideo** - Use participant.isCameraEnabled not database flag

### Nice to Have (Can Defer)
8. ⚪ **Add most_followed mode** - Complete sort mode coverage
9. ⚪ **Conflict resolution** - Define behavior when manual layout + autofill coexist

---

## Recommended Integration Path

### Step 1: Minimal Integration (Keep Database Approach)
If you want to keep the database-driven approach for now:

```typescript
import { selectGridParticipants } from "@/lib/live";
import type { ParticipantLite } from "@/lib/live";

const autoFillGrid = useCallback(() => {
  // Convert database streamers to ParticipantLite
  const participants: ParticipantLite[] = liveStreamers.map(s => ({
    identity: s.profile_id,
    hasVideo: s.is_published,
    joinedAt: new Date(s.created_at || Date.now()).getTime(),
    metrics: {
      views: s.viewer_count,
      gifts: s.gifts_received_count ?? 0,
      follows: s.follower_count ?? 0,
    },
  }));
  
  // Get current selection for stability
  const currentSelection = gridSlots
    .filter(s => !s.isEmpty && s.streamer)
    .map(s => s.streamer!.profile_id);
  
  // Get pinned identities
  const pinned = gridSlots
    .filter(s => s.isPinned && s.streamer)
    .map(s => s.streamer!.profile_id);
  
  // Use selection engine
  const result = selectGridParticipants({
    participants,
    mode: sortMode,
    currentSelection,
    pinned,
    seed: randomSeed,
  });
  
  // Apply selection to grid
  applySelectionToGrid(result.selection);
}, [liveStreamers, gridSlots, sortMode, randomSeed]);
```

### Step 2: Full Integration (LiveKit Participants)
For proper real-time integration:

```typescript
import { useGridSelection } from "@/lib/live";

// Track LiveKit participants
const livekitParticipants = useMemo(() => {
  if (!sharedRoom) return [];
  return Array.from(sharedRoom.participants.values());
}, [sharedRoom, /* triggers on participant changes */]);

// Convert to ParticipantLite with real-time state
const participants: ParticipantLite[] = useMemo(() => {
  return livekitParticipants.map(p => {
    // Map LiveKit identity to database profile_id
    const dbStreamer = liveStreamers.find(s => s.profile_id === p.identity);
    
    return {
      identity: p.identity,
      hasVideo: p.isCameraEnabled,  // Real-time state
      hasAudio: p.isMicrophoneEnabled,
      joinedAt: p.joinedAt ?? Date.now(),
      metrics: dbStreamer ? {
        views: dbStreamer.viewer_count,
        gifts: dbStreamer.gifts_received_count,
        follows: dbStreamer.follower_count,
      } : undefined,
    };
  });
}, [livekitParticipants, liveStreamers]);

// Use hook for automatic anti-thrash
const { selection, hasOverflow } = useGridSelection({
  participants,
  mode: sortMode,
  seed: randomSeed,
  pinned: /* pinned identities */,
});

// Apply selection to grid
useEffect(() => {
  applySelectionToGrid(selection);
}, [selection]);
```

---

## Testing Checklist

After integration, verify:

- [ ] Selection engine is imported and used
- [ ] `profile_id` is used as identity (not username)
- [ ] `currentSelection` is passed for stability
- [ ] `randomSeed` is used in random mode
- [ ] Random mode produces same order on refresh (deterministic)
- [ ] Grid doesn't thrash when streamers update
- [ ] Sort modes work correctly (newest, most_viewed, most_gifted)
- [ ] Pinned participants stay pinned
- [ ] Manual drag-and-drop still works
- [ ] Focus mode doesn't conflict with autofill
- [ ] Maximum 12 tiles enforced
- [ ] Empty slots filled automatically
- [ ] Duplicate streamers prevented

---

## Conclusion

**Status**: ❌ **Integration Incomplete**

The selection engine was built correctly and is ready to use, but Agent #2 has not integrated it into the LiveRoom component. The component has placeholder state (sortMode, randomSeed) but implements its own autofill logic without using the tested selection engine.

**Recommendation**: 
1. **For MVP**: Do minimal integration (Step 1) to use selection engine with database streamers
2. **For Production**: Do full integration (Step 2) with LiveKit participants for real-time accuracy

**No code changes made** as per instructions. This is a review document only.

---

**Reviewed by**: Agent #3 (Grid Selection Engine)  
**Next Action**: Agent #2 should implement integration fixes before PR merge




