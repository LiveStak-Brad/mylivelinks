/**
 * Default avatar utility for web
 * Returns the default no-profile-pic image path when avatar_url is null/undefined
 */

export const DEFAULT_AVATAR_PATH = '/no-profile-pic.png';

/**
 * Get avatar URL for web img/Image components
 * @param avatarUrl - The user's avatar_url from database
 * @returns URL string, defaults to no-profile-pic.png
 */
export function getAvatarUrl(avatarUrl: string | null | undefined): string {
  if (avatarUrl && avatarUrl.trim() !== '') {
    return avatarUrl;
  }
  return DEFAULT_AVATAR_PATH;
}

