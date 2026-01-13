/**
 * Canonical profile navigation helper for mobile app.
 * 
 * This ensures consistent profile routing across the entire app.
 * Always prefer profileId when available, fall back to username.
 * 
 * Usage:
 *   navigateToProfile(navigation, { profileId: 'uuid' })
 *   navigateToProfile(navigation, { username: 'johndoe' })
 */

export type ProfileNavigationParams = {
  profileId?: string;
  username?: string;
};

export function navigateToProfile(
  navigation: any,
  params: ProfileNavigationParams
): void {
  if (!params.profileId && !params.username) {
    console.error('[profileNavigation] No profileId or username provided');
    return;
  }

  navigation.navigate('ProfileViewScreen', {
    profileId: params.profileId,
    username: params.username,
  });
}

/**
 * Navigate to own profile (uses current user context)
 */
export function navigateToOwnProfile(navigation: any, currentUserId: string): void {
  if (!currentUserId) {
    console.error('[profileNavigation] No current user ID');
    return;
  }

  navigation.navigate('ProfileViewScreen', {
    profileId: currentUserId,
  });
}
