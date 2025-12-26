import { supabase } from './supabase';

function getApiBaseUrl() {
  const raw = process.env.EXPO_PUBLIC_API_URL || 'https://mylivelinks.com';
  return raw.replace(/\/+$/, '');
}

export async function signOut() {
  try {
    await supabase.auth.signOut();
  } catch {
    // noop
  }
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return token;
}

export async function fetchAuthed(input: string, init: RequestInit = {}) {
  const url = input.startsWith('http')
    ? input
    : `${getApiBaseUrl()}${input.startsWith('/') ? '' : '/'}${input}`;

  const attempt = async (): Promise<Response> => {
    const token = await getAccessToken();
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');

    return fetch(url, {
      ...init,
      headers,
    });
  };

  const res1 = await attempt();
  if (res1.status !== 401) return res1;

  const refresh = await supabase.auth.refreshSession();
  if (refresh.error || !refresh.data.session) {
    await signOut();
    return res1;
  }

  const res2 = await attempt();
  if (res2.status === 401) {
    await signOut();
  }

  return res2;
}
