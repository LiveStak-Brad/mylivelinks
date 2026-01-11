let attempted = false;

/**
 * LiveKit/WebRTC globals are intentionally NOT initialized at app startup.
 * Call this ONLY from live-related screens/hooks (lazy) so normal boot never depends on LiveKit.
 */
export function ensureLivekitGlobals(): boolean {
  const g: any = globalThis as any;
  if (g.__LIVEKIT_GLOBALS_REGISTERED__ === true) return true;
  if (attempted) return false;

  attempted = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const livekit = require('@livekit/react-native');
    const fn = livekit?.registerGlobals;
    if (typeof fn === 'function') {
      fn();
    }
    g.__LIVEKIT_GLOBALS_REGISTERED__ = true;
    console.log('[LIVEKIT] registerGlobals OK (lazy)');
    return true;
  } catch (e: any) {
    g.__LIVEKIT_GLOBALS_REGISTERED__ = false;
    console.log('[LIVEKIT] registerGlobals failed (lazy)', e?.message ?? e);
    return false;
  }
}

