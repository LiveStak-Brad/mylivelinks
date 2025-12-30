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










