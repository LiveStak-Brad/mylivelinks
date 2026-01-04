/**
 * Device ID Management
 * Persists a stable device identifier for multi-device session tracking
 * Safe for startup: uses in-memory fallback if SecureStore unavailable
 */

import * as SecureStore from 'expo-secure-store';

import { getRuntimeEnv } from './env';

const DEVICE_ID_KEY = 'mylivelinks_device_id';
const DEBUG = getRuntimeEnv('EXPO_PUBLIC_DEBUG_LIVE') === '1';

// In-memory cache (fallback if SecureStore fails)
let cachedDeviceId: string | null = null;

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create a stable device ID
 * Persists to SecureStore so it survives app uninstall/reinstall on same device
 * Safe for startup: returns in-memory ID immediately if SecureStore fails
 */
export async function getDeviceId(): Promise<string> {
  // Return cached if available
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  try {
    // Try to get existing device ID
    const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (existing) {
      cachedDeviceId = existing;
      if (DEBUG) {
        console.log('[DEVICE] Retrieved existing ID:', existing.substring(0, 8) + '...');
      }
      return existing;
    }

    // Generate new device ID
    const newDeviceId = generateUUID();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, newDeviceId);
    cachedDeviceId = newDeviceId;
    
    if (DEBUG) {
      console.log('[DEVICE] Generated new ID:', newDeviceId.substring(0, 8) + '...');
    }
    
    return newDeviceId;
  } catch (error) {
    console.error('[DEVICE] SecureStore error, using in-memory fallback:', error);
    // Fallback to session-only UUID if SecureStore fails
    if (!cachedDeviceId) {
      cachedDeviceId = generateUUID();
    }
    if (DEBUG) {
      console.warn('[DEVICE] Using session-only fallback ID');
    }
    return cachedDeviceId;
  }
}

/**
 * Generate a new session ID (UUID)
 * Called once per room connection
 */
export function generateSessionId(): string {
  const sessionId = generateUUID();
  if (DEBUG) {
    console.log('[SESSION] Generated new ID:', sessionId.substring(0, 8) + '...');
  }
  return sessionId;
}

/**
 * Clear device ID (for testing/reset)
 */
export async function clearDeviceId(): Promise<void> {
  cachedDeviceId = null;
  try {
    await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
    if (DEBUG) {
      console.log('[DEVICE] Cleared device ID');
    }
  } catch (error) {
    console.error('[DEVICE] Error clearing device ID:', error);
  }
}

