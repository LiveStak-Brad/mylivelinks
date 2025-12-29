# Profile Module Visibility Fix

## Problem
Profile modules were being displayed even when users unchecked them in their profile settings. For example, the "Referral Network" module was showing on profiles even when disabled in the "Add / Remove Modules" settings.

## Root Cause
Several profile sections were rendered without checking if the corresponding module was enabled in the user's `enabled_modules` preference:
- Referral Network
- Social Counts Widget  
- Top Supporters Widget
- Top Streamers Widget
- Connections Section
- Stats Card (Profile Stats / Streaming Stats)

## Solution
Updated `app/[username]/modern-page.tsx` to wrap all optional module sections with `isSectionEnabled()` checks that respect the user's `enabled_modules` preferences.

### Changes Made

#### 1. Referral Progress Module (line ~1104)
**Before:**
```tsx
{isOwnProfile && (
  <div className="mb-4 sm:mb-6">
    <ReferralProgressModule ... />
  </div>
)}
```

**After:**
```tsx
{isOwnProfile && isSectionEnabled('referral_network', profile.profile_type as ConfigProfileType, profile.enabled_modules as any) && (
  <div className="mb-4 sm:mb-6">
    <ReferralProgressModule ... />
  </div>
)}
```

#### 2. Stats & Social Grid (line ~1199)
**Before:**
```tsx
{!profile.hide_streaming_stats && (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6">
    <SocialCountsWidget ... />
    <TopSupportersWidget ... />
    <TopStreamersWidget ... />
  </div>
)}
```

**After:**
```tsx
{!profile.hide_streaming_stats && (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6">
    {isSectionEnabled('social_counts', ...) && (
      <SocialCountsWidget ... />
    )}
    {isSectionEnabled('top_supporters', ...) && (
      <TopSupportersWidget ... />
    )}
    {isSectionEnabled('top_streamers', ...) && (
      <TopStreamersWidget ... />
    )}
  </div>
)}
```

#### 3. Connections Section (line ~1257)
**Before:**
```tsx
{/* Connections Section - Following, Followers, Friends */}
<div className={`${borderRadiusClass} overflow-hidden shadow-lg mb-4 sm:mb-6`} style={cardStyle}>
  ...
</div>
```

**After:**
```tsx
{/* Connections Section - Following, Followers, Friends - Check if connections module is enabled */}
{isSectionEnabled('connections', profile.profile_type as ConfigProfileType, profile.enabled_modules as any) && (
  <div className={`${borderRadiusClass} overflow-hidden shadow-lg mb-4 sm:mb-6`} style={cardStyle}>
    ...
  </div>
)}
```

#### 4. Stats Card (line ~1356)
**Before:**
```tsx
{!profile.hide_streaming_stats && (
  <StatsCard ... />
)}
```

**After:**
```tsx
{!profile.hide_streaming_stats && (isSectionEnabled('profile_stats', ...) || isSectionEnabled('streaming_stats', ...)) && (
  <StatsCard ... />
)}
```

## How Module Visibility Works

The `isSectionEnabled()` function (from `lib/profileTypeConfig.ts`) checks module visibility in this order:

1. **Core modules** (hero, footer, social_media, links) → Always enabled
2. **Custom enabled modules** → If user has `enabled_modules` set, check if module is in that list
3. **Profile type defaults** → Fall back to default modules for the user's profile_type (streamer, musician, comedian, business, creator)

## Module Configuration

Optional modules are configured in `components/profile/ProfileModulePicker.tsx`:

- `connections` - Friends and followers
- `referral_network` - Referral stats and network tree
- `music_showcase` - Music library
- `upcoming_events` - Event schedule
- `streaming_stats` - Live hours, viewer counts
- `profile_stats` - Account age, join date
- `social_counts` - Follower/following counts
- `top_supporters` - Users who gifted you
- `top_streamers` - Streamers you support
- `merchandise` - Merch store
- `portfolio` - Work showcase
- `business_info` - Hours, location, contact

## Testing
To verify the fix:
1. Go to Settings → Profile
2. Click "Add / Remove Modules"
3. Uncheck "Referral Network" (or any other module)
4. Save changes
5. Visit your public profile
6. Confirm that the unchecked module no longer appears

## Files Modified
- `app/[username]/modern-page.tsx` - Added module visibility checks for all optional sections

