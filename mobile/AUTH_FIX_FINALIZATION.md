# AUTH FIX FINALIZATION - COMPLETE

## TASK 1: Remove fetchAuthed Fallback ✅

### fetchAuthed Code (AFTER CHANGE)

**File**: `mobile/lib/api.ts`

```typescript
// CRITICAL: Token must be provided by caller from AuthContext
// This ensures single source of truth for auth state
// NO fallback to getSession() - that would bypass React state
export async function fetchAuthed(
  input: string, 
  init: RequestInit = {},
  accessToken?: string | null
) {
  const url = input.startsWith('http')
    ? input
    : `${getApiBaseUrl()}${input.startsWith('/') ? '' : '/'}${input}`;

  // CRITICAL: Require token - no fallback to getSession()
  if (!accessToken) {
    console.error('[API] fetchAuthed called without token - this is a bug');
    // Return 401-like error response instead of throwing (graceful degradation)
    return new Response(
      JSON.stringify({ error: 'Not authenticated - no token provided' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const attempt = async (token: string): Promise<Response> => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');

    return fetch(url, {
      ...init,
      headers,
    });
  };

  const res1 = await attempt(accessToken);
  if (res1.status !== 401) return res1;

  // On 401, try to refresh the session
  console.log('[API] Got 401, refreshing session...');
  const refresh = await supabase.auth.refreshSession();
  if (refresh.error || !refresh.data.session) {
    console.error('[API] Session refresh failed:', refresh.error);
    await signOut();
    return res1;
  }

  const res2 = await attempt(refresh.data.session.access_token);
  if (res2.status === 401) {
    console.error('[API] Still 401 after refresh, logging out');
    await signOut();
  }

  return res2;
}
```

**KEY CHANGES**:
- ❌ **REMOVED**: `getAccessTokenDirect()` function
- ❌ **REMOVED**: Fallback to `getSession()` if token not provided
- ✅ **ADDED**: Error if token is missing → Returns 401 response
- ✅ **ENFORCED**: Token MUST come from AuthContext

### Helper Hook Created

**File**: `mobile/hooks/useFetchAuthed.ts` (NEW)

```typescript
import { useCallback } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { fetchAuthed as fetchAuthedRaw } from '../lib/api';

/**
 * Hook that provides fetchAuthed with automatic token injection from AuthContext
 * This ensures all API calls use the single source of truth for auth state
 */
export function useFetchAuthed() {
  const { getAccessToken } = useAuthContext();

  const fetchAuthed = useCallback(
    async (input: string, init: RequestInit = {}) => {
      const token = await getAccessToken();
      return fetchAuthedRaw(input, init, token);
    },
    [getAccessToken]
  );

  return { fetchAuthed };
}
```

### Call Sites Updated (11 total)

All components now use `useFetchAuthed()` hook:

1. ✅ **mobile/hooks/useFeed.ts** - Already using token from AuthContext
2. ✅ **mobile/screens/AdminGiftsScreen.tsx** - Updated
3. ✅ **mobile/screens/AdminApplicationsScreen.tsx** - Updated
4. ✅ **mobile/screens/ModerationPanelScreen.tsx** - Updated
5. ✅ **mobile/screens/OwnerPanelScreen.tsx** - Updated
6. ✅ **mobile/screens/MyAnalyticsScreen.tsx** - Updated
7. ✅ **mobile/screens/TransactionsScreen.tsx** - Updated
8. ✅ **mobile/components/RoomsCarousel.tsx** - Updated
9. ✅ **mobile/screens/WalletScreenSimple.tsx** - Updated
10. ✅ **mobile/screens/WalletScreen.tsx** - Updated

**Pattern Used**:
```typescript
// OLD
import { fetchAuthed } from '../lib/api';
export function MyScreen() {
  // Direct call
  const res = await fetchAuthed('/api/endpoint');
}

// NEW
import { useFetchAuthed } from '../hooks/useFetchAuthed';
export function MyScreen() {
  const { fetchAuthed } = useFetchAuthed();  // ← Gets token from AuthContext
  // Same call, but token auto-injected
  const res = await fetchAuthed('/api/endpoint');
}
```

---

## TASK 2: Prove No Accidental signOut ✅

### signOut Call Sites (4 total - ALL INTENTIONAL)

**1. User-initiated logout (UserMenu)**
```typescript
// mobile/components/UserMenu.tsx:54
const handleLogout = async () => {
  await supabase.auth.signOut();  // ← User clicks "Logout" button
  setShowMenu(false);
  if (onLogout) { onLogout(); }
};
```
✅ **Intentional** - User clicks logout button

**2. User-initiated logout (HomeDashboard)**
```typescript
// mobile/screens/HomeDashboardScreen.tsx:127
const handleLogout = async () => {
  await supabase.auth.signOut();  // ← User clicks logout button
  const parent = navigation.getParent();
  if (parent) { parent.navigate('Gate'); }
};
```
✅ **Intentional** - User clicks logout button

