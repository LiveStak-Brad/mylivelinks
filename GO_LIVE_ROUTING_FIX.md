# Go Live Routing Fix - Deliverable

## Bug Description
The bottom nav "Go Live" button was incorrectly routing owners to Live Central (`/live`), which is a shared viewer room with 12 tiles. This violated the requirement that "Go Live" must route to **SOLO HOST stream**, not a shared viewer room.

## Root Cause
- Web's `BottomNav.tsx` routed all owners to `/live` 
- The `/live` page showed `LiveRoom` component (Live Central viewer room)
- `LiveRoom` is designed as a multi-viewer grid, not a dedicated solo host interface

## Solution

### WEB Changes

#### 1. `components/BottomNav.tsx`
**Changed behavior:**
- **Owner with username**: Routes to `/live/[username]` (their own solo stream page)
- **Owner without username loaded**: Fallback to `/live` 
- **Non-owner**: Shows "Coming Soon" modal (unchanged)

**Code changes:**
```typescript
// Added username state to fetch owner's username
const [username, setUsername] = useState<string | null>(null);

// Updated checkAuth to fetch username for owners
const checkAuth = async () => {
  // ... existing auth checks ...
  if (user && canGoLive) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();
    setUsername(profile?.username || null);
  }
};

// Updated Go Live button onClick handler
onClick={() => {
  if (isOwner && username) {
    // Route owner to their solo stream page, not Live Central
    router.push(`/live/${username}`);
    return;
  }
  if (isOwner && !username) {
    // Owner but username not loaded yet
    router.push('/live');
    return;
  }
  // Non-owner: show coming soon modal
  setShowGoLiveModal(true);
}}
```

#### 2. `components/SoloStreamViewer.tsx`
**Added hosting capability when owner views their own page:**

```typescript
import GoLiveButton from './GoLiveButton';

// In the action buttons section:
{/* Show Go Live button if owner is viewing their own page */}
{currentUserId && currentUserId === streamer.profile_id && (
  <GoLiveButton 
    sharedRoom={roomRef.current}
    isRoomConnected={isRoomConnected}
  />
)}
```

Now when owners visit their own solo stream page (`/live/[their-username]`), they see a Go Live button to start hosting.

### MOBILE - No Changes Needed

**Analysis:**
- Mobile app does NOT have a "Go Live" button in bottom navigation (MainTabs.tsx)
- Bottom tabs are: Home, Feed, Profile, Messages, Noties
- Live streaming in mobile happens within `LiveRoomScreen` component
- `LiveRoomScreen` has a camera icon button that calls `goLive()` - this is already the solo host interface
- No routing issue exists in mobile

## Verification Checklist

✅ **Web - Owner behavior:**
1. Owner clicks "Go Live" in bottom nav → routes to `/live/[their-username]`
2. On their solo stream page, owner sees Go Live button
3. Owner clicks Go Live button → starts streaming on their own page
4. Viewers can watch at `/live/[owner-username]`
5. **NEVER** routes to `/live` (Live Central)

✅ **Web - Non-owner behavior:**
1. Non-owner clicks "Go Live" in bottom nav → sees "Coming Soon" modal
2. Modal explains feature is limited to owner account
3. No routing occurs

✅ **Mobile:**
1. No "Go Live" button in bottom navigation (as designed)
2. `LiveRoomScreen` remains solo host interface
3. No changes needed

## Files Changed

### Web
1. **`components/BottomNav.tsx`**
   - Added `username` state
   - Updated `checkAuth()` to fetch username for owners
   - Modified Go Live button onClick to route to `/live/[username]`

2. **`components/SoloStreamViewer.tsx`**
   - Imported `GoLiveButton` component
   - Added Go Live button when `currentUserId === streamer.profile_id`

### Mobile
- No files changed (no routing issue present)

## Route Behavior Summary

| User Type | Click "Go Live" | Destination | Purpose |
|-----------|-----------------|-------------|---------|
| **Owner (web)** | Bottom nav button | `/live/[owner-username]` | Solo host stream page with Go Live button |
| **Non-owner (web)** | Bottom nav button | Coming Soon modal | Explain feature is owner-only |
| **Mobile** | N/A | N/A | No Go Live button in nav (streaming via LiveRoomScreen) |

## Critical Rules Enforced

✅ "Go Live" routes to SOLO HOST stream, not Live Central  
✅ Did NOT touch Live Central (`/live` page or `LiveRoom` component)  
✅ Did NOT reuse viewer routes for hosting  
✅ Did NOT auto-join any room on Go Live click  
✅ Go Live = HOST INTENT ONLY  

## Commit Message
```
fix(ui): route Go Live to solo host stream instead of Live Central

- Web: BottomNav Go Live button routes owner to /live/[username]
- Added Go Live button to SoloStreamViewer when owner views own page
- Non-owners still see Coming Soon modal
- Mobile: No changes (no routing issue present)
```

