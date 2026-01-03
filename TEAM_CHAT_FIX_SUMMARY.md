# Teams Group Chat Fix — Complete

## ✅ What Was Fixed

### 1. **Message Persistence** (P0)
- **Hook**: `useTeamChat` in `hooks/useTeam.ts` calls `rpc_get_team_chat_messages`
- **RPC**: Fetches from `team_chat_messages` table with author info via JOIN
- **Storage**: Messages persist in `public.team_chat_messages` table
- **RLS**: Team members can read/write, mods can delete
- **Realtime**: `team_chat_messages` added to `supabase_realtime` publication

### 2. **Bottom-Up Message Flow** (P0)
- Messages sorted by `timestamp` ascending (oldest first, newest last)
- Container uses `flex-col justify-end` so first message appears near bottom
- New messages append at bottom
- Auto-scroll when user is pinned to bottom (within 120px)
- Scroll tracked via `handleScroll` callback

### 3. **Optimistic UI** (P0)
- Pending messages added to local state immediately on send
- Marked with `_isPending: true` flag
- Shows "Sending…" indicator
- Removed from pending list when server confirms (via `serverId` match)
- Input clears instantly for snappy UX

### 4. **Realtime Sync** (P1)
- Subscription to `postgres_changes` on `team_chat_messages` filtered by `team_id`
- Uses `upsertMessage` to prevent duplicates
- Fetches author profile on realtime INSERT
- Falls back to refetch if realtime is flaky

### 5. **Empty State** (UX)
- Changed from passive "No messages yet" to inviting "Say hi 👋"
- Copy: "Start the team chat and keep it rolling."
- Input placeholder: "Say hi 👋" (was "Message the team...")

### 6. **Input Bar** (UX)
- Sticky positioning with `sticky bottom-0`
- Backdrop blur for visual separation
- Reduced dead space (gap-3 between sections)
- Enter key sends (Shift+Enter for new line)
- Disabled state when muted/banned

---

## 🔍 Verification Steps

### A. Check Database Setup
Run `VERIFY_TEAM_CHAT.sql` in Supabase SQL Editor:
```sql
-- 1. Table exists
SELECT COUNT(*) FROM public.team_chat_messages;

-- 2. RPC exists
SELECT * FROM rpc_get_team_chat_messages('TEAM_ID'::uuid, 50, NULL, NULL);

-- 3. Realtime enabled
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'team_chat_messages';
```

### B. Test Message Persistence
1. **Send message** → Check browser console for RPC call
2. **Refresh page** → Messages should reappear
3. **Open incognito/second browser** → Second user should see messages
4. **Check DB**:
   ```sql
   SELECT * FROM team_chat_messages 
   WHERE team_id = 'YOUR_TEAM_ID' 
   ORDER BY created_at DESC;
   ```

### C. Test Realtime
1. Open chat in two browser windows (same team)
2. Send message from Window A
3. Window B should receive message within 1-2 seconds
4. If realtime fails, clicking "Send" triggers refetch as fallback

### D. Test Scroll Behavior
1. Send 20+ messages to fill screen
2. Scroll up → New message should NOT force scroll
3. Scroll to bottom → New message should auto-scroll
4. First message should appear near bottom (not top)

---

## 🗂️ Files Changed

### `hooks/useTeam.ts`
- ✅ Added `upsertMessage` callback for deduplication
- ✅ Switched `refreshKeyRef` to `useReducer` for stable refetch
- ✅ Sort messages by timestamp ascending
- ✅ Realtime uses `upsertMessage` instead of direct append

### `app/teams/[slug]/TeamPageContent.tsx`
- ✅ Added `PendingMessage` type
- ✅ Added optimistic UI state (`pendingMessages`, `isPinnedToBottom`)
- ✅ Auto-scroll only when pinned to bottom
- ✅ Changed empty state copy to "Say hi 👋"
- ✅ Changed input placeholder
- ✅ Added "Sending…" indicator for pending messages
- ✅ Container: `flex-col justify-end` for bottom-up layout
- ✅ Input: `sticky bottom-0 backdrop-blur`

### `supabase/migrations/20260105_team_chat_system.sql`
- ✅ Already exists (no changes needed)
- ✅ Includes table, RPC, RLS, realtime setup

---

## 🚀 Commit Message

```
Fix Teams group chat persistence + bottom-up flow

- Messages now persist to team_chat_messages table via RPC
- Messages load on refresh and sync across all team members
- Bottom-up message flow (new messages append at bottom)
- Auto-scroll when user is pinned to bottom
- Optimistic UI with pending message indicators
- Realtime subscription with upsert deduplication
- Empty state: "Say hi 👋" (inviting, not passive)
- Input bar: sticky, tightened spacing, backdrop blur

Fixes:
- Messages disappeared on refresh
- Messages didn't sync across users
- Feed-style stacking (oldest at top)
- Dead space between messages and input
- Passive empty state copy

Verification:
- Run VERIFY_TEAM_CHAT.sql in Supabase
- Test: send message → refresh → message persists
- Test: two browsers → message syncs
- Test: scroll behavior (auto-scroll when pinned)
```

---

## ❌ Known Issues / Future Work

1. **Pagination**: Currently loads last 100 messages. Need "Load More" for history.
2. **Reactions**: Schema supports reactions, but UI buttons are disabled.
3. **Replies**: Schema supports replies, but UI doesn't show thread view.
4. **Delete**: Mods can delete, but no UI button yet.
5. **Typing indicators**: Not implemented.

---

## 📋 Testing Checklist

- [ ] Message sends and appears instantly (optimistic UI)
- [ ] Message persists after page refresh
- [ ] Message visible to second user (cross-user sync)
- [ ] First message appears near bottom (not top)
- [ ] New messages append at bottom
- [ ] Auto-scroll works when pinned to bottom
- [ ] Scroll stays in place when user scrolls up
- [ ] Empty state shows "Say hi 👋"
- [ ] Input placeholder is inviting
- [ ] Enter key sends message
- [ ] Shift+Enter adds new line
- [ ] Sending spinner appears during send
- [ ] No console errors
- [ ] No duplicate messages

---

## 🆘 If Messages Still Don't Persist

### 1. Check Migration Applied
```sql
SELECT * FROM supabase_migrations.schema_migrations 
WHERE version LIKE '%team_chat%';
```

### 2. Check User Has Team Membership
```sql
SELECT * FROM team_memberships 
WHERE profile_id = auth.uid() 
  AND team_id = 'YOUR_TEAM_ID'
  AND status = 'approved';
```

### 3. Check RLS Policies Allow Insert
```sql
-- Try manual insert (should succeed if member)
INSERT INTO team_chat_messages (team_id, author_id, content)
VALUES ('YOUR_TEAM_ID'::uuid, auth.uid(), 'Test from SQL')
RETURNING *;
```

### 4. Check Browser Console
- Look for RPC errors: `[useTeamChat] Error:`
- Look for auth errors: `unauthorized`, `forbidden`
- Look for network errors in Network tab

### 5. Check Supabase Logs
- Go to Supabase Dashboard → Logs → API
- Filter by `rpc_send_team_chat_message`
- Look for errors or 403 responses

---

**End of Summary**
