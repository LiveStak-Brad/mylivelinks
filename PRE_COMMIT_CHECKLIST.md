# Pre-Commit Checklist - Master Prompt Implementation

## ✅ Code Changes Complete

All code changes have been implemented and are ready to commit. However, **DO NOT COMMIT YET** until SQL schema is applied.

## ⚠️ REQUIRED: Run SQL First

Before committing, you MUST run the SQL schema in Supabase:

### Step 1: Run `room_presence_schema.sql` in Supabase SQL Editor

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `room_presence_schema.sql`
3. Execute the SQL
4. Verify the table was created: `SELECT * FROM room_presence LIMIT 1;`

### Step 2: Verify RPC Functions Exist

The following functions should already exist (from previous schema):
- `update_publish_state_from_viewers()` - Should exist
- `update_viewer_heartbeat()` - Should exist

If they don't exist, check `database_schema.sql` for their definitions.

## 📋 Summary of Changes

### New Files Created:
1. ✅ `room_presence_schema.sql` - SQL schema for room presence table
2. ✅ `hooks/useRoomPresence.ts` - React hook for room presence management
3. ✅ `app/api/room-presence/remove/route.ts` - API route for cleanup
4. ✅ `MASTER_PROMPT_IMPLEMENTATION.md` - Implementation documentation
5. ✅ `PRE_COMMIT_CHECKLIST.md` - This checklist

### Files Modified:
1. ✅ `components/ViewerList.tsx` - Now uses `room_presence` (global room presence)
2. ✅ `components/LiveRoom.tsx` - Added room presence tracking, enhanced autofill, self-pinning
3. ✅ `components/Tile.tsx` - Removed all preview mode UI (everything shows as LIVE)
4. ✅ `components/StreamerSelectionModal.tsx` - Removed preview badge

## 🎯 Key Features Implemented

### A) Global Room Presence ✅
- ViewerList shows everyone on `/live` page (not just tile watchers)
- Uses `room_presence` table with heartbeat
- Sorting: `live_available` users first, then others

### B) Personal Grid ✅
- Each user has independent grid layout
- Autofill runs on join
- Closing slots only affects current user

### C) Preview Mode Hidden ✅
- No "PREVIEW" badges
- No "Waiting for viewers..." text
- Everything shows as "LIVE" when `live_available`

### D) Demand-Based Publishing ✅
- Internal cost control still works
- UI always shows "LIVE" regardless of publish state
- Publishing triggers automatically when viewers join

### E) Self-Pinning ✅
- User always sees themselves in slot 1 if `live_available`
- Overrides saved layout
- Per-user experience

### F) Autofill on Join ✅
- New users see all available cameras immediately
- Fills empty slots automatically
- Triggers publishing via `active_viewers`

## 🧪 Testing Checklist

After SQL is applied and code is deployed:

- [ ] Test 1: Open `/live` in two browsers - both appear in viewer list
- [ ] Test 2: User A goes live - appears at top of viewer list, User B sees them in grid
- [ ] Test 3: User A alone - UI shows LIVE, User B joins - User A starts publishing
- [ ] Test 4: User A closes tile 3 - User B doesn't see tile 3 closed
- [ ] Test 5: User B goes live - sees themselves in slot 1, User A sees B in next slot

## 📝 Commit Message

Once SQL is applied, commit with:

```
feat: Implement master prompt - global room presence, hide preview mode, autofill on join

- Add room_presence table for global room presence (separate from tile watching)
- Update ViewerList to use room_presence instead of active_viewers
- Remove all preview mode UI - everything shows as LIVE when live_available
- Implement autofill on join - new users see all available cameras immediately
- Ensure self-pinning - user always sees themselves in slot 1 if live_available
- Update sorting: live_available users first in viewer list
- Add useRoomPresence hook for managing room presence with heartbeat
- Add room-presence/remove API route for cleanup on page unload
```

## ⚠️ IMPORTANT NOTES

1. **SQL MUST BE RUN FIRST** - The `room_presence` table must exist before deployment
2. **No Breaking Changes** - All changes are additive/refactoring, no breaking changes
3. **Backward Compatible** - Existing functionality continues to work
4. **Test Thoroughly** - Verify all acceptance tests pass before final commit







