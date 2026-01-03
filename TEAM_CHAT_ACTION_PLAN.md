# Team Chat Debug - Action Plan & Resolution

## Current Status

**Problem:** Team chat messages exist in database but don't display in UI
**Error:** `42804: structure of query does not match function result type`
**Location:** `POST .../rpc/rpc_get_team_chat_messages_v3` returns 400

## Files Created for Diagnosis

| File | Purpose | When to Use |
|------|---------|-------------|
| `DIAGNOSE_TEAM_CHAT_V3.sql` | Verify function exists & test direct call | Run first |
| `FIX_TEAM_CHAT_RPC_V3_NO_ROLE.sql` | Re-apply V3 function without author_role | If V3 missing |
| `FORCE_POSTGREST_RELOAD_V3.sql` | Force PostgREST to reload schema | After applying V3 |
| `APPLY_V4_FUNCTION.sql` | Create V4 to bypass cache | **RECOMMENDED** |
| `CREATE_MINIMAL_CHAT_RPC.sql` | Minimal test RPC | If all else fails |
| `TEAM_CHAT_FIX_GUIDE.md` | Comprehensive troubleshooting guide | Reference |

## Recommended Resolution (Fastest Path)

### Step 1: Apply V4 Function
Run `APPLY_V4_FUNCTION.sql` in Supabase SQL Editor. This creates a new function with a different name to bypass PostgREST's schema cache.

### Step 2: Update Client Code
The client needs to call `v4` instead of `v3`. File to update: `hooks/useTeam.ts`

**Change on line 833:**
```typescript
// FROM:
const { data, error: rpcError } = await supabase.rpc('rpc_get_team_chat_messages_v3', {

// TO:
const { data, error: rpcError } = await supabase.rpc('rpc_get_team_chat_messages_v4', {
```

### Step 3: Verify
1. Save the file
2. Hard refresh browser (Ctrl+Shift+R)
3. Check console for:
   - ✅ No 42804 errors
   - ✅ `[useTeamChat] ✅ Fetched N messages`
   - ✅ Messages display in UI

## Why V4 Instead of V3?

The V3 function logic is correct (no author_role column), but PostgREST's schema cache is persistently serving an old definition. Creating V4 with a new name forces PostgREST to recognize it as a new endpoint, bypassing the cache entirely.

## Alternative Paths (If V4 Fails)

### Path A: Minimal Test RPC
If even V4 fails, use the minimal RPC to isolate the issue:
1. Run `CREATE_MINIMAL_CHAT_RPC.sql`
2. Update client to call `test_get_team_messages`
3. If this works, the issue is with query complexity

### Path B: Direct SQL Diagnosis
Run `DIAGNOSE_TEAM_CHAT_V3.sql` to check:
- Does function exist?
- Does direct SQL call work?
- Are there messages in the table?

## Post-Fix Cleanup

Once messages are loading:
1. Remove debug logging from `hooks/useTeam.ts` (lines 830-877)
2. Remove debug logging from `TeamPageContent.tsx` (lines 1546-1600)
3. Test with multiple team members
4. Verify realtime updates work
5. Test sending new messages

## Technical Details

**Root Cause:** PostgREST schema caching
- PostgREST caches function signatures on startup
- `NOTIFY pgrst, 'reload schema'` should reload but doesn't always work
- Changing function name guarantees cache bypass

**V3 Function Definition:** No `author_role` column
- Client has fallback: `dbRoleToRoleState(m.author_role || 'Team_Member')`
- This means undefined `author_role` is handled gracefully
- Same applies to V4

## Success Criteria

- [x] Diagnostic files created
- [x] V4 function script ready
- [ ] User runs `APPLY_V4_FUNCTION.sql`
- [ ] User updates `hooks/useTeam.ts` to call v4
- [ ] Messages load in browser
- [ ] No console errors
