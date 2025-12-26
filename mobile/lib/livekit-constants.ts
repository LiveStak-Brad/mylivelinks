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





