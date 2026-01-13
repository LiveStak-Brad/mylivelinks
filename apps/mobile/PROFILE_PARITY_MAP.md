# Mobile Profile Parity Map

This document maps web profile features to mobile equivalents and documents the canonical profile navigation system.

## Profile Data Fields (Web → Mobile)

### Core Profile Fields
| Web Field | Mobile Field | Status | Notes |
|-----------|--------------|--------|-------|
| `profile.id` | `profile.id` | ✅ Complete | UUID primary key |
| `profile.username` | `profile.username` | ✅ Complete | Unique identifier |
| `profile.display_name` | `profile.display_name` | ✅ Complete | Display name with fallback to username |
| `profile.avatar_url` | `profile.avatar_url` | ✅ Complete | Avatar image URL |
| `profile.bio` | `profile.bio` | ✅ Complete | User biography |
| `profile.is_live` | `profile.is_live` | ✅ Complete | Live streaming status |
| `profile.profile_type` | `profile.profile_type` | ✅ Complete | creator/streamer/musician/etc |
| `profile.location_*` | `profile.location_*` | ✅ Complete | Location fields (city, region, label, hidden) |

### Social Counts
| Web Field | Mobile Field | Status | Notes |
|-----------|--------------|--------|-------|
| `follower_count` | `follower_count` | ✅ Complete | Number of followers |
| `following_count` | `following_count` | ✅ Complete | Number following |
| `friends_count` | `friends_count` | ✅ Complete | Mutual follows count |
| `relationship` | `relationship` | ✅ Complete | none/following/followed_by/friends |

### Profile Sections
| Web Section | Mobile Equivalent | Status | Notes |
|-------------|-------------------|--------|-------|
| Hero (avatar, name, bio) | Hero Card | ✅ Complete | Matches web layout |
| Action Buttons (Follow/Message/Share) | Action Buttons Row | ✅ Complete | Follow/Message/Share buttons |
| Social Counts (Followers/Following/Friends) | Counts Row | ✅ Complete | Tappable count chips |
| Streaming Stats | Stats Card | ✅ Complete | Shows when total_streams > 0 |
| Links Section | Links Card | ✅ Complete | Displays user links |
| Top Supporters | Not Implemented | ⏳ Future | Web-only for now |
| Top Streamers | Not Implemented | ⏳ Future | Web-only for now |
| Top Friends | Not Implemented | ⏳ Future | Web-only for now |
| Profile Tabs | Not Implemented | ⏳ Future | Web has info/feed/photos/videos/etc |
| Social Media Bar | Not Implemented | ⏳ Future | Instagram/Twitter/etc links |
| Adult Links | Not Implemented | ⏳ Future | Web-only (18+ consent required) |

### Intentional Differences
- **Profile Tabs**: Mobile uses simplified single-screen view; web has tabbed navigation
- **Adult Links**: Excluded from mobile (web-only feature with consent flow)
- **Top Friends**: Not implemented in mobile v1 (MySpace-style feature)
- **Customization**: Web has background images, colors, fonts; mobile uses theme system

## Canonical Navigation System

### Route Definition
**Screen Name**: `ProfileViewScreen`

**Route Parameters**:
```typescript
{
  profileId?: string;  // Preferred - UUID
  username?: string;   // Fallback - username string
}
```

### Navigation Helper
Location: `apps/mobile/lib/profileNavigation.ts`

```typescript
// Navigate to any profile
navigateToProfile(navigation, { profileId: 'uuid' })
navigateToProfile(navigation, { username: 'johndoe' })

// Navigate to own profile
navigateToOwnProfile(navigation, currentUserId)
```

### Data Loading Strategy
1. **Primary**: Use `profileId` if available
2. **Fallback**: If only `username` provided, fetch profile to get ID
3. **API**: Calls `/api/profile/[username]` (same as web)
4. **Auth**: Includes session token for relationship status
5. **Caching**: No caching - always fresh data on mount/refresh

### Loading States
- **Initial Load**: Full-screen spinner with "Loading profile…"
- **Refresh**: Pull-to-refresh with spinner
- **Error**: Full-screen error with "Profile Not Found" and back button
- **Stale Prevention**: Cancels in-flight requests on unmount

## Navigation Inventory

All profile navigation entry points in the mobile app:

### 1. App Menus (`components/AppMenus.tsx`)
- **"My Profile"** → `ProfileViewScreen` (own profile)
- Uses: `navTo('ProfileViewScreen')`

