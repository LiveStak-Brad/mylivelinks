# Team Chat Message Loading - Comprehensive Fix Guide

## Problem Summary
Messages exist in database but don't display in UI due to RPC error 42804: "structure of query does not match function result type"

## Root Cause
The `rpc_get_team_chat_messages_v3` function either:
1. Was never applied to the database
2. Is cached by PostgREST with old definition
3. Has a type mismatch we haven't identified yet

## Diagnostic Steps (Run These First)

### Step 1: Verify Database State
Run `DIAGNOSE_TEAM_CHAT_V3.sql` in Supabase SQL Editor:
- Check if V3 function exists
- Verify messages exist in table
- Test direct function call

### Step 2: Interpret Results

**If Query 1 shows NO function:**
→ V3 was never applied
→ Run `FIX_TEAM_CHAT_RPC_V3_NO_ROLE.sql`

**If Query 1 shows function WITH author_role:**
→ V3 wasn't applied correctly
→ Re-run `FIX_TEAM_CHAT_RPC_V3_NO_ROLE.sql`

**If Query 4 (direct call) works but client fails:**
→ PostgREST cache issue
→ Run `FORCE_POSTGREST_RELOAD_V3.sql`

**If Query 4 (direct call) also fails:**
→ Function logic broken
→ Use fallback minimal RPC

## Resolution Paths

### Path A: Re-apply V3 Function (Most Likely)

```sql
-- Run FIX_TEAM_CHAT_RPC_V3_NO_ROLE.sql in Supabase SQL Editor
-- This drops and recreates the function without author_role
```

After running:
1. Run `FORCE_POSTGREST_RELOAD_V3.sql` to notify PostgREST
2. Hard refresh browser (Ctrl+Shift+R)
3. Check console - messages should load

### Path B: PostgREST Cache Bypass (If Path A Fails)

If PostgREST won't reload cache, create V4 with new name:

1. Uncomment the V4 section in `FORCE_POSTGREST_RELOAD_V3.sql`
2. Run it in SQL Editor
3. Update `hooks/useTeam.ts` line 833:
   ```typescript
   // Change from:
   await supabase.rpc('rpc_get_team_chat_messages_v3', {
   
   // To:
   await supabase.rpc('rpc_get_team_chat_messages_v4', {
   ```
4. Save file and hard refresh browser

### Path C: Minimal RPC Fallback (If Both Fail)

Use simplified test RPC to isolate the issue:

1. Run `CREATE_MINIMAL_CHAT_RPC.sql`
2. Update `hooks/useTeam.ts` line 833:
   ```typescript
   const { data, error: rpcError } = await supabase.rpc('test_get_team_messages', {
     p_team_id: teamId
   });
   ```
3. Simplify message mapping (lines 848-865) to match minimal return structure
4. If this works, the issue is with V3 query complexity

## Files to Run (In Order)

1. **DIAGNOSE_TEAM_CHAT_V3.sql** - Diagnostic queries
2. **FIX_TEAM_CHAT_RPC_V3_NO_ROLE.sql** - Apply V3 function
3. **FORCE_POSTGREST_RELOAD_V3.sql** - Force cache reload
4. **CREATE_MINIMAL_CHAT_RPC.sql** - Fallback if needed

## Quick Resolution (Most Likely to Work)

Based on the error pattern, here's the fastest path:

```bash
# 1. In Supabase SQL Editor, run these queries in sequence:

# First, check current state
SELECT proname, pg_get_function_result(oid) 
FROM pg_proc 
WHERE proname LIKE '%rpc_get_team_chat_messages%';

# Second, apply the fix
-- (paste contents of FIX_TEAM_CHAT_RPC_V3_NO_ROLE.sql)

# Third, force reload
NOTIFY pgrst, 'reload schema';

# Fourth, verify it worked
SELECT * FROM public.rpc_get_team_chat_messages_v3(
  'b1c67fa9-3eff-4313-9c95-1498d28725dd'::uuid,
  10, NULL, NULL
);
```

If last query returns messages → Success! Hard refresh browser.
If last query fails → Need to use Path C (minimal RPC).

## Success Indicators

✅ No 42804 error in browser console
✅ `[useTeamChat] ✅ Fetched N messages` appears in console
✅ Messages array length > 0 in debug logs
✅ Messages visible in chat UI

## Next Steps After Fix

1. Remove debug logging from `hooks/useTeam.ts`
2. Remove debug logging from `TeamPageContent.tsx`
3. Test with multiple users
4. Verify realtime updates work
5. Test message sending and persistence
