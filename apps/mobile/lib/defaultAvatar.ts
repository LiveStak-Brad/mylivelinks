export const DEFAULT_AVATAR = require('../assets/no-profile-pic.png');

export function getAvatarSource(avatarUrl: string | null | undefined) {
  if (avatarUrl && avatarUrl.trim() !== '') {
    return { uri: avatarUrl };
  }
  return DEFAULT_AVATAR;
}

