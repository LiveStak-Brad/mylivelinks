export const DEFAULT_AVATAR = require('../assets/no-profile-pic.png');

export function getAvatarSource(avatarUrl: string | null | undefined) {
  if (avatarUrl && avatarUrl.trim() !== '') {
    return { uri: avatarUrl };
  }
  return DEFAULT_AVATAR;
}

// Match web implementation - generates avatar URL from username if no avatar
export function getAvatarUrl(username: string): string {
  // For now, return a placeholder URL based on first letter
  // In production, this could use a service like UI Avatars or DiceBear
  const firstLetter = (username?.[0] || 'U').toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstLetter)}&background=4a90d9&color=fff&size=128`;
}