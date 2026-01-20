# WEB LIVE LAG OPTIMIZATION - IMPLEMENTATION PLAN

**Date:** 2026-01-18  
**Status:** IN PROGRESS  
**Goal:** Reduce lag via subscription consolidation and batched state updates

---

## COMPLETED ✅

### 1. A/B Toggle for LiveKit Configuration
**File:** `components/LiveRoom.tsx:115-125, 461-470`
- Added query param `?lk=A|B|C` to toggle adaptive streaming
- Mode A: `adaptiveStream=true, dynacast=true` (original)
- Mode B: `adaptiveStream=true, dynacast=false` (adaptive only)
- Mode C: `adaptiveStream=false, dynacast=false` (fixed quality - current default)

### 2. Removed Console Logs
**Files:**
- `app/room/[slug]/page.tsx` - Removed 3 console statements
- `components/ViewerList.tsx` - Removed 3 console statements
- `components/StreamChat.tsx` - Already cleaned (previous session)

---

## IN PROGRESS 🔄

### 3. Consolidate Realtime Subscriptions

**Current State (Per-Tile):**
- `live_streams` subscription × 12 tiles = 12 channels
- `gifts` subscription × 12 tiles = 12 channels
- **Total:** 24 tile-level channels

**Target State (Room-Level):**
- 1 `live_streams` channel for all streamers in room
- 1 `gifts` channel for all streamers in room
- **Total:** 2 room-level channels (92% reduction)

**Implementation:**
1. Add room-level subscriptions in `LiveRoom.tsx`
2. Store updates in ref maps (streamStatusMap, giftEventsMap)
3. Fan out to tiles via props
4. Remove per-tile subscriptions from `Tile.tsx`

### 4. Batch State Commits

**Pattern (from mobile):**
```typescript
const stateMapRef = useRef<Map<string, Data>>(new Map());
const commitTimerRef = useRef<NodeJS.Timeout | null>(null);

const scheduleCommit = useCallback(() => {
  if (commitTimerRef.current) return;
  commitTimerRef.current = setTimeout(() => {
    setState(Array.from(stateMapRef.current.values()));
    commitTimerRef.current = null;
  }, 50);
}, []);
```

**Apply to:**
- `liveStreamers` updates in LiveRoom
- `gridSlots` updates in LiveRoom
- Gift animation events

---

## TESTING PLAN

### A/B Test Scenarios

**Test Each Mode for 60 seconds:**

| Mode | Config | Expected Behavior |
|------|--------|-------------------|
| A | adaptive=true, dynacast=true | May show rotating lag |
| B | adaptive=true, dynacast=false | May show some lag |
| C | adaptive=false, dynacast=false | Stable quality |

**Metrics to Capture:**
1. DevTools Network tab - Total bandwidth usage
2. DevTools Performance tab - Long tasks, dropped frames
3. Visual observation - Rotating lag pattern
4. Console - Remaining timer count

**Test URL:**
- Mode A: `/room/live-central?lk=A`
- Mode B: `/room/live-central?lk=B`
- Mode C: `/room/live-central?lk=C` (default)

---

## DELIVERABLE FORMAT

```markdown
# WEB LAG OPTIMIZATION REPORT

## Channel Count
- Before: 28 active channels (2 global + 2 ViewerList + 24 Tile)
- After: 6 active channels (2 global + 2 ViewerList + 2 room-level)
- Reduction: 78%

## A/B Test Results

### Mode A (adaptive=true, dynacast=true)
- Bandwidth: X Mbps
- Frame drops: X%
- Rotating lag: Yes/No
- Long tasks: X ms avg

### Mode B (adaptive=true, dynacast=false)
- Bandwidth: X Mbps
- Frame drops: X%
- Rotating lag: Yes/No
- Long tasks: X ms avg

### Mode C (adaptive=false, dynacast=false)
- Bandwidth: X Mbps
- Frame drops: X%
- Rotating lag: Yes/No
- Long tasks: X ms avg

## Timers/Logs Removed
- Console logs: 6 removed from hot paths
- Timers: Already removed in Phase 2
- Remaining timers: X (list)

## Conclusion
[Which mode performs best and why]
```

---

## NEXT STEPS

1. Implement room-level subscriptions in LiveRoom
2. Add batched state commits
3. Remove per-tile subscriptions
4. Test all 3 modes
5. Generate report

