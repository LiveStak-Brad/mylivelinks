# Referral System Fix - Complete Guide

## Problem Identified

The error message `function gen_random_bytes(integer) does not exist` indicates that the **pgcrypto extension is not enabled** in your Supabase database.

### Root Cause

The `generate_referral_code()` function (line 295 in the migration) calls `gen_random_bytes()`, which is part of PostgreSQL's `pgcrypto` extension. However, the referral migrations (`20251228_referrals_db_foundation.sql` and `APPLY_REFERRALS_SYSTEM.sql`) never enabled this extension.

### Why Only You Are Getting Stats

When users try to claim referrals:
1. They enter a username in the settings page
2. The system calls `claim_referral_by_inviter_username()`
3. If the inviter doesn't have a code yet, it tries to generate one using `generate_referral_code()`
4. **This fails** because `gen_random_bytes()` doesn't exist
5. The error is shown to the user, and the referral is never claimed
6. Only YOUR referral code works because it was probably created when pgcrypto WAS enabled (or was manually created)

## Solution

### Step 1: Enable pgcrypto Extension

Run this SQL in your Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Step 2: Verify the Fix

Run this test:

```sql
-- Test that gen_random_bytes works
SELECT gen_random_bytes(8);

-- Test that generate_referral_code works
SELECT public.generate_referral_code(8);
```

Both should return successfully.

### Step 3: Run Diagnostics

Run the `DIAGNOSE_REFERRALS_ISSUE.sql` file to see the current state of your referral system:

```bash
# In Supabase SQL Editor, copy/paste the contents of:
DIAGNOSE_REFERRALS_ISSUE.sql
```

This will show you:
- ✓ Whether pgcrypto is enabled
- All referral codes that exist
- All referral claims (who referred whom)
- Who is collecting stats
- Any orphaned data

### Step 4: Update Migrations (For Future Deployments)

The following files have been updated to include `CREATE EXTENSION IF NOT EXISTS pgcrypto;`:

1. ✅ `supabase/migrations/20251228_referrals_db_foundation.sql`
2. ✅ `APPLY_REFERRALS_SYSTEM.sql`

These changes ensure that future deployments will automatically enable pgcrypto.

## Testing the Fix

After enabling pgcrypto, test the referral flow:

### Test 1: Generate Invite Link

1. Log in as any user
2. Go to Settings → Referrals (or wherever you display the invite link)
3. The system should generate a code like `AB3456XY`
4. Verify the link works: `https://mylivelinks.com/signup?ref=AB3456XY`

### Test 2: Claim Referral by Username

1. Log in as a NEW user (or a user who hasn't claimed a referral yet)
2. Go to Settings → Profile
3. In the "Who invited you?" field, enter the username of an existing user
4. Click "Save"
5. ✅ Should succeed with no error
6. Verify in the database:

```sql
-- Check if the referral was claimed
SELECT 
  p_referrer.username as referrer,
  p_referred.username as referred,
  r.code_used,
  r.claimed_at
FROM public.referrals r
JOIN public.profiles p_referrer ON p_referrer.id = r.referrer_profile_id
JOIN public.profiles p_referred ON p_referred.id = r.referred_profile_id
WHERE p_referred.username = 'NEW_USER_USERNAME';
```

### Test 3: Verify Stats Update

After a user claims a referral:

```sql
-- Check referral stats for the referrer
SELECT 
  p.username,
  rr.click_count,
  rr.referral_count,
  rr.activation_count
FROM public.referral_rollups rr
JOIN public.profiles p ON p.id = rr.referrer_profile_id
WHERE p.username = 'REFERRER_USERNAME';
```

The `referral_count` should increment by 1.

## Additional Fixes Needed?

Based on your description ("it seems they can only put me as referrer"), there might be additional issues:

### Issue 1: Hardcoded Referrer

Check if the frontend is hardcoding your username somewhere. Search for:

```bash
# Search for your username in the codebase
grep -r "your_username" app/ mobile/
```

### Issue 2: RLS Policies

The referral tables have Row Level Security enabled. Verify policies allow users to insert referrals:

```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('referral_codes', 'referrals', 'referral_clicks', 'referral_rollups')
ORDER BY tablename, policyname;
```

### Issue 3: Service Role vs Authenticated Role

The `claim_referral()` function uses `SECURITY DEFINER` and `SET row_security = off`, which should bypass RLS. However, verify the function grants are correct:

```sql
-- Check function permissions
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%referral%';
```

## Files Created/Modified

### New Files
- ✅ `FIX_REFERRALS_GEN_RANDOM_BYTES.sql` - One-time fix to enable pgcrypto
- ✅ `DIAGNOSE_REFERRALS_ISSUE.sql` - Diagnostic queries
- ✅ `REFERRAL_SYSTEM_FIX_COMPLETE.md` - This document

### Modified Files
- ✅ `supabase/migrations/20251228_referrals_db_foundation.sql` - Added pgcrypto extension
- ✅ `APPLY_REFERRALS_SYSTEM.sql` - Added pgcrypto extension

## Quick Fix Commands

Run these in Supabase SQL Editor in this order:

```sql
-- 1. Enable extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Verify it works
SELECT gen_random_bytes(8);
SELECT public.generate_referral_code(8);

-- 3. (Optional) Check diagnostics
-- Copy/paste contents of DIAGNOSE_REFERRALS_ISSUE.sql here
```

## Expected Results After Fix

✅ Users can enter any username in "Who invited you?" field  
✅ Referral codes are automatically generated for users who don't have one  
✅ Referral stats (click_count, referral_count) increment correctly  
✅ Each user's referral link works independently  
✅ No more "gen_random_bytes does not exist" errors  

## Support

If the issue persists after enabling pgcrypto, run the diagnostic SQL and share the output to identify any additional issues with:
- RLS policies
- Function permissions  
- Orphaned data
- Frontend logic

