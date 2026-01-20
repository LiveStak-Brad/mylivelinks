# Live Join Routing Fix - Test Checklist

## Summary
Fixed live join routing so users are directed to the correct destination based on streaming mode (solo vs group) instead of always defaulting to solo viewer.

## What Was Changed

### 1. Data Layer (Backend)
**File**: `supabase/migrations/20260119_watch_feed_add_room_key.sql`
- Added `room_key` column to `rpc_get_watch_feed` output
- For group lives: returns `'live_central'` as room_key
- For solo lives: returns `NULL` (routing uses username instead)
- Backward compatible: uses `COALESCE(ls.streaming_mode, 'group')` to handle missing column

### 2. Shared Routing Logic (Web)
**File**: `lib/liveJoinTarget.ts`
- Created canonical `LiveLocation` data contract
- Created `parseLiveLocation()` helper to extract routing info from items
- Created `getLiveJoinTargetWeb()` to determine correct web route:
  - `group` → `/room/[slug]` (e.g., `/room/live-central`)
  - `solo` → `/live/[username]`
  - `battle_solo` → `/battle/[battleId]` (future)
  - `battle_group` → `/room/[slug]?battle=[battleId]` (future)

### 3. Shared Routing Logic (Mobile)
**File**: `apps/mobile/lib/liveJoinTarget.ts`
- Same logic as web but returns mobile navigation targets
- `group` → `RoomScreen` with slug param
- `solo` → `LiveUserScreen` with username param

### 4. Web Components Updated
**Files**:
- `hooks/useWatchFeed.ts`: Added `roomKey` mapping from RPC
- `components/watch/WatchContentItem.tsx`: Added `roomKey` to interface, passed to LiveStreamPreview
- `components/watch/LiveStreamPreview.tsx`: Uses `getLiveJoinTargetWeb()` instead of hardcoded routes
- `components/watch/WatchScreen.tsx`: Comment click handler uses canonical routing

### 5. Mobile Components Updated
**Files**:
- `apps/mobile/hooks/useWatchFeed.ts`: Added `streamingMode` and `roomKey` to WatchItem interface and mapping
- `apps/mobile/screens/WatchScreen.tsx`: `handleLiveItemPress()` uses `getLiveJoinTargetMobile()`
- `apps/mobile/screens/ProfileViewScreen.tsx`: Live banner uses `getLiveJoinTargetMobile()`

## Test Matrix

### ✅ Test 1: Solo Live Stream in Watch Feed
**Setup**: User A goes live in solo mode
**Steps**:
1. Open Watch feed (web or mobile)
2. Scroll to User A's live item
3. Tap/click the live preview

**Expected**: Navigate to `/live/userA` (web) or `LiveUserScreen` (mobile)
**Actual**: ___________

### ✅ Test 2: Group Live Stream in Watch Feed
**Setup**: User B goes live in group mode (live-central)
**Steps**:
1. Open Watch feed (web or mobile)
2. Scroll to User B's live item
3. Tap/click the live preview

**Expected**: Navigate to `/room/live-central` (web) or `RoomScreen` with slug='live_central' (mobile)
**Actual**: ___________

### ✅ Test 3: Solo Live from Profile
**Setup**: User C is live in solo mode
**Steps**:
1. Navigate to User C's profile
2. See "LIVE" banner
3. Tap/click "Watch Live"

**Expected**: Navigate to `/live/userC` (web) or `LiveUserScreen` (mobile)
**Actual**: ___________

### ✅ Test 4: Group Live from Profile
**Setup**: User D is live in group mode
**Steps**:
1. Navigate to User D's profile
2. See "LIVE" banner
3. Tap/click "Watch Live"

**Expected**: Navigate to `/room/live-central` (web) or `RoomScreen` (mobile)
**Actual**: ___________

### ✅ Test 5: Comment on Solo Live (Web Only)
**Setup**: User E is live in solo mode
**Steps**:
1. Open Watch feed on web
2. Scroll to User E's live item
3. Click the comment button

**Expected**: Navigate to `/live/userE`
**Actual**: ___________

### ✅ Test 6: Comment on Group Live (Web Only)
**Setup**: User F is live in group mode
**Steps**:
1. Open Watch feed on web
2. Scroll to User F's live item
3. Click the comment button

**Expected**: Navigate to `/room/live-central`
**Actual**: ___________

### ✅ Test 7: Legacy Item Handling
**Setup**: Old live item with missing `streaming_mode` field
**Steps**:
1. Ensure RPC returns NULL for streaming_mode
2. Item appears in feed

**Expected**: Defaults to group mode (backward compatible), routes to `/room/live-central`
**Actual**: ___________

### ✅ Test 8: Missing Required Fields
**Setup**: Live item with mode='group' but no room_key
**Steps**:
1. Manually create malformed item
2. Tap/click to join

**Expected**: Console error logged, no navigation (graceful failure)
**Actual**: ___________

## Verification Commands

### Check RPC Output
```sql
-- Verify room_key is returned for group lives
SELECT 
  item_id, 
  item_type, 
  streaming_mode, 
  room_key,
  author_username
FROM rpc_get_watch_feed('live_only', 'for_you', 10)
WHERE item_type = 'live';
```

### Check Live Streams Table
```sql
-- Verify streaming_mode exists and is populated
SELECT 
  id, 
  profile_id, 
  streaming_mode,
  started_at,
  ended_at
FROM live_streams
WHERE ended_at IS NULL
ORDER BY started_at DESC
LIMIT 10;
```

## Rollback Plan
If issues arise:
1. Revert migration: Drop and recreate `rpc_get_watch_feed` without `room_key` column
2. Revert web components to use `streamingMode` check with hardcoded 'live-central'
3. Revert mobile to always route to `LiveUserScreen`

## Notes
- Room key normalization: `live_central` (DB) → `live-central` (URL) handled in routing helpers
- Battle modes are stubbed but not fully implemented yet
- No new timers or polling added
- Backward compatible with existing live streams
