# Mobile App UI Hardening - Dead Buttons Fix Complete

## Summary
Eliminated "broken app" perception by replacing all `onPress={() => {}}` handlers with either:
1. Real navigation to existing screens
2. Consistent "Coming soon" alerts using the new `showComingSoon()` helper

## Created Helper
- **`lib/showComingSoon.ts`** - Reusable helper that shows a consistent "Coming Soon" alert

## Files Modified

### Menu Components
- **`components/AppMenus.tsx`** - Gated Composer/Purchases as "SOON", wired Logout button

### Screens Fixed (22 files)

| Screen | Changes |
|--------|---------|
| `SearchScreen.tsx` | Wired search results to navigate to ProfileViewScreen/TeamsDetailScreen |
| `WatchScreen.tsx` | Added showComingSoon for hashtag/location press |
| `SettingsProfileScreen.tsx` | Fixed 6 dead buttons (profile type, overlay, opacity, radius, font, filter) |
| `MessagesScreen.tsx` | Fixed friend item press |
| `UserProfileScreen.tsx` | Fixed 11 dead buttons (share, stats, counts, supporters, streamers, socials, links) |
| `LinkDatingScreen.tsx` | Fixed 8 dead buttons (safety, swipe, profile, hub cards) |
| `LinkDatingMatchesScreen.tsx` | Fixed 4 dead buttons (filters, match, message, swipe) |
| `LinkAutoSwipeScreen.tsx` | Fixed 3 dead buttons (start, stop, row) |
| `TeamsRoomScreen.tsx` | Fixed 3 dead buttons (join, chat, leave) |
| `ComposerScreen.tsx` | Fixed 4 dead buttons (new project, icon actions, rows, cards) |
| `ComposerProjectScreen.tsx` | Fixed 2 dead buttons (new project, project card) |
| `LiveHostScreen.tsx` | Fixed 2 dead buttons (camera, microphone permissions) |
| `ProfileViewScreen.tsx` | Fixed 2 dead buttons (message, share) |
| `SettingsUsernameScreen.tsx` | Fixed 2 dead buttons (change username, cancel → goBack) |
| `PoliciesDataDeletionScreen.tsx` | Fixed data deletion request button |
| `SearchMediaScreen.tsx` | Fixed media viewer button |
| `SearchMusicScreen.tsx` | Fixed music player button |
| `SearchPeopleScreen.tsx` | Wired to navigate to ProfileViewScreen |
| `SettingsEmailScreen.tsx` | Fixed save email button |
| `SettingsPasswordScreen.tsx` | Fixed update password button |
| `TeamsDetailScreen.tsx` | Fixed invite members button |
| `TeamsInviteScreen.tsx` | Fixed send invite button |

## Intentionally Unchanged
- **`FeedScreen.tsx`** - Modal backdrop pattern (prevents event propagation)
- **`NotiesScreen.tsx`** - Modal backdrop pattern (prevents event propagation)

These are legitimate UX patterns where an inner Pressable with empty onPress prevents the backdrop's onPress from firing when tapping inside the modal card.

## Acceptance Criteria Met
- ✅ From any menu/tab, a user cannot reach a "stub" screen that looks broken
- ✅ No visible buttons do nothing (all show "Coming soon" or navigate)
- ✅ App feels intentional even if some items are deferred

## Commit Message
```
mobile: gate stubs + remove dead actions
```
