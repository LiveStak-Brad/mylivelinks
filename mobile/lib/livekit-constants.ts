/**
 * LiveKit Configuration Constants - Mobile
 * 
 * ⚠️ CRITICAL: These constants MUST match web exactly!
 * Web source: lib/livekit-constants.ts
 */

/**
 * Shared room name for ALL clients (web + mobile)
 * ⚠️ DO NOT CHANGE without coordinating with web
 */
export const LIVEKIT_ROOM_NAME = 'live_central' as const;

/**
 * Token endpoint path
 */
export const TOKEN_ENDPOINT_PATH = '/api/livekit/token' as const;

/**
 * Device type for mobile clients
 */
export const DEVICE_TYPE = 'mobile' as const;

/**
 * Debug logging flag
 */
export const DEBUG_LIVEKIT = process.env.EXPO_PUBLIC_DEBUG_LIVE === '1';

/**
 * Video quality presets
 */
export const VIDEO_PRESETS = {
  HD: {
    width: 1920,
    height: 1080,
    frameRate: 30,
    maxBitrate: 2_500_000, // 2.5 Mbps for high quality
  },
  SD: {
    width: 1280,
    height: 720,
    frameRate: 24,
    maxBitrate: 1_000_000, // 1 Mbps for standard quality
  },
} as const;

/**
 * Default video capture settings
 */
export const DEFAULT_VIDEO_CAPTURE = VIDEO_PRESETS.HD;

export const LIVE_OWNER_IDS = ['2b4a1178-3c39-4179-94ea-314dd824a818'] as const;
export const LIVE_OWNER_EMAILS = ['wcba.mo@gmail.com'] as const;

export function isLiveOwnerUser(user: { id?: string; email?: string | null } | null | undefined) {
  const id = user?.id ? String(user.id) : '';
  const email = user?.email ? String(user.email).toLowerCase() : '';
  const isOwnerById = !!id && (LIVE_OWNER_IDS as readonly string[]).includes(id);
  const isOwnerByEmail = !!email && (LIVE_OWNER_EMAILS as readonly string[]).includes(email);
  return isOwnerById || isOwnerByEmail;
}

export function canUserGoLive(user: { id?: string; email?: string | null } | null | undefined) {
  return isLiveOwnerUser(user);
}










