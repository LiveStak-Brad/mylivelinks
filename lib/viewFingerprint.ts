/**
 * View Fingerprint Generator (Web)
 * 
 * Generates a deterministic SHA256 fingerprint for anonymous users
 * based on browser characteristics (NO PII).
 * 
 * Components: userAgent + platform + screen dimensions + timezone + language
 */

export async function generateViewFingerprint(): Promise<string> {
  if (typeof window === 'undefined') {
    return 'server-side-render';
  }

  try {
    const components = [
      navigator.userAgent || 'unknown',
      navigator.platform || 'unknown',
      `${screen.width}x${screen.height}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
      navigator.language || 'unknown'
    ];

    const fingerprintString = components.join('|');
    
    // Use Web Crypto API for SHA256
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprintString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.error('[ViewFingerprint] Failed to generate fingerprint:', error);
    // Fallback to a random ID for this session
    return `fallback-${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Get or create a cached fingerprint for this browser session
 * Stored in sessionStorage to avoid regenerating on every call
 */
export async function getCachedViewFingerprint(): Promise<string> {
  if (typeof window === 'undefined') {
    return 'server-side-render';
  }

  const CACHE_KEY = 'mylivelinks_view_fingerprint';
  
  try {
    // Check session cache
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      return cached;
    }

    // Generate new fingerprint
    const fingerprint = await generateViewFingerprint();
    sessionStorage.setItem(CACHE_KEY, fingerprint);
    
    return fingerprint;
  } catch (error) {
    console.error('[ViewFingerprint] Cache error:', error);
    return generateViewFingerprint();
  }
}
