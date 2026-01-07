let ready = false;
let inFlight: Promise<void> | null = null;

/**
 * Authoritative LiveKit/WebRTC initialization gate.
 *
 * Rules:
 * - Must be called BEFORE any LiveKit-dependent modules are imported/required.
 * - Must call `registerGlobals()` exactly once (idempotent).
 * - Must never run at app startup; only invoked lazily from live screens/hooks.
 */
export async function ensureLiveKitReady(): Promise<void> {
  if (ready) return;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const g: any = globalThis as any;
    try {
      const mod: any = await import('@livekit/react-native');
      const registerGlobals = mod?.registerGlobals;
      if (typeof registerGlobals !== 'function') {
        throw new Error('LIVEKIT_REGISTERGLOBALS_MISSING');
      }
      registerGlobals();
      ready = true;
      g.__LIVEKIT_GLOBALS_REGISTERED__ = true;
      console.log('[LIVEKIT] registerGlobals OK (ensureLiveKitReady)');
    } catch (e: any) {
      ready = false;
      // Important: do NOT set this to false on failure; treat failure as retryable.
      try {
        delete g.__LIVEKIT_GLOBALS_REGISTERED__;
      } catch {
        // ignore
      }
      const msg = e?.message ? String(e.message) : String(e);
      console.log('[LIVEKIT] registerGlobals failed (ensureLiveKitReady)', msg);
      throw e;
    } finally {
      // allow retry if it failed
      if (!ready) inFlight = null;
    }
  })();

  return inFlight;
}

