/**
 * View Fingerprint Generator (React Native)
 * 
 * Generates a deterministic SHA256 fingerprint for anonymous users
 * based on device characteristics (NO PII).
 * 
 * Components: userAgent + platform + screen dimensions + timezone + locale
 */

import { Platform, Dimensions } from 'react-native';
import * as Crypto from 'expo-crypto';

export async function generateViewFingerprint(): Promise<string> {
  try {
    const { width, height } = Dimensions.get('screen');
    
    const components = [
      Platform.OS || 'unknown',
      Platform.Version?.toString() || 'unknown',
      `${width}x${height}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
      Intl.DateTimeFormat().resolvedOptions().locale || 'unknown'
    ];

    const fingerprintString = components.join('|');
    
    // Use expo-crypto for SHA256
    const hashHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      fingerprintString
    );
    
    return hashHex;
  } catch (error) {
    console.error('[ViewFingerprint] Failed to generate fingerprint:', error);
    // Fallback to a random ID for this session
    return `fallback-${Math.random().toString(36).substring(2, 15)}`;
  }
}

let cachedFingerprint: string | null = null;

/**
 * Get or create a cached fingerprint for this app session
 * Cached in memory to avoid regenerating on every call
 */
export async function getCachedViewFingerprint(): Promise<string> {
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  cachedFingerprint = await generateViewFingerprint();
  return cachedFingerprint;
}
