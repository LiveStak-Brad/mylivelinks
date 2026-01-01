# Gift Sending Error Fix - "ON CONFLICT" Constraint Issue

## Problem

Gift sending was failing with the error:

```
there is no unique or exclusion constraint matching the ON CONFLICT specification
```

This error appeared when trying to send a gift in the chat/DM system.

## Root Cause

The `send_gift_v2()` database function uses `ON CONFLICT (idempotency_key) DO NOTHING` to ensure gifts can't be sent twice with the same request ID (idempotency). However, this requires a **UNIQUE constraint** on the `idempotency_key` column in the `ledger_entries` table.

### What Happened

The migration `20251227_money_system_cutover.sql` created the `ledger_entries` table with:

```sql
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,  -- ✓ Has UNIQUE constraint
  ...
);
```

However, in some database deployments, this UNIQUE constraint might not have been created properly, or the function might have been deployed with `ON CONFLICT` before the constraint existed.

## The Fix

Run the SQL script: **`FIX_GIFT_ON_CONFLICT_ERROR.sql`**

This script does three things:

### 1. Ensures UNIQUE Constraint Exists

```sql
ALTER TABLE public.ledger_entries
ADD CONSTRAINT ledger_entries_idempotency_key_key UNIQUE (idempotency_key);
```

This constraint is **required** for `ON CONFLICT (idempotency_key)` to work.

### 2. Re-creates send_gift_v2() Function

Updates the function with proper validation and ON CONFLICT handling:

- ✅ Validates recipient exists (security fix)
- ✅ Uses ON CONFLICT for idempotency
- ✅ Prevents duplicate gift processing

### 3. Verification

Confirms the fix was applied successfully with automated checks.

## How to Apply the Fix

### Option 1: Supabase SQL Editor (Recommended)

1. Open Supabase Dashboard → SQL Editor
2. Copy/paste contents of `FIX_GIFT_ON_CONFLICT_ERROR.sql`
3. Click **Run**
4. Look for success messages:
   - ✓ Added UNIQUE constraint on ledger_entries.idempotency_key
   - ✓ Constraint verification passed
   - ✓ Function verification passed
   - ✓ Gift sending fix applied successfully

### Option 2: Command Line

```bash
psql -h <your-db-host> -U postgres -d postgres -f FIX_GIFT_ON_CONFLICT_ERROR.sql
```

## Testing After Fix

1. **Send a gift in DMs**
   - Open a conversation
   - Send any gift
   - Should see: "You sent a gift! [emoji] • 1 [coin] (+1 [heart])"

2. **Verify no errors**
   - Check browser console - no errors
   - Gift should appear in chat
   - Coins should be deducted

3. **Test idempotency**
   - Sending the same gift twice (if client retries) should not charge twice

## Why This Matters

### Idempotency Protection

Without the UNIQUE constraint + ON CONFLICT:
- Network retries could charge users multiple times
- Race conditions could duplicate gifts
- No protection against double-spending

With the fix:
- ✅ Same request_id = gift sent exactly once
- ✅ Network retries are safe
- ✅ Race conditions prevented

### Security

The updated function also includes:
- ✅ Recipient validation (prevents sending to non-existent users)
- ✅ Self-gifting prevention
- ✅ Balance checks before processing

## Related Files

- `supabase/migrations/20251227_money_system_cutover.sql` - Original ledger system
- `supabase/migrations/20251229_validate_gift_recipient.sql` - Gift validation update
- `CHECK_GIFT_FUNCTION_VERSION.sql` - Diagnostic queries to check your database state

## Diagnostic Queries

Run `CHECK_GIFT_FUNCTION_VERSION.sql` to see:
- Current function definition
- Existing constraints on ledger_entries
- Indexes on the table

## Status

- **Issue**: Gift sending fails with ON CONFLICT error
- **Root Cause**: Missing UNIQUE constraint on ledger_entries.idempotency_key
- **Fix**: FIX_GIFT_ON_CONFLICT_ERROR.sql
- **Status**: ✅ Ready to apply

---

**Questions?** This is likely a one-time migration issue. Once fixed, all gift sending should work normally.
