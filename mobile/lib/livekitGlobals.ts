let attempted = false;

/**
 * LiveKit/WebRTC globals are intentionally NOT initialized at app startup.
 * Call this ONLY from live-related screens/hooks (lazy) so normal boot never depends on LiveKit.
 */
export function ensureLivekitGlobals(): boolean {
  const g: any = globalThis as any;
  // DEPRECATED: `registerGlobals()` must only be called via `ensureLiveKitReady()`.
  // This function now only reports whether LiveKit globals have been registered.
  if (g.__LIVEKIT_GLOBALS_REGISTERED__ === true) return true;
  if (attempted) return false;
  attempted = true;
  return false;
}

