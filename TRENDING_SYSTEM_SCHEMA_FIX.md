# 🔧 TRENDING SYSTEM — SCHEMA FIX

## Issue Found During Deployment

**Error:** `foreign key constraint "live_stream_likes_stream_id_fkey" cannot be implemented`

**Root Cause:** The migration assumed `live_streams.id` was **UUID**, but your database uses **BIGINT** (auto-incrementing integer).

---

## ✅ Fix Applied

### Changed Stream ID Type from UUID → BIGINT

**Files Updated:**
1. `sql/TRENDING_SYSTEM_MIGRATION.sql` - All foreign key references
2. `lib/trending-hooks.ts` - TypeScript type definitions

### Specific Changes:

**In SQL Migration:**
- ✅ `live_stream_likes.stream_id`: UUID → BIGINT
- ✅ `live_stream_comments.stream_id`: UUID → BIGINT
- ✅ `live_stream_view_sessions.stream_id`: UUID → BIGINT
- ✅ All RPC function parameters: `p_stream_id UUID` → `p_stream_id BIGINT`
- ✅ All RPC function return tables: `stream_id UUID` → `stream_id BIGINT`

**In TypeScript Hooks:**
- ✅ `useLiveViewTracking()`: `streamId: string | null` → `streamId: string | number | null`
- ✅ `useLiveLike()`: `streamId: string | null` → `streamId: string | number | null`
- ✅ `trackLiveComment()`: `streamId: string` → `streamId: string | number`
- ✅ `trackLiveGift()`: `streamId: string` → `streamId: string | number`
- ✅ `TrendingStream` interface: `stream_id: string` → `stream_id: number`

---

## 🚀 Ready to Deploy

The migration is now **fixed and compatible** with your schema.

### Try Again:

1. **Clear the error** in Supabase SQL Editor (if needed)
2. **Re-run the migration:**
   - Copy entire contents of `sql/TRENDING_SYSTEM_MIGRATION.sql`
   - Paste into Supabase SQL Editor
   - Click "Run"
3. **Verify success:**
   ```sql
   SELECT * FROM rpc_get_trending_live_streams(5, 0);
   ```
   Should return empty array (no errors)

---

## 🔍 What Changed in Your Integration

**Good news:** Your frontend integration code stays **exactly the same**!

The hooks accept `string | number` for `streamId`, so whether you pass:
- `liveStreamId` as a **number** (e.g., `12345`)
- `liveStreamId` as a **string** (e.g., `"12345"`)

Both will work correctly. The Supabase RPC will handle the conversion.

---

## ✅ Verification After Fix

After re-running the migration, verify:

```sql
-- 1. Check tables exist
SELECT * FROM live_stream_likes LIMIT 1;
SELECT * FROM live_stream_comments LIMIT 1;
SELECT * FROM live_stream_view_sessions LIMIT 1;

-- 2. Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE 'rpc_live%';

-- Expected: 7 functions

-- 3. Test a function
SELECT * FROM rpc_get_trending_live_streams(5, 0);

-- Should return empty array (no errors)
```

---

## 📋 Updated Test Example

When testing with your actual data:

```sql
-- Test view join (use BIGINT stream_id)
SELECT * FROM rpc_live_view_join(
  12345,  -- ← stream_id as BIGINT (not UUID)
  'YOUR_PROFILE_UUID'::uuid,
  NULL
);

-- Test like toggle (use BIGINT stream_id)
SELECT * FROM rpc_live_like_toggle(
  12345,  -- ← stream_id as BIGINT
  'YOUR_PROFILE_UUID'::uuid
);
```

---

## 🎉 Status

- ✅ **SQL Migration:** Fixed and ready
- ✅ **TypeScript Hooks:** Fixed and ready
- ✅ **Frontend Code:** No changes needed
- ✅ **Trending Page:** No changes needed
- ✅ **Documentation:** Still accurate (minor type change only)

**Ready to deploy!** Re-run the migration and you should be good to go. 🚀

---

*Fix applied: 2025-12-31*
