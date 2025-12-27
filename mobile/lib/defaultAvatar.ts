/**
 * Default avatar utility for mobile
 * Returns the default no-profile-pic image when avatar_url is null/undefined
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const DEFAULT_AVATAR = require('../assets/no-profile-pic.png');

/**
 * Get avatar source for React Native Image component
 * @param avatarUrl - The user's avatar_url from database
 * @returns Image source object with uri or local asset
 */
export function getAvatarSource(avatarUrl: string | null | undefined) {
  if (avatarUrl && avatarUrl.trim() !== '') {
    return { uri: avatarUrl };
  }
  return DEFAULT_AVATAR;
}

/**
 * Get avatar URI string (for web-style components)
 * @param avatarUrl - The user's avatar_url from database
 * @returns URI string or null for default
 */
export function getAvatarUri(avatarUrl: string | null | undefined): string | null {
  if (avatarUrl && avatarUrl.trim() !== '') {
    return avatarUrl;
  }
  return null; // Component should use DEFAULT_AVATAR
}