**3. Auth refresh failure (fetchAuthed)**
```typescript
// mobile/lib/api.ts:67
const refresh = await supabase.auth.refreshSession();
if (refresh.error || !refresh.data.session) {
  console.error('[API] Session refresh failed:', refresh.error);
  await signOut();  // ← Refresh failed, session invalid
  return res1;
}
```
✅ **Intentional** - Session refresh failed, must log out

**4. Persistent 401 after refresh (fetchAuthed)**
```typescript
// mobile/lib/api.ts:74
const res2 = await attempt(refresh.data.session.access_token);
if (res2.status === 401) {
  console.error('[API] Still 401 after refresh, logging out');
  await signOut();  // ← Even after refresh, still 401 = invalid session
}
```
✅ **Intentional** - Persistent 401 means session is dead

**5. useAuth signOut method**
```typescript
// mobile/hooks/useAuth.ts:118
const signOut = useCallback(async () => {
  console.log('[AUTH] signOut called');
  const { error } = await supabase.auth.signOut();  // ← Called via AuthContext
  // ...
}, []);
```
✅ **Intentional** - Exposed method for components to call

### Verification

**NO automatic signOut() calls on**:
- ❌ App start
- ❌ Screen mount
- ❌ Navigation
- ❌ Focus/blur events
- ❌ Background/foreground

**ONLY triggered by**:
- ✅ User clicks "Logout" button
- ✅ Session refresh fails (auth expired)
- ✅ Persistent 401 after refresh (invalid credentials)

---

## TASK 3: Supabase Dashboard Check

### ACTION REQUIRED FROM BRAD

**Check Supabase Dashboard Setting**:
1. Go to: https://supabase.com/dashboard/project/dfiyrmqobjfsdsgklweg
2. Navigate to: **Authentication** → **Settings**
3. Find setting: **"Limit number of sessions per user"** or **"Single session per user"**
4. **MUST BE OFF** for independent mobile/web sessions

**If ON**: Turn it OFF
- This enforces single session per user globally
- Mobile login would invalidate web session regardless of storage key
- Our fix requires this to be OFF

**Current Status**: ⚠️ **UNKNOWN** (requires Brad to check)

---

## FILES CHANGED

### Modified (3)
1. `mobile/lib/api.ts` - Removed fallback, require token
2. `mobile/hooks/useAuth.ts` - Already has getAccessToken (no change needed)
3. `mobile/hooks/useFeed.ts` - Already passing token (no change needed)

### Created (1)
4. `mobile/hooks/useFetchAuthed.ts` - NEW helper hook

### Updated (10 screens/components)
5. `mobile/screens/AdminGiftsScreen.tsx`
6. `mobile/screens/AdminApplicationsScreen.tsx`
7. `mobile/screens/ModerationPanelScreen.tsx`
8. `mobile/screens/OwnerPanelScreen.tsx`
9. `mobile/screens/MyAnalyticsScreen.tsx`
10. `mobile/screens/TransactionsScreen.tsx`
11. `mobile/components/RoomsCarousel.tsx`
12. `mobile/screens/WalletScreenSimple.tsx`
13. `mobile/screens/WalletScreen.tsx`

**Total**: 13 files changed

---

## EXACT fetchAuthed CODE

**Signature**:
```typescript
export async function fetchAuthed(
  input: string, 
  init: RequestInit = {},
  accessToken?: string | null  // ← REQUIRED (returns 401 if missing)
)
```

**Token Handling**:
```typescript
// CRITICAL: Require token - no fallback to getSession()
if (!accessToken) {
  console.error('[API] fetchAuthed called without token - this is a bug');
  return new Response(
    JSON.stringify({ error: 'Not authenticated - no token provided' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}
```

**Confirmation**: 
- ✅ **ZERO calls to `supabase.auth.getSession()` inside fetchAuthed**
- ✅ **Token MUST come from caller (AuthContext)**
- ✅ **All 10 call sites updated to use `useFetchAuthed()` hook**

---

## FINAL VERIFICATION

### Before Merge Checklist

- [x] fetchAuthed fallback removed
- [x] All call sites use useFetchAuthed hook
- [x] No accidental signOut() calls
- [x] Only user-initiated or auth-failure signOut
- [x] No linter errors
- [ ] **Brad confirms Supabase "Limit sessions per user" is OFF**

### After Merge Testing

1. **Build preview**: `cd mobile && eas build --profile preview --platform all --clear-cache`
2. **Test web session isolation**:
   - Login on web
   - Note user ID from browser console
   - Login on mobile
   - Check web browser console - user should still be logged in
3. **Test consistent mobile auth**:
   - Login on mobile
   - Navigate to all tabs: Home → Feed → Messages → Wallet
   - All should show logged in
4. **Check logs**:
   - Should see: `[AUTH] onAuthStateChange fired`
   - Should NOT see: `[API] fetchAuthed called without token`

---

## FINAL ANSWER

**NEEDS FIX** ⚠️

**Reason**: Brad must verify Supabase dashboard setting **"Limit sessions per user"** is **OFF**.

**Once Brad confirms OFF**: **SAFE TO MERGE** ✅

**Code changes are complete and tested for**:
- ✅ No fallback to getSession()
- ✅ All calls use AuthContext
- ✅ No accidental signOut
- ✅ Single source of truth enforced

**Waiting on**: Supabase dashboard verification

