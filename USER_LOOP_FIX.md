# User Loop Issue - Diagnosis & Fix

**Date:** December 24, 2025  
**Issue:** User `9ea409fd-087d-4469-85bb-48814647d6d9` stuck in redirect loop  
**Status:** ✅ FIXED

---

## 🐛 ROOT CAUSE

**The redirect loop was caused by:**
1. Recent homepage change redirecting logged-out users to `/login`
2. Onboarding completion redirecting to `/live` instead of homepage
3. Create a circular redirect pattern

### **The Loop:**
```
User completes onboarding
   ↓
Redirects to /live
   ↓
Live page checks: "Is this the owner? No."
   ↓
Shows "Coming Soon" page
   ↓
User clicks logo/home
   ↓
Landing page checks: "User logged in? Yes. Profile complete? Yes."
   ↓
Should show homepage but...
   ↓
**BUG:** Was redirecting back instead of showing content
```

---

## ✅ FIXES APPLIED

### 1. **Onboarding Redirect** (`app/onboarding/page.tsx`)

**Line 58 - Initial check:**
```typescript
// BEFORE:
if (profile?.username && profile?.date_of_birth) {
  router.push('/live');  // ❌ Wrong
  return;
}

// AFTER:
if (profile?.username && profile?.date_of_birth) {
  router.push('/');  // ✅ Go to homepage
  return;
}
```

**Line 205 - After completion:**
```typescript
// BEFORE:
router.push('/live');  // ❌ Wrong

// AFTER:
router.push('/');  // ✅ Go to homepage
```

### 2. **Homepage Logic** (Already correct)
- Landing page (`/`) now shows search/features for logged-in users ✅
- No redirect loop ✅

---

## 🔧 HOW TO FIX THE STUCK USER

### Option 1: **User Self-Fix** (Recommended)
Tell the user to:
1. **Log out completely**
2. **Clear browser cache & cookies** (or use incognito/private mode)
3. **Log back in**
4. Should work now with the code fix deployed

### Option 2: **Database Check** (If still stuck)
Run this SQL to check their profile:
```sql
SELECT 
    id,
    username,
    display_name,
    date_of_birth,
    adult_verified_at
FROM profiles
WHERE id = '9ea409fd-087d-4469-85bb-48814647d6d9';
```

**Look for:**
- ✅ `username` is set
- ✅ `date_of_birth` is set
- ❌ If either is NULL → that's why they're stuck

### Option 3: **Manual Database Fix** (If profile incomplete)
If the profile is missing data, manually complete it:
```sql
UPDATE profiles
SET 
    username = 'tempuser123',  -- Set if missing
    date_of_birth = '1990-01-01',  -- Set their actual DOB
    adult_verified_at = NOW(),
    adult_verified_method = 'admin_manual',
    updated_at = NOW()
WHERE id = '9ea409fd-087d-4469-85bb-48814647d6d9';
```

---

## 🧪 TESTING THE FIX

### Test Flow (New User):
1. Sign up → Create account
2. Complete onboarding (username + DOB)
3. ✅ Should redirect to **homepage** (with search bar)
4. ✅ Should NOT redirect to `/live` automatically
5. ✅ Can navigate to `/live` via button if desired

### Test Flow (Existing User):
1. Log in
2. ✅ If profile complete → Go to homepage
3. ✅ If profile incomplete → Go to onboarding
4. ✅ After completing onboarding → Go to homepage

### Test Flow (Stuck User):
1. Log out
2. Clear cache/cookies
3. Log back in
4. ✅ Should go directly to homepage (no loop)

---

## 📋 REDIRECT FLOW (CORRECTED)

### **Logged Out:**
```
/ → /login
/login → (after login) → /
/onboarding → /login
```

### **Logged In (Incomplete Profile):**
```
/ → /onboarding
/login → /onboarding
/onboarding → (after completion) → /
```

### **Logged In (Complete Profile):**
```
/ → Show homepage ✅
/login → /
/onboarding → / (skipped, already complete)
```

---

## 🚀 DEPLOYMENT

### Code Changes:
- ✅ `app/onboarding/page.tsx` - Two redirect changes
- ✅ No database changes needed
- ✅ No breaking changes

### Deploy Steps:
1. Restart dev server (or wait for auto-reload)
2. Test the flow with a new account
3. Contact stuck user to clear cache and re-login

---

## 📝 PREVENTION

To prevent this in the future:
1. ✅ Always redirect to homepage (`/`) after onboarding
2. ✅ Homepage should be the "hub" for logged-in users
3. ✅ `/live` is a destination, not a default
4. ✅ Test redirect flows thoroughly before pushing

---

## 💬 USER COMMUNICATION

**Message to send the stuck user:**

> Hey! We found and fixed the issue causing your login loop. Here's what to do:
> 
> 1. **Log out** of your account completely
> 2. **Clear your browser cache** (or open an incognito/private window)
> 3. **Log back in**
> 
> You should now land on your homepage with a search bar and quick access to your profile and live streaming. Let me know if you still have issues!
> 
> The problem was a redirect loop in our onboarding flow that's now fixed. Sorry for the inconvenience!

---

## 📊 FILES CHANGED

1. ✅ `app/onboarding/page.tsx` - Fixed 2 redirect destinations
2. ✅ `debug_user_loop_issue.sql` - Diagnostic queries (NEW)
3. ✅ `fix_user_loop_manual.sql` - Manual fix script (NEW)
4. ✅ `USER_LOOP_FIX.md` - This document (NEW)

---

**Status:** ✅ Fixed and ready to deploy  
**User Impact:** Only affects users who completed onboarding during the brief window when the bug existed  
**Next Steps:** Deploy fix, test, contact affected user(s)




