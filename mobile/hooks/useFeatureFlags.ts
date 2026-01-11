import { useCallback, useEffect, useRef, useState } from 'react';

export type FeatureFlagsMap = Record<string, boolean>;

type UseFeatureFlagsState = {
  flags: FeatureFlagsMap | null;
  loading: boolean;
  error: string | null;
};

function getApiBaseUrl() {
  const raw = process.env.EXPO_PUBLIC_API_URL || 'https://www.mylivelinks.com';
  return raw.replace(/\/+$/, '');
}

export function useFeatureFlags() {
  const [state, setState] = useState<UseFeatureFlagsState>({
    flags: null,
    loading: false,
    error: null,
  });

  const lastLoadedAtRef = useRef<number>(0);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const load = useCallback(async () => {
    const now = Date.now();
    const ttlMs = 30_000;

    if (state.flags && now - lastLoadedAtRef.current < ttlMs) {
      return;
    }

    if (inFlightRef.current) {
      await inFlightRef.current;
      return;
    }

    const task = (async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/config/feature-flags`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error((json as any)?.error || `HTTP ${res.status}`);
        }

        const flags = (json as any)?.flags;
        setState({ flags: (flags || {}) as FeatureFlagsMap, loading: false, error: null });
        lastLoadedAtRef.current = Date.now();
      } catch (err: any) {
        setState({ flags: {}, loading: false, error: err?.message || 'Failed to load feature flags' });
      }
    })();

    inFlightRef.current = task;
    await task;
    inFlightRef.current = null;
  }, [state.flags]);

  useEffect(() => {
    void load();
  }, [load]);

  const giftingEnabled = state.flags?.gifting_enabled ?? true;

  return {
    flags: state.flags,
    loading: state.loading,
    error: state.error,
    giftingEnabled,
    refresh: load,
  };
}
