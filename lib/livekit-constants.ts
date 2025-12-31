/**
 * LiveKit Configuration Constants
 * 
 * These constants MUST be used by both web and mobile clients
 * to ensure compatibility and proper room connections.
 */

/**
 * Shared room name for all clients
 * DO NOT CHANGE without coordinating mobile app updates
 */
export const LIVEKIT_ROOM_NAME = 'live_central' as const;

/**
 * Debug logging flag
 * Set NEXT_PUBLIC_DEBUG_LIVEKIT=1 in environment to enable
 */
export const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';

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

/**
 * Token endpoint path
 */
export const TOKEN_ENDPOINT = '/api/livekit/token' as const;

/**
 * Room connection options
 */
export const ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: DEFAULT_VIDEO_CAPTURE,
} as const;

export const LIVE_LAUNCH_ENABLED = process.env.NEXT_PUBLIC_LIVE_LAUNCH_ENABLED === 'true';

export const LIVE_OWNER_IDS = ['2b4a1178-3c39-4179-94ea-314dd824a818', '0b47a2d7-43fb-4d38-b321-2d5d0619aabf'] as const;
export const LIVE_OWNER_EMAILS = ['wcba.mo@gmail.com', 'brad@mylivelinks.com'] as const;

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

 export function canAccessLive(user: { id?: string; email?: string | null } | null | undefined) {
   return LIVE_LAUNCH_ENABLED || isLiveOwnerUser(user);
 }










