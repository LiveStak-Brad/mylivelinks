/**
 * Mobile Identity Management
 * Persists a stable identity for LiveKit connections
 * Safe for startup: uses in-memory fallback if SecureStore unavailable
 */

import * as SecureStore from 'expo-secure-store';

import { getRuntimeEnv } from './env';

const IDENTITY_KEY = 'mylivelinks_mobile_identity';
const DEBUG = getRuntimeEnv('EXPO_PUBLIC_DEBUG_LIVE') === '1';

// In-memory cache (fallback if SecureStore fails)
let cachedIdentity: string | null = null;

/**
 * Generate a stable mobile identity
 * Format: mobile-{timestamp}-{random}
 */
function generateMobileIdentity(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `mobile-${timestamp}-${random}`;
}

/**
 * Get or create a stable mobile identity
 * Persists to SecureStore so it survives app restarts
 * Safe for startup: returns in-memory identity immediately if SecureStore fails
 */
export async function getMobileIdentity(): Promise<string> {
  // Return cached if available
  if (cachedIdentity) {
    return cachedIdentity;
  }

  try {
    // Try to get existing identity
    const existing = await SecureStore.getItemAsync(IDENTITY_KEY);
    if (existing) {
      cachedIdentity = existing;
      if (DEBUG) {
        console.log('[IDENTITY] Retrieved existing:', existing.substring(0, 20) + '...');
      }
      return existing;
    }

    // Generate new identity
    const newIdentity = generateMobileIdentity();
    await SecureStore.setItemAsync(IDENTITY_KEY, newIdentity);
    cachedIdentity = newIdentity;
    
    if (DEBUG) {
      console.log('[IDENTITY] Generated new:', newIdentity);
    }
    
    return newIdentity;
  } catch (error) {
    console.error('[IDENTITY] SecureStore error, using in-memory fallback:', error);
    // Fallback to in-memory identity if SecureStore fails
    if (!cachedIdentity) {
      cachedIdentity = generateMobileIdentity();
    }
    return cachedIdentity;
  }
}

/**
 * Clear stored identity (for testing/logout)
 */
export async function clearMobileIdentity(): Promise<void> {
  cachedIdentity = null;
  try {
    await SecureStore.deleteItemAsync(IDENTITY_KEY);
    if (DEBUG) {
      console.log('[IDENTITY] Cleared');
    }
  } catch (error) {
    console.error('[IDENTITY] Error clearing:', error);
  }
}

