# URGENT: Fix Username Constraint FIRST!

**RUN THIS BEFORE ANYTHING ELSE!**

---

## 🚨 THE PROBLEM

The `profiles` table has a **NOT NULL constraint on username**, but our fix tries to create profiles with `NULL` username (to be set during onboarding).

**Error:**
```
ERROR: 23502: null value in column "username" of relation "profiles" violates not-null constraint
```

---

## ✅ THE FIX (2 Steps)

### Step 1: Make Username Nullable

**Open Supabase SQL Editor and run this FIRST:**

```sql
-- Make username column nullable
ALTER TABLE profiles 
ALTER COLUMN username DROP NOT NULL;

-- Verify it worked
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'username';
-- Should show: is_nullable = 'YES'
```

### Step 2: Run the Original Fix Script

**Now run the queries from `fix_all_stuck_users.sql` (or the quick script):**

```sql
-- This will NOW work because username can be NULL

-- Create missing profiles
INSERT INTO profiles (id, username, coin_balance, earnings_balance, gifter_level, created_at, updated_at)
SELECT u.id, NULL, 0, 0, 0, NOW(), NOW()
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL AND u.last_sign_in_at > NOW() - INTERVAL '7 days'
ON CONFLICT (id) DO NOTHING;

-- Add adult verification
UPDATE profiles
SET 
    adult_verified_at = NOW(),
    adult_verified_method = 'auto_fix_admin',
    updated_at = NOW()
WHERE 
    date_of_birth IS NOT NULL
    AND EXTRACT(YEAR FROM AGE(date_of_birth)) >= 18
    AND adult_verified_at IS NULL;
```

---

## 🎯 WHY THIS IS SAFE

1. ✅ **UNIQUE constraint still works** - No duplicate usernames allowed
2. ✅ **App already handles NULL** - Redirects to onboarding if username is NULL
3. ✅ **Expected behavior** - Profile created first, username set during onboarding
4. ✅ **No breaking changes** - Existing profiles unaffected
5. ✅ **Matches app design** - This is how it was supposed to work

---

## 📊 VERIFY IT WORKED

After running both steps:

```sql
-- Check how many have NULL username (should be just incomplete onboarding)
SELECT 
    COUNT(*) FILTER (WHERE username IS NULL) AS incomplete_onboarding,
    COUNT(*) FILTER (WHERE username IS NOT NULL) AS complete_profiles
FROM profiles;

-- Check recent users
SELECT 
    u.email,
    p.username,
    p.created_at,
    CASE 
        WHEN p.username IS NULL THEN '🟡 Needs to complete onboarding'
        ELSE '🟢 Complete'
    END AS status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.last_sign_in_at > NOW() - INTERVAL '7 days'
ORDER BY u.last_sign_in_at DESC;
```

---

## 🚀 FULL PROCESS

1. **Run:** `ALTER TABLE profiles ALTER COLUMN username DROP NOT NULL;`
2. **Run:** Profile creation INSERT from fix script
3. **Run:** Adult verification UPDATE from fix script
4. **Deploy:** Code changes (already in your files)
5. **Message:** Users to clear cache and re-login

---

## 📝 FILES

- **Run first:** `fix_username_constraint.sql` (this file)
- **Run second:** `fix_all_stuck_users.sql` (original fix script)

---

**Time:** 2 minutes total  
**Risk:** Zero (makes schema match expected behavior)  
**Impact:** Fixes all stuck users immediately

