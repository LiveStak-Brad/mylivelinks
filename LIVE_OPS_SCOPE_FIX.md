# Scope Violation Fix - Live Ops Backend Endpoints

## Issue
Original implementation invented backend API endpoints (`/api/admin/streams/live`, etc.) which violated scope.

## Fix Applied

### ✅ Created Stub Hook Layer (Web & Mobile)

**Web Hook**: `hooks/useOwnerLiveOpsData.ts`
**Mobile Hook**: `mobile/hooks/useOwnerLiveOpsData.ts`

Both hooks provide:
```typescript
interface UseOwnerLiveOpsDataReturn {
  streams: LiveOpsStreamData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

### ✅ Removed All Invented API Endpoints

**Before** (WRONG):
```typescript
const res = await fetch('/api/admin/streams/live');
```

**After** (CORRECT):
```typescript
const { streams, loading, error, refetch } = useOwnerLiveOpsData();
```

### ✅ Mock Data Properly Isolated

- Mock data generator lives ONLY inside the hook
- Gated behind `__DEV__` check:
  ```typescript
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    setStreams(generateMockStreams());
  }
  ```
- Returns empty array in production
- No random numbers in UI components
- Clean separation of concerns

### ✅ Updated All Components

**Web Components:**
- ✅ `app/owner/live-ops/page.tsx` - Uses `useOwnerLiveOpsData()` hook
- ✅ `components/owner/StreamRow.tsx` - Uses `LiveOpsStreamData` type from hook
- ✅ `components/owner/StreamDetailDrawer.tsx` - Uses `LiveOpsStreamData` type from hook
- ✅ Removed local `generateMockStreams()` function

**Mobile Components:**
- ✅ `mobile/screens/LiveOpsScreen.tsx` - Uses `useOwnerLiveOpsData()` hook
- ✅ `mobile/components/owner/StreamCard.tsx` - Uses `LiveOpsStreamData` type from hook
- ✅ `mobile/components/owner/StreamDetailSheet.tsx` - Uses `LiveOpsStreamData` type from hook
- ✅ Removed local `generateMockStreams()` function

### ✅ Updated Exports

- ✅ `hooks/index.ts` - Exports `useOwnerLiveOpsData` and `LiveOpsStreamData` type
- ✅ `components/owner/index.ts` - Removed `LiveStreamData` export (now from hook)

### ✅ Updated Documentation

- ✅ `UI_AGENT_3_LIVE_OPS_DELIVERABLE.md` - Removed API endpoint claims
- ✅ `MOBILE_LIVE_OPS_DELIVERABLE.md` - Removed API endpoint claims
- Both docs now correctly describe the stub hook approach

## Files Changed

### Created (2 files):
1. `hooks/useOwnerLiveOpsData.ts` - Web hook stub
2. `mobile/hooks/useOwnerLiveOpsData.ts` - Mobile hook stub

### Modified (9 files):
1. `hooks/index.ts` - Export hook and types
2. `app/owner/live-ops/page.tsx` - Use hook instead of fetch
3. `components/owner/StreamRow.tsx` - Use hook type
4. `components/owner/StreamDetailDrawer.tsx` - Use hook type
5. `components/owner/index.ts` - Remove local type export
6. `mobile/screens/LiveOpsScreen.tsx` - Use hook instead of fetchAuthed
7. `mobile/components/owner/StreamCard.tsx` - Use hook type
8. `mobile/components/owner/StreamDetailSheet.tsx` - Use hook type
9. `UI_AGENT_3_LIVE_OPS_DELIVERABLE.md` - Remove endpoint claims
10. `MOBILE_LIVE_OPS_DELIVERABLE.md` - Remove endpoint claims

## Commit Hash
```
b65696950f6f9f35d56b5a7ce10cfd06decef74e
```

## Verification

✅ No linter errors
✅ All components use hook
✅ No hard-coded API endpoints
✅ Mock data in hook only
✅ __DEV__ gated properly
✅ Types exported from hook
✅ Documentation updated
✅ Clean git commit

## Backend Integration Path (For Other Agents)

The `useOwnerLiveOpsData` hook is a **stub** that backend integration agents will wire up:

1. Replace stub implementation with actual data fetching
2. Use same return interface (no UI changes needed)
3. Same types work for both web and mobile
4. UI is completely decoupled from backend implementation

## Summary

**Problem**: Invented API endpoints  
**Solution**: Stub hook layer with proper separation  
**Result**: Clean, wire-ready UI that doesn't assume backend contracts  

All Live Ops UI now properly consumes data from the hook stub layer, ready for backend agents to implement the actual data source.


