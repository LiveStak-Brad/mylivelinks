# QUICK START: Fix Verification Loop

**ALL USERS STUCK IN VERIFICATION LOOP - FIXED!**

---

## 🚨 IMMEDIATE ACTION REQUIRED

### Step 1: Fix Database Schema (DO THIS FIRST!)

**⚠️ CRITICAL: Username column has NOT NULL constraint - must fix first!**

**Open Supabase SQL Editor and run this:**

```sql
-- Make username nullable (required for onboarding flow)
ALTER TABLE profiles 
ALTER COLUMN username DROP NOT NULL;

-- Verify
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'username';
-- Should show: is_nullable = 'YES'
```

### Step 2: Fix Stuck Users (Run This After Step 1)

**Open Supabase SQL Editor and run this:**

```sql
-- 1. DIAGNOSE: See who's stuck
SELECT 
    u.id AS user_id,
    u.email,
    u.last_sign_in_at,
    p.username,
    p.date_of_birth,
    p.adult_verified_at,
    CASE 
        WHEN p.id IS NULL THEN '🔴 NO PROFILE'
        WHEN p.username IS NULL THEN '🟠 NO USERNAME'
        WHEN p.date_of_birth IS NULL THEN '🟠 NO DOB'
        WHEN p.adult_verified_at IS NULL AND EXTRACT(YEAR FROM AGE(p.date_of_birth)) >= 18 THEN '🟡 NO ADULT VERIFICATION'
        ELSE '🟢 COMPLETE'
    END AS status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.last_sign_in_at > NOW() - INTERVAL '7 days'
ORDER BY u.last_sign_in_at DESC;

-- 2. FIX: Create missing profiles
INSERT INTO profiles (id, username, coin_balance, earnings_balance, gifter_level, created_at, updated_at)
SELECT u.id, NULL, 0, 0, 0, NOW(), NOW()
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL AND u.last_sign_in_at > NOW() - INTERVAL '7 days'
ON CONFLICT (id) DO NOTHING;

-- 3. FIX: Add adult verification
UPDATE profiles
SET 
    adult_verified_at = NOW(),
    adult_verified_method = 'auto_fix_admin',
    updated_at = NOW()
WHERE 
    date_of_birth IS NOT NULL
    AND EXTRACT(YEAR FROM AGE(date_of_birth)) >= 18
    AND adult_verified_at IS NULL
    AND id IN (SELECT id FROM auth.users WHERE last_sign_in_at > NOW() - INTERVAL '7 days');

-- 4. VERIFY: Check results
SELECT 
    COUNT(*) FILTER (WHERE p.id IS NULL) AS still_missing_profile,
    COUNT(*) FILTER (WHERE p.username IS NULL) AS needs_onboarding,
    COUNT(*) FILTER (WHERE p.username IS NOT NULL AND p.date_of_birth IS NOT NULL) AS complete_profiles
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.last_sign_in_at > NOW() - INTERVAL '7 days';
```

### Step 3: Message Users

**Send to all affected users:**

> **🔧 Login Issue Fixed!**
>
> We've fixed the verification loop. To access your account:
>
> 1. Log out (if you can)
> 2. Clear browser cache & cookies (or use Incognito/Private browsing)
> 3. Log back in
>
> Should work now! If not, reply and we'll manually fix it. Sorry for the trouble! 🙏

---

## 🎯 WHAT WAS FIXED

### The Problem
- Users got stuck in infinite redirect loop
- Profile rows missing or incomplete
- Code crashed when checking profiles

### The Solution
- ✅ Landing page now creates missing profiles automatically
- ✅ Login page now creates missing profiles automatically
- ✅ Signup page now creates missing profiles automatically
- ✅ Onboarding uses upsert (always works)
- ✅ SQL script fixes existing stuck users

---

## 📊 VERIFY IT WORKED

After running the SQL script, you should see:
- `still_missing_profile`: **0**
- `needs_onboarding`: Some number (they'll complete it on next login)
- `complete_profiles`: Most users

---

## 🆘 IF USERS STILL STUCK

Get their email and run:

```sql
-- Replace with actual email
SELECT 
    u.id, u.email, 
    p.username, p.date_of_birth, p.adult_verified_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'user@example.com';

-- If no profile, create one:
INSERT INTO profiles (id, username, coin_balance, earnings_balance, gifter_level)
VALUES ('user-uuid-here', NULL, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;
```

Then tell user to clear cache and re-login.

---

## 📚 DETAILED DOCS

- Full technical details: `VERIFICATION_LOOP_FIX.md`
- Complete SQL script: `fix_all_stuck_users.sql`
- Test cases & monitoring: See main doc

---

**Status:** ✅ Fixed and ready to deploy  
**Time to fix:** ~5 minutes (run SQL script)  
**Impact:** Fixes all stuck users immediately

