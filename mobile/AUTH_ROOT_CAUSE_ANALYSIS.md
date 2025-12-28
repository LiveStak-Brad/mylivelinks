# AUTH SESSION CONFLICT - ROOT CAUSE ANALYSIS

## Problem Statement
- Logging in on mobile invalidates web session
- Mobile app shows partial auth state (Home logged in, Messages/Feed not)
- Header/menu not updating consistently

## Root Causes Identified

### PRIMARY CAUSE: Dual Auth State Sources
The mobile app has **two separate auth state sources** that can desynchronize:

1. **AuthContext (useAuth hook)**
   - Location: `mobile/hooks/useAuth.ts`
   - Method: `onAuthStateChange` listener + initial `getSession()`
   - State storage: React state via `useState`
   - Used by: HomeDashboardScreen, navigation guards

2. **Direct Supabase calls (fetchAuthed)**
   - Location: `mobile/lib/api.ts`
   - Method: Direct `supabase.auth.getSession()` on every API call
   - State storage: None (calls Supabase each time)
   - Used by: FeedScreen, MessagesScreen (via useFeed, useMessages)

**Problem**: These two sources can return different values:
- AuthContext has cached session in React state (from last `onAuthStateChange` event)
- `fetchAuthed` calls `getSession()` fresh, which queries SecureStore
- If token refresh happens, AuthContext might not update immediately
- This creates "partial logged in" state

### SECONDARY CAUSE: Missing Storage Key Isolation
Both mobile and web use the **same Supabase project** without differentiated storage keys:

**Mobile**: `mobile/lib/supabase.ts`
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,  // Uses device keychain
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**Web**: `lib/supabase.ts`
```typescript
clientInstance = createBrowserClient(url, key);  // Uses browser localStorage
```

While storage mechanisms differ (SecureStore vs localStorage), **they don't have explicit `storageKey` differentiation**. Supabase's default storage key format is:

```
sb-{project-ref}-auth-token
```

This is the SAME key for both mobile and web, which means:
- **On device**: SecureStore has key `sb-dfiyrmqobjfsdsgklweg-auth-token`
- **In browser**: localStorage has key `sb-dfiyrmqobjfsdsgklweg-auth-token`

While these are isolated storage systems, the issue occurs when:
1. User logs in on mobile → New session created with refresh token A
2. User was already logged in on web → Existing session with refresh token B
3. **Supabase backend may enforce single-session-per-user** or have token reuse detection
4. When mobile refreshes token A, it might invalidate token B
5. Web session becomes invalid

### TERTIARY CAUSE: onAuthStateChange Race Conditions
The `useAuth` hook structure has a subtle race condition:

```typescript
useEffect(() => {
  // 1. Initial session load
  const bootstrap = async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
  };
  bootstrap();

  // 2. Set up listener (runs in parallel)
  const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
    setSession(newSession);
  });

  return () => listener.subscription.unsubscribe();
}, []);
```

**Problem**: If a session event fires BEFORE `bootstrap()` completes, the state might be overwritten with stale data.

## Evidence

### Code Locations

**Auth State Source #1 - AuthContext**
- File: `mobile/hooks/useAuth.ts:24-65`
- Uses: `getSession()` + `onAuthStateChange`
- Consumers: GateScreen, HomeDashboardScreen

**Auth State Source #2 - Direct Calls**
- File: `mobile/lib/api.ts:26-35`  
- Function: `getAccessToken()`
- Calls: `supabase.auth.getSession()` directly
- Consumers: FeedScreen (via useFeed), MessagesScreen (via useMessages)

**Web Auth**
- File: `lib/supabase.ts:56`
- Uses: `createBrowserClient` (SSR-compatible, uses localStorage)
- No explicit `onAuthStateChange` listener in client code

## Why This Causes Partial Login State

1. User logs into mobile app
2. `signIn()` in `useAuth.ts:67-77` completes successfully
3. `onAuthStateChange` fires, updates React state → **Home screen shows logged in**
4. User navigates to Messages screen
5. `useMessages` hook loads → calls `fetchAuthed()` 
6. `fetchAuthed` calls `getAccessToken()` → calls `supabase.auth.getSession()`
7. **If session was just created, SecureStore might not have persisted yet**
8. OR token needs refresh, which fails
9. Returns 401 → **Messages screen shows logged out**

## Why Mobile Login Invalidates Web

This is likely a Supabase backend configuration issue:
- Supabase may limit concurrent sessions per user (check project settings)
- OR refresh token rotation is enabled, which invalidates old refresh tokens
- When mobile creates a new session, old web session's refresh token becomes invalid
- Web tries to refresh → fails → logs out

## Solution Required

1. **Make AuthContext the SINGLE source of truth**
   - Remove direct `getSession()` calls from `fetchAuthed`
   - Pass session from AuthContext to API calls
   - Ensure all components use AuthContext

2. **Add unique storage keys for mobile vs web**
   - Mobile: `storageKey: 'sb-mobile-auth-token'`
   - Web: Keep default (or set `storageKey: 'sb-web-auth-token'`)
   - This prevents any potential key conflicts

3. **Fix race condition in useAuth**
   - Use single source of truth pattern
   - Ensure `onAuthStateChange` is primary, `getSession()` is fallback

4. **Add session refresh coordination**
   - Implement retry logic with proper error handling
   - Add debug logging to track session state transitions

## Next Steps

1. Implement fixes (see separate file for code diff)
2. Add console logging to track:
   - When AuthContext updates
   - When fetchAuthed is called
   - Session state at each point
3. Test scenarios:
   - Login on mobile, verify web stays logged in
   - Navigate between screens, verify consistent auth state
   - Kill and restart app, verify session persists


