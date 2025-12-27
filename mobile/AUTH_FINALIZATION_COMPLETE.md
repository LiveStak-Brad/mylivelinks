# AUTH FINALIZATION - COMPLETE ✅

## VERIFICATION: signOut Call Sites

### Raw Grep Output

**Command**: `rg "supabase\.auth\.signOut\(" -n mobile`
```
mobile\components\UserMenu.tsx:54:    await supabase.auth.signOut();
mobile\hooks\useAuth.ts:118:    const { error } = await supabase.auth.signOut();
```

**Command**: `rg "\bsignOut\(" -n mobile`
```
mobile\components\UserMenu.tsx:54:    await supabase.auth.signOut();
mobile\hooks\useAuth.ts:118:    const { error } = await supabase.auth.signOut();
```

### Analysis

**ONLY 2 signOut calls exist**:

1. **`mobile/components/UserMenu.tsx:54`** ✅ USER-INITIATED
   ```typescript
   const handleLogout = async () => {
     if (!supabaseConfigured) return;
     await supabase.auth.signOut();  // ← User clicks "Logout" button
     setShowMenu(false);
     if (onLogout) { onLogout(); }
   };
   ```
   **Trigger**: User explicitly taps "Logout" button in UserMenu
   **Status**: ✅ **ALLOWED** - This is the ONLY permitted signOut

2. **`mobile/hooks/useAuth.ts:118`** ✅ EXPOSED METHOD
   ```typescript
   const signOut = useCallback(async () => {
     if (!supabaseConfigured) {
       throw new Error('Supabase client not initialized.');
     }
     console.log('[AUTH] signOut called');
     const { error } = await supabase.auth.signOut();
     if (error) {
       console.error('[AUTH] signOut failed:', error);
       throw error;
     }
     console.log('[AUTH] signOut successful');
   }, []);
   ```
   **Trigger**: Called by UserMenu's `handleLogout()` via AuthContext
   **Status**: ✅ **ALLOWED** - Method for user-initiated logout

---

## REMOVED: Automatic signOut Calls

### ❌ DELETED: Refresh Failure signOut
**Previously in `mobile/lib/api.ts`**:
```typescript
// REMOVED - was lines 67-68
const refresh = await supabase.auth.refreshSession();
if (refresh.error || !refresh.data.session) {
  console.error('[API] Session refresh failed:', refresh.error);
  await signOut();  // ❌ REMOVED
  return res1;
}
```
**Now**: Returns error object, no signOut

### ❌ DELETED: Persistent 401 signOut
**Previously in `mobile/lib/api.ts`**:
```typescript
// REMOVED - was lines 74-75
const res2 = await attempt(refresh.data.session.access_token);
if (res2.status === 401) {
  console.error('[API] Still 401 after refresh, logging out');
  await signOut();  // ❌ REMOVED
}
```
**Now**: Returns error object, no signOut

### ❌ DELETED: Retry Loop
**Previously in `mobile/lib/api.ts`**:
- Entire retry logic with refresh attempt removed
- Now: Single request, return result (success or error)

---

## CURRENT: fetchAuthed Behavior

**File**: `mobile/lib/api.ts`

```typescript
export async function fetchAuthed(
  input: string,
  init: RequestInit = {},
  accessToken?: string | null
): Promise<FetchAuthedResult> {
  // 1. Require token (throw in dev, return 401 in prod)
  if (!accessToken) {
    const message = '[API] fetchAuthed called without accessToken';
    if (__DEV__) {
      throw new Error(message);
    }
    return {
      ok: false,
      status: 401,
      message: 'missing token',
    };
  }

  // 2. Make single request attempt
  const attempt = async (token: string): Promise<FetchAuthedResult> => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');

    try {
      const res = await fetch(url, { ...init, headers });
      const data = await res.json().catch(() => null);

      return {
        ok: res.ok,
        status: res.status,
        data,
        message: (data as any)?.error || res.statusText || 'request failed',
      };
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        message: err?.message || 'network error',
      };
    }
  };

  // 3. Return result (success or error)
  return attempt(accessToken);
}
```

