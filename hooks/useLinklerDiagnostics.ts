'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type LinklerDiagnostics = {
  ok: boolean;
  reqId: string;
  checkedAt: string;
  status: {
    online: boolean;
    label: 'online' | 'offline';
    latencyMs: number;
    error: string | null;
  };
  killSwitch: {
    disabled: boolean;
    updatedAt: string | null;
    source: 'env' | 'flag' | null;
    message: string | null;
  };
  usage: {
    windowHours: number;
    supportRequests: number;
    companionMessages: number;
  };
  lastError: {
    source: 'support' | 'companion';
    message: string;
    occurredAt: string;
  } | null;
};

type HookState = {
  diagnostics: LinklerDiagnostics | null;
  loading: boolean;
  error: string | null;
};

const INITIAL_STATE: HookState = {
  diagnostics: null,
  loading: true,
  error: null,
};

export function useLinklerDiagnostics() {
  const [state, setState] = useState<HookState>(INITIAL_STATE);
  const isMounted = useRef(true);

  const fetchDiagnostics = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/owner/linkler/diagnostics', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        const message = res.status === 401 || res.status === 403 ? 'Not authorized' : 'Failed to load diagnostics';
        throw new Error(message);
      }

      const json = (await res.json()) as LinklerDiagnostics;

      if (!isMounted.current) return;
      setState({ diagnostics: json, loading: false, error: null });
    } catch (error) {
      if (!isMounted.current) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load diagnostics',
      }));
    }
  }, []);

  useEffect(() => {
    void fetchDiagnostics();
    return () => {
      isMounted.current = false;
    };
  }, [fetchDiagnostics]);

  return {
    diagnostics: state.diagnostics,
    loading: state.loading,
    error: state.error,
    refresh: fetchDiagnostics,
  };
}
