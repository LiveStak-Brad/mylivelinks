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
    width: 1280,
    height: 720,
    frameRate: 30,
  },
  SD: {
    width: 640,
    height: 480,
    frameRate: 24,
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



