# Chat Scoping Implementation - Complete Deliverable

## Executive Summary

✅ **Migration File**: `APPLY_CHAT_SCOPING.sql`  
✅ **Wiring Guide**: `CHAT_SCOPING_WIRING_GUIDE.md`  
✅ **All Requirements Addressed**

---

## 1. Scope Completeness ✅

**Solution**: Added BOTH columns (Option A - minimal changes)

```sql
ALTER TABLE chat_messages
ADD COLUMN room_id TEXT;              -- For group rooms ('live_central')

ALTER TABLE chat_messages  
ADD COLUMN live_stream_id INTEGER;    -- For solo streams (FK to live_streams.id)
```

**Coverage**:
- ✅ **Group rooms** (Live Central): Filtered by `room_id = 'live_central'`
- ✅ **Solo streams**: Filtered by `live_stream_id = <stream_id>`
- ✅ **Future battles/cohost**: Query `WHERE live_stream_id IN (id1, id2)` for merged view

---

## 2. Legacy Compatibility ✅

**Problem**: Existing messages have NULL values for both columns

**Solution**: Query fallback logic
```typescript
// If no scope specified, show NULL messages (legacy global chat)
query.is('room_id', null).is('live_stream_id', null)
```

**Optional Backfill** (commented out in migration):
```sql
-- Uncomment to assign existing messages to 'live_central'
UPDATE chat_messages 
SET room_id = 'live_central' 
WHERE room_id IS NULL AND live_stream_id IS NULL;
```

---

## 3. Performance + Security ✅

### Indexes:
```sql
CREATE INDEX idx_chat_messages_room_id_created 
ON chat_messages(room_id, created_at DESC)
WHERE room_id IS NOT NULL;

CREATE INDEX idx_chat_messages_stream_id_created 
ON chat_messages(live_stream_id, created_at DESC)
WHERE live_stream_id IS NOT NULL;
```

### RLS Policies:
- ✅ **Read**: Anyone can read messages from any room/stream
- ✅ **Insert**: Must be authenticated + specify room_id OR live_stream_id (not both)
- ✅ **Delete Own**: Users can delete their own messages
- ✅ **Delete Admin**: Owner/admin can moderate any message

---

## 4. Exact Code Locations ✅

### Web:
1. **`components/Chat.tsx`** (Group Room)
   - Line 107: Add `.eq('room_id', 'live_central')`
   - Line 158: Add `.eq('room_id', 'live_central')` (fallback)
   - Line 446: Add `room_id: 'live_central'` to insert
   - Line 100: Add `filter: 'room_id=eq.live_central'` to realtime subscription

2. **`components/SoloStreamViewer.tsx`** (Solo Stream Viewer)
   - Add Chat component with `liveStreamId` prop
   - OR: Update Chat.tsx to accept optional props

### Mobile:
1. **`mobile/hooks/useChatMessages.ts`**
   - Add `options?: { roomId?: string; liveStreamId?: number }` parameter
   - Filter queries by roomId or liveStreamId
   - Update realtime subscription filter

2. **`mobile/overlays/ChatOverlay.tsx`**
   - Add `roomId` and `liveStreamId` props
   - Pass to useChatMessages hook

3. **`mobile/screens/LiveRoomScreen.tsx`** (Group Room)
   - Line 534: Add `roomId="live_central"` prop to ChatOverlay

4. **`mobile/screens/SoloHostStreamScreen.tsx`** (Solo Host)
   - Replace placeholder chat with real ChatOverlay
   - Pass `liveStreamId` from host's live_streams record

5. **`mobile/screens/SoloStreamViewerScreen.tsx`** (TBD - Viewer)
   - Create new screen or add to existing
   - Pass watched streamer's `liveStreamId`

---

## 5. Confirmation: Group Rooms NOT Broken ✅

**Why it won't break**:
1. ✅ LiveRoomScreen explicitly passes `roomId="live_central"`
2. ✅ Queries filter by `room_id` to show only Live Central messages
3. ✅ Legacy NULL messages can optionally show (or backfill to 'live_central')
4. ✅ Realtime subscriptions filtered by `room_id=eq.live_central`
5. ✅ Inserts include `room_id: 'live_central'`

**No interference**:
- Solo stream messages have `live_stream_id` (NOT room_id)
- Group room messages have `room_id` (NOT live_stream_id)
- Filters ensure complete separation

---

## Implementation Steps

### Step 1: Run Migration
```bash
psql -h <supabase-host> -U postgres -d postgres < APPLY_CHAT_SCOPING.sql
```

### Step 2: Update Code (see CHAT_SCOPING_WIRING_GUIDE.md)
- Web: Update Chat.tsx and SoloStreamViewer.tsx
- Mobile: Update useChatMessages, ChatOverlay, and all screens

### Step 3: Test
- Group room chat works
- Solo stream chats are isolated
- Legacy messages handled
- Security policies work
- Performance is good

---

## Battle/Cohost Merge (Future)

When implementing:
```typescript
// Query multiple stream IDs for merged chat view
const streamIds = [streamA_id, streamB_id];
query.in('live_stream_id', streamIds);
```

**UI Flow**:
1. Default: Each streamer sees their own chat
2. Click "Merge Chats" button → queries both stream IDs
3. Click "Separate Chats" button → queries only own stream ID

Messages stay associated with their original `live_stream_id`.

---

## Files Delivered

1. ✅ **APPLY_CHAT_SCOPING.sql** - Complete migration with validation
2. ✅ **CHAT_SCOPING_WIRING_GUIDE.md** - Exact code changes + testing checklist
3. ✅ **This document** - Executive summary

All requirements from your assistant have been addressed. Ready for review and implementation!

