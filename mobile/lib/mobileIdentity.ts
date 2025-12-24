/**
 * Mobile Identity Management
 * Persists a stable identity for LiveKit connections
 * Uses Expo SecureStore for persistence
 */

import * as SecureStore from 'expo-secure-store';

const IDENTITY_KEY = 'mylivelinks_mobile_identity';
const DEBUG = process.env.EXPO_PUBLIC_DEBUG_LIVE === '1';

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
 */
export async function getMobileIdentity(): Promise<string> {
  try {
    // Try to get existing identity
    const existing = await SecureStore.getItemAsync(IDENTITY_KEY);
    if (existing) {
      if (DEBUG) {
        console.log('[IDENTITY] Retrieved existing:', existing.substring(0, 20) + '...');
      }
      return existing;
    }

    // Generate new identity
    const newIdentity = generateMobileIdentity();
    await SecureStore.setItemAsync(IDENTITY_KEY, newIdentity);
    
    if (DEBUG) {
      console.log('[IDENTITY] Generated new:', newIdentity);
    }
    
    return newIdentity;
  } catch (error) {
    console.error('[IDENTITY] SecureStore error:', error);
    // Fallback to in-memory identity if SecureStore fails
    return generateMobileIdentity();
  }
}

/**
 * Clear stored identity (for testing/logout)
 */
export async function clearMobileIdentity(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(IDENTITY_KEY);
    if (DEBUG) {
      console.log('[IDENTITY] Cleared');
    }
  } catch (error) {
    console.error('[IDENTITY] Error clearing:', error);
  }
}

