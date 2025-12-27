import { supabase, supabaseConfigured } from './supabase';

// Authenticated API helpers (mobile)

export type FetchAuthedResult = {
  ok: boolean;
  status: number;
  data?: any;
  message?: string;
};

function getApiBaseUrl() {
  const raw = process.env.EXPO_PUBLIC_API_URL || 'https://mylivelinks.com';
  return raw.replace(/\/+$/, '');
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabaseConfigured) {
    throw new Error('Supabase client not initialized. Please configure environment variables.');
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// CRITICAL: Token must be provided by caller from AuthContext (single source of truth)
// NO fallback to getSession() - that would bypass React state
export async function fetchAuthed(
  input: string,
  init: RequestInit = {},
  accessToken?: string | null
): Promise<FetchAuthedResult> {
  const url = input.startsWith('http')
    ? input
    : `${getApiBaseUrl()}${input.startsWith('/') ? '' : '/'}${input}`;

  // CRITICAL: Require token - no fallback to getSession()
  if (!accessToken) {
    const message = '[API] fetchAuthed called without accessToken';
    if (__DEV__) {
      throw new Error(message);
    }
    return {
      ok: false,
      status: 401,
      message: 'missing token',
    };
  }

  const attempt = async (token: string): Promise<FetchAuthedResult> => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');

    try {
      const res = await fetch(url, {
        ...init,
        headers,
      });

      const data = await res
        .json()
        .catch(() => null);

      return {
        ok: res.ok,
        status: res.status,
        data,
        message: (data as any)?.error || res.statusText || 'request failed',
      };
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        message: err?.message || 'network error',
      };
    }
  };

  return attempt(accessToken);
}
