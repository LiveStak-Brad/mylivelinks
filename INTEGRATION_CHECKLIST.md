# Selection Engine Integration Checklist

**Quick Reference for Agent #2**

## ❌ Critical Issues (Must Fix Before Merge)

- [ ] **Selection engine NOT imported** - No `import { useGridSelection } from "@/lib/live"`
- [ ] **Selection engine NOT used** - Custom autofill logic instead of tested engine
- [ ] **randomSeed defined but unused** - Exists at line 89 but never passed to any function
- [ ] **No currentSelection passed** - Anti-thrash mechanism not implemented
- [ ] **No LiveKit participant integration** - Using database queries instead of `room.participants`

## ⚠️ Medium Priority Issues

- [ ] **Database `is_published` vs LiveKit state** - Not using real-time `participant.isCameraEnabled`
- [ ] **Sort modes work server-side only** - Should use client-side selection engine for instant updates
- [ ] **Grid thrashing possible** - autoFillGrid rebuilds from scratch without stability

## ✅ What's Already Good

- ✅ Uses `profile_id` as identity (stable UUID)
- ✅ `randomSeed` is stable per page load (useState initializer)
- ✅ No displayName used as identity
- ✅ Pinning infrastructure exists (GridSlot.isPinned)
- ✅ Sort mode state exists

## 🚀 Quick Fix (30 minutes)

**Add to top of LiveRoom.tsx:**
```typescript
import { selectGridParticipants } from "@/lib/live";
import type { ParticipantLite } from "@/lib/live";
```

**Replace autoFillGrid function (line 1552) with:**
```typescript
const autoFillGrid = useCallback(() => {
  const participants: ParticipantLite[] = liveStreamers.map(s => ({
    identity: s.profile_id,
    hasVideo: s.is_published,
    joinedAt: new Date(s.created_at || Date.now()).getTime(),
    metrics: { views: s.viewer_count, gifts: s.gifts_received_count ?? 0 },
  }));
  
  const currentSelection = gridSlots
    .filter(s => !s.isEmpty && s.streamer)
    .map(s => s.streamer!.profile_id);
  
  const result = selectGridParticipants({
    participants,
    mode: sortMode,
    currentSelection,
    seed: randomSeed,
  });
  
  // Apply result.selection to grid...
}, [liveStreamers, gridSlots, sortMode, randomSeed]);
```

## 📋 Required Fixes Summary

| Issue | Location | Severity | Fix Time |
|-------|----------|----------|----------|
| Selection engine not imported | Top of file | 🔴 Critical | 1 min |
| Selection engine not used | autoFillGrid (line 1552) | 🔴 Critical | 20 min |
| randomSeed unused | Line 89 defined, nowhere used | 🔴 Critical | 5 min |
| No currentSelection | autoFillGrid function | 🟡 Medium | 10 min |
| Missing LiveKit participants | Throughout | 🟡 Medium | 2 hours |

**Total Time to Fix Critical Issues**: ~30 minutes  
**Total Time for Full Integration**: ~3 hours

## 📄 Full Review Document

See `SELECTION_ENGINE_INTEGRATION_REVIEW.md` for:
- Detailed issue analysis
- Code examples for each fix
- Step-by-step integration guide
- Testing checklist

---

**Status**: ❌ Integration Incomplete  
**Action Required**: Agent #2 must integrate selection engine before PR merge