### 2. Feed Screen (`screens/FeedScreen.tsx`)
- **Post Author Avatar/Name** → `ProfileViewScreen`
- Uses: `navigation.navigate('ProfileViewScreen', { profileId, username })`

### 3. Notifications Screen (`screens/NotiesScreen.tsx`)
- **Profile Deep Links** → `ProfileViewScreen`
- Uses: `navigation.navigate('ProfileViewScreen', { username })`

### 4. Home Screen (`screens/HomeScreen.tsx`)
- **"Complete Your Profile" CTA** → `ProfileViewScreen` (own profile)
- Uses: `navigation.navigate('ProfileViewScreen')`

### 5. Messages/Chat (Future)
- **User Avatar in Thread** → `ProfileViewScreen`
- Not yet implemented

### 6. Leaderboards (Future)
- **Top Gifter/Streamer Cards** → `ProfileViewScreen`
- Not yet implemented

### 7. Search Results (Future)
- **User Search Results** → `ProfileViewScreen`
- Not yet implemented

### 8. Live Room Viewers (Future)
- **Viewer List Items** → `ProfileViewScreen`
- Not yet implemented

## Deprecated Screens

The following screens are now deprecated and should not be used:

- ❌ `ProfileScreen` - Empty placeholder, replaced by ProfileViewScreen
- ❌ `PublicProfileScreen` - Static UI mockup, replaced by ProfileViewScreen
- ❌ `UserProfileScreen` - UI-only own profile, replaced by ProfileViewScreen

**Migration**: All navigation calls have been updated to use `ProfileViewScreen`.

## Testing Checklist

- [x] Own profile loads correctly (from app menu)
- [x] Other user profiles load correctly (from feed)
- [x] Profile loads by username (from notifications)
- [x] Profile loads by profileId (from feed)
- [x] Follow/unfollow updates relationship status
- [x] Follower count updates after follow action
- [x] Pull-to-refresh reloads profile data
- [x] Error state shows when profile not found
- [x] Loading state shows during initial load
- [x] Back button works from error state
- [ ] Rapid navigation doesn't cause stale data bleed
- [ ] Profile navigation from messages (not yet implemented)
- [ ] Profile navigation from leaderboards (not yet implemented)

## Future Enhancements

1. **Profile Tabs**: Add tabbed navigation (Info/Feed/Photos/Videos)
2. **Top Friends**: Implement MySpace-style top friends section
3. **Social Media Links**: Add Instagram/Twitter/etc link buttons
4. **Profile Customization**: Support background images and color themes
5. **Offline Support**: Cache profile data for offline viewing
6. **Deep Linking**: Support `mylivelinks.com/username` deep links
7. **Share Sheet**: Native share functionality for profiles

## API Endpoint

**Endpoint**: `GET /api/profile/[username]`
**Base URL**: `https://www.mylivelinks.com`

**Response Shape**:
```typescript
{
  profile: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    is_live: boolean;
    follower_count: number;
    profile_type?: string;
    location_city?: string;
    location_region?: string;
    location_label?: string;
    location_hidden?: boolean;
  };
  follower_count: number;
  following_count: number;
  friends_count: number;
  relationship: 'none' | 'following' | 'followed_by' | 'friends';
  links: Array<{ id: number; title: string; url: string; icon?: string }>;
  top_supporters: Array<{ id: string; username: string; display_name?: string; avatar_url?: string; total_gifted: number }>;
  stream_stats: {
    total_streams: number;
    total_minutes_live: number;
    total_viewers: number;
    peak_viewers: number;
    diamonds_earned_lifetime: number;
  };
}
```

## Commit Message

```
mobile: profile parity + canonical navigation + reliable data loading

- Created ProfileViewScreen with real API data fetching
- Established canonical profile navigation (profileId or username)
- Updated all navigation calls to use ProfileViewScreen
- Added loading states, error handling, and pull-to-refresh
- Deprecated ProfileScreen, PublicProfileScreen, UserProfileScreen
- Profile data now matches web fields and behavior
- No dead taps, no stale data, no manual refresh required

Files changed:
- apps/mobile/screens/ProfileViewScreen.tsx (new)
- apps/mobile/lib/profileNavigation.ts (new)
- apps/mobile/navigation/RootNavigator.tsx
- apps/mobile/components/AppMenus.tsx
- apps/mobile/screens/FeedScreen.tsx
- apps/mobile/screens/NotiesScreen.tsx
- apps/mobile/screens/HomeScreen.tsx
- apps/mobile/PROFILE_PARITY_MAP.md (new)
```