**Key Points**:
- ✅ No `signOut()` call
- ✅ No retry loop
- ✅ No refresh attempt
- ✅ Just returns error object on failure
- ✅ Calling code handles errors (shows toast, navigates, etc.)

---

## AUTH_EXPIRED Handling Strategy

**When API returns 401**:
1. `fetchAuthed()` returns `{ ok: false, status: 401, message: 'request failed' }`
2. Calling screen catches error, shows message
3. User sees "Session expired" toast/banner
4. User manually navigates to login OR
5. App redirects to Auth screen
6. **No automatic signOut** - session stays in SecureStore
7. User can try logging in again (might still be valid)

**Why this is better**:
- Doesn't force logout on network errors
- Doesn't force logout if token is temporarily invalid
- Doesn't kill web session
- User stays in control

---

## HomeDashboardScreen Check

**Grep Result**:
```
No matches found for "Logout|logout|signOut" in HomeDashboardScreen.tsx
```

✅ **VERIFIED**: HomeDashboardScreen has NO logout button

---

## Supabase Dashboard Setting

**ACTION REQUIRED FROM BRAD**:

1. Go to: https://supabase.com/dashboard/project/dfiyrmqobjfsdsgklweg
2. Navigate to: **Authentication** → **Settings**
3. Find: **"Limit number of sessions per user"**
4. **SET TO: OFF** (or ensure it's already OFF)

**Why**: Allows multiple concurrent sessions (mobile + web + tablet, etc.)

**If ON**: Mobile login will invalidate web session regardless of our code changes

---

## Summary

### ✅ COMPLETED

1. **Removed all automatic signOut**:
   - ❌ No signOut on refresh failure
   - ❌ No signOut on persistent 401
   - ❌ No signOut on missing token
   - ❌ No signOut on startup/bootstrap
   - ❌ No signOut on navigation/screen focus

2. **fetchAuthed never calls signOut**:
   - ✅ Only attaches Authorization header
   - ✅ Makes single request
   - ✅ Returns error object on 401 (no signOut)
   - ✅ No retry loop

3. **ONLY user-initiated signOut**:
   - ✅ UserMenu → Logout button → user taps → `supabase.auth.signOut()`
   - ✅ That's it. Nothing else.

4. **HomeDashboardScreen**:
   - ✅ No logout button (logout only in UserMenu)

### ⏳ PENDING

5. **Supabase Dashboard**:
   - ⚠️ Brad must verify "Limit sessions per user" is **OFF**

---

## Files Changed

1. `mobile/lib/api.ts` - Removed signOut() function, removed retry logic, removed automatic signOut
2. No other files changed (UserMenu and useAuth already correct)

---

## Verification Commands

```bash
# Check all signOut calls
rg "supabase\.auth\.signOut\(" -n mobile

# Result:
mobile\components\UserMenu.tsx:54:    await supabase.auth.signOut();
mobile\hooks\useAuth.ts:118:    const { error } = await supabase.auth.signOut();

# Check all signOut references
rg "\bsignOut\(" -n mobile

# Result: (same as above - only 2 calls)
```

---

## Testing Checklist

### Before Merge
- [x] Only 2 signOut calls exist (UserMenu + useAuth)
- [x] No automatic signOut on errors
- [x] fetchAuthed returns error objects
- [x] No retry loops in fetchAuthed
- [x] HomeDashboardScreen has no logout button
- [ ] **Brad confirms Supabase "Limit sessions per user" is OFF**

### After Merge
1. Login on web
2. Login on mobile
3. ✅ Web should stay logged in
4. Force a 401 error on mobile
5. ✅ Should see error message, NOT be logged out
6. Navigate between mobile screens
7. ✅ All screens should stay logged in
8. Only tap "Logout" button
9. ✅ Then and only then should logout occur

---

## FINAL ANSWER

**SAFE TO MERGE** ✅

**Verification**:
- ✅ ONLY 2 signOut calls: UserMenu user-initiated + useAuth method
- ✅ NO automatic signOut anywhere
- ✅ fetchAuthed returns errors, never calls signOut
- ✅ HomeDashboardScreen has no logout button
- ⚠️ **Requires Brad to verify Supabase dashboard setting is OFF**

**All code changes complete. Waiting on Supabase dashboard confirmation.**

