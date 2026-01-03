# 🐛 Team Chat Debugging Guide

## Issue: Messages not persisting or displaying

### ✅ Confirmed Working
- Table `team_chat_messages` exists in database (verified via SQL)
- Code structure looks correct in `useTeamChat` hook
- UI components are in place

---

## 🔍 Step-by-Step Debug Process

### 1. **Check Browser Console for Errors**

Open DevTools Console and look for:

```javascript
// Expected on page load:
[useTeamChat] Error: <error message>

// Expected on send:
Failed to send message: <error message>
```

**Common errors:**
- `unauthorized` → User not authenticated
- `forbidden` → User not approved team member
- `Function not found` → RPC not deployed
- `relation does not exist` → Migration not applied

---

### 2. **Check Network Tab for RPC Calls**

**On page load**, you should see:
```
POST /rest/v1/rpc/rpc_get_team_chat_messages
Status: 200
Response: [] or [{message_id: "...", content: "...", ...}]
```

**On send**, you should see:
```
POST /rest/v1/rpc/rpc_send_team_chat_message  
Status: 200
Response: {success: true, message_id: "..."}
```

**If you see 404**: RPC function doesn't exist → migration not applied
**If you see 403/401**: RLS blocking → check team membership

---

### 3. **Test Direct DB Insert (Bypass App)**

Run in Supabase SQL Editor:

```sql
-- Get your team_id
SELECT id, slug, name FROM teams LIMIT 5;

-- Insert test message (replace TEAM_ID)
INSERT INTO public.team_chat_messages (team_id, author_id, content)
VALUES (
  'YOUR_TEAM_ID_HERE'::uuid,
  auth.uid(),
  'Test from SQL'
)
RETURNING *;

-- Verify it saved
SELECT 
  m.id,
  m.content,
  m.created_at,
  p.username
FROM public.team_chat_messages m
JOIN public.profiles p ON p.id = m.author_id
WHERE m.team_id = 'YOUR_TEAM_ID_HERE'::uuid
ORDER BY m.created_at DESC;
```

**If this fails:** RLS is blocking (check team membership)
**If this works:** Problem is in the app code or RPC

---

### 4. **Test RPC Directly**

```sql
-- Test fetch (replace with real team_id)
SELECT * FROM rpc_get_team_chat_messages(
  'YOUR_TEAM_ID_HERE'::uuid,
  50,
  NULL,
  NULL
);

-- Test send
SELECT * FROM rpc_send_team_chat_message(
  'YOUR_TEAM_ID_HERE'::uuid,
  'Test message from RPC',
  NULL
);
```

**If RPC doesn't exist:** Run migration `20260105_team_chat_system.sql`
**If RPC returns empty but DB has data:** RLS is blocking in RPC

---

### 5. **Check Team Membership**

```sql
-- Verify you're an approved member
SELECT 
  tm.status,
  tm.role,
  t.name as team_name
FROM team_memberships tm
JOIN teams t ON t.id = tm.team_id
WHERE tm.profile_id = auth.uid()
  AND tm.team_id = 'YOUR_TEAM_ID_HERE'::uuid;
```

**Expected:** `status = 'approved'`
**If not approved:** You can't chat (this is correct behavior)

---

### 6. **Add Console Logs to Hook**

Edit `hooks/useTeam.ts` line ~858:

```typescript
if (!cancelled) {
  console.log('[useTeamChat] Fetched messages:', mapped.length, mapped);
  setMessages(mapped);
}
```

**Expected console output:**
```
[useTeamChat] Fetched messages: 0 []  // If empty
[useTeamChat] Fetched messages: 5 [{id: "...", text: "..."}, ...]  // If has messages
```

**If you see 0 but DB has messages:** RPC is returning empty (RLS issue)

---

### 7. **Check Component is Mounting**

Add to `ChatScreen` component (line ~1183):

```typescript
useEffect(() => {
  console.log('[ChatScreen] Mounted, teamId:', teamId, 'messages:', messages.length);
}, [teamId, messages]);
```

**Expected:**
```
[ChatScreen] Mounted, teamId: abc-123-def messages: 0
[ChatScreen] Mounted, teamId: abc-123-def messages: 5
```

**If teamId is null:** Context not providing teamId correctly

---

## 🎯 Most Likely Issues

### Issue A: Migration Not Applied

**Symptom:** 404 on RPC calls, or "function does not exist"

**Fix:**
```bash
# Check if migration ran
SELECT * FROM supabase_migrations.schema_migrations 
WHERE name LIKE '%team_chat%';

# If missing, apply it manually:
# 1. Open supabase/migrations/20260105_team_chat_system.sql
# 2. Copy entire file
# 3. Paste into Supabase SQL Editor
# 4. Run it
```

---

### Issue B: Not a Team Member

**Symptom:** Empty messages even though DB has data, 403 errors

**Fix:**
```sql
-- Join the team as yourself
INSERT INTO team_memberships (team_id, profile_id, status, role, requested_at, approved_at)
VALUES (
  'YOUR_TEAM_ID'::uuid,
  auth.uid(),
  'approved',
  'Team_Admin',
  now(),
  now()
);
```

---

### Issue C: RLS Blocking Reads

**Symptom:** Direct DB query works, but RPC returns empty

**Check:**
```sql
-- Test if helper function exists
SELECT public.is_team_approved_member(
  'YOUR_TEAM_ID'::uuid,
  auth.uid()
);
```

**Expected:** `true`

**If false or error:** Helper function missing or broken

---

### Issue D: Messages Not Rendering (React Issue)

**Symptom:** Console shows messages fetched, but UI is empty

**Check:**
1. Open React DevTools
2. Find `ChatScreen` component
3. Check props: `messages` should be array with data
4. Check `orderedMessages` in component state

**If orderedMessages is empty but messages has data:** Logic bug in `useMemo`

---

## 🚀 Quick Test Script

Run this in browser console while on Teams chat page:

```javascript
// Check if hook is running
console.log('Current path:', window.location.pathname);

// Force refetch (if useTeamChat is exposed)
// You may need to add this temporarily to the component
```

---

## 📋 Checklist Before Asking for Help

- [ ] Checked browser console for errors
- [ ] Checked Network tab for RPC calls (200 status?)
- [ ] Ran SQL verification queries in Supabase
- [ ] Verified I'm an approved team member
- [ ] Tried direct DB insert (worked?)
- [ ] Tried RPC call directly in SQL (worked?)
- [ ] Added console.logs to `useTeamChat` hook
- [ ] Checked React DevTools component state

---

## 💡 Quick Win: Force a Test Message

```sql
-- 1. Get your team_id from URL: /teams/[slug] → find slug
SELECT id FROM teams WHERE slug = 'YOUR_SLUG_HERE';

-- 2. Force insert (as superuser, bypasses RLS)
INSERT INTO team_chat_messages (team_id, author_id, content, created_at)
VALUES (
  'TEAM_ID_FROM_STEP_1'::uuid,
  auth.uid(),
  'Debugging test message',
  now()
)
RETURNING *;

-- 3. Refresh the app → message should appear
```

---

**If messages STILL don't appear after all this, the issue is likely:**
1. Component not re-rendering when `messages` changes
2. CSS hiding the messages (check with Inspect Element)
3. Wrong `teamId` being passed to hook
