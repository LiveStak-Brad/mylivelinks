# Follow Button Authentication Fix

## Problem
When a logged-in user tries to follow someone on their profile page, the system:
1. Shows "Please login" message (flashing)
2. Redirects to login page
3. Immediately returns to profile (since user is already logged in)
4. Follow action doesn't complete
5. Button still shows "Follow" instead of "Following"

## Root Cause
The issue was a **server-side authentication failure** in the `/api/profile/follow` endpoint:

1. Client-side: User is authenticated (has valid session)
2. Server-side: API endpoint fails to recognize the user's authentication
3. API returns 401 Unauthorized
4. Client interprets this as "not logged in" and redirects to login
5. User is already logged in, so redirects back immediately
6. Creates a redirect loop/flash effect

### Technical Details

The authentication flow had these issues:

**In the API route** (`app/api/profile/follow/route.ts`):
- Was trying Authorization header FIRST (less reliable in Next.js App Router)
- Cookie-based auth was only a fallback
- No proper session refresh handling

**In the client** (`app/[username]/modern-page.tsx`):
- Didn't verify user is logged in before making the request
- Immediately redirected on 401 without attempting session refresh
- No `credentials: 'include'` to ensure cookies are sent with fetch

## Solution

### 1. Server-Side Fix (API Route)

Changed authentication priority in `/api/profile/follow/route.ts`:

```typescript
// ✅ NEW: Try cookies FIRST (most reliable in Next.js App Router)
let supabase = createServerSupabaseClient();
const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser();

if (cookieUser && !cookieError) {
  user = cookieUser;
  console.log('Auth via cookies successful:', user.id);
} else {
  // ✅ Fallback to Authorization header token
  const authHeader = request.headers.get('authorization');
  // ... handle token auth
}
```

**Why this works:**
- In Next.js App Router with SSR, cookies are the primary auth mechanism
- Server components have direct access to cookies via `cookies()` from `next/headers`
- Authorization header is better for API-only clients, not browser-based apps

### 2. Client-Side Fix (Profile Page)

Enhanced authentication flow in `app/[username]/modern-page.tsx`:

```typescript
const handleFollow = async () => {
  // ✅ 1. Verify user is logged in FIRST
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // User is not logged in - redirect to login
    alert('Please log in to follow users');
    router.push('/login?returnUrl=' + encodeURIComponent(`/${username}`));
    return;
  }
  
  // ✅ 2. Get session for token
  const { data: { session } } = await supabase.auth.getSession();
  
  // ✅ 3. Make request with credentials and token
  const response = await fetch('/api/profile/follow', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
    },
    credentials: 'include', // ✅ Ensure cookies are sent
    body: JSON.stringify({ targetProfileId: profileData.profile.id })
  });
  
  // ✅ 4. Handle 401 with session refresh attempt
  if (response.status === 401) {
    const { error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      alert('Session expired. Please log in again.');
      router.push('/login?returnUrl=' + encodeURIComponent(`/${username}`));
    } else {
      alert('Session refreshed. Please try again.');
    }
    return;
  }
  
  // ✅ 5. Update UI locally on success
  if (data.success) {
    setProfileData(prev => prev ? {
      ...prev,
      relationship: data.status,
      follower_count: data.status === 'none' ? prev.follower_count - 1 : prev.follower_count + 1
    } : null);
  }
};
```

**Key improvements:**
1. **Pre-flight auth check**: Verify user is logged in before making API call
2. **Credentials include**: Ensure cookies are sent with fetch request
3. **Session refresh**: Attempt to refresh expired sessions before giving up
4. **Better error handling**: Distinguish between "not logged in" vs "session expired"
5. **Optimistic UI updates**: Update follower count immediately on success

## Testing

### Test Case 1: Follow when logged in
1. Log in as user A
2. Visit user B's profile
3. Click "Follow" button
4. ✅ Should immediately change to "Following" without redirect
5. ✅ Follower count should increment

### Test Case 2: Follow when not logged in
1. Log out
2. Visit any user's profile
3. Click "Follow" button
4. ✅ Should show "Please log in" alert
5. ✅ Should redirect to /login with returnUrl
6. ✅ After login, should return to profile

### Test Case 3: Follow with expired session
1. Log in
2. Manually expire session (clear auth cookies or wait for expiry)
3. Click "Follow" button
4. ✅ Should attempt session refresh
5. ✅ If refresh fails, redirect to login
6. ✅ If refresh succeeds, show "try again" message

### Test Case 4: Unfollow
1. Log in as user A
2. Visit user B's profile (already following)
3. Click "Following" button
4. ✅ Should change to "Follow"
5. ✅ Follower count should decrement

## Files Modified

1. `app/[username]/modern-page.tsx` - Client-side follow handler
2. `app/api/profile/follow/route.ts` - Server-side API endpoint

## Related Components

- `components/MiniProfile.tsx` - Has block/unblock but NOT follow (no changes needed)
- Database RPC: `toggle_follow()` function (no changes needed)
- Middleware: `middleware.ts` refreshes sessions automatically (no changes needed)

## Additional Notes

- The middleware already handles session refresh for page navigation
- This fix ensures API routes also handle authentication correctly
- Cookie-based auth is the recommended approach for Next.js App Router
- Authorization headers are still supported as a fallback for API clients

## Prevention

To prevent similar issues in the future:

1. **Always use `credentials: 'include'`** when making fetch requests to your own API
2. **Always check authentication client-side** before making authenticated API calls
3. **Always try cookie-based auth first** in Next.js API routes
4. **Always attempt session refresh** before redirecting to login
5. **Add comprehensive logging** to debug auth issues

