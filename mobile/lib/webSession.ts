import { Buffer } from 'buffer';
import type { Session } from '@supabase/supabase-js';

import { supabase, supabaseBaseUrl, supabaseProjectRef } from './supabase';

export const WEB_APP_ORIGIN = 'https://www.mylivelinks.com';
const SESSION_REFRESH_SKEW_MS = 60_000;
const cookieName = `sb-${supabaseProjectRef}-auth-token`;

function encodeBase64(input: string) {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(input);
  }
  return Buffer.from(input, 'utf8').toString('base64');
}

async function ensureFreshSession(): Promise<Session> {
  const { data } = await supabase.auth.getSession();
  let session = data?.session ?? null;

  if (!session) {
    throw new Error('No Supabase session available');
  }

  const expiresAtMs = typeof session.expires_at === 'number' ? session.expires_at * 1000 : null;
  const needsRefresh = typeof expiresAtMs === 'number' && expiresAtMs <= Date.now() + SESSION_REFRESH_SKEW_MS;

  if (needsRefresh) {
    try {
      const refreshResult = await supabase.auth.refreshSession();
      session = refreshResult.data?.session ?? session;
    } catch (error) {
      console.warn('[WEB_SESSION] Failed to refresh session before request:', error);
    }
  }

  return session;
}

function buildCookieValue(session: Session) {
  const payload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type ?? 'bearer',
    user: session.user,
  });
  const encoded = encodeBase64(payload);
  return `${cookieName}=base64-${encoded}`;
}

export interface WebSessionHeaderOptions {
  includeBearer?: boolean;
  contentTypeJson?: boolean;
  headers?: HeadersInit;
}

export async function createWebRequestHeaders(options: WebSessionHeaderOptions = {}) {
  const session = await ensureFreshSession();
  const headers = new Headers(options.headers ?? undefined);
  headers.set('Origin', WEB_APP_ORIGIN);
  headers.set('Cookie', buildCookieValue(session));

  if (options.contentTypeJson) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.includeBearer) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  return { headers, session };
}

export interface WebFetchOptions extends WebSessionHeaderOptions {
  url?: string;
}

export async function fetchWithWebSession(input: string, init?: RequestInit, options?: WebFetchOptions) {
  const { headers } = await createWebRequestHeaders(options);
  const requestInit: RequestInit = {
    ...init,
    headers,
  };
  const targetUrl = input.startsWith('http')
    ? input
    : `${WEB_APP_ORIGIN}${input.startsWith('/') ? input : `/${input}`}`;

  return fetch(targetUrl, requestInit);
}

export function getWebAppOrigin() {
  return WEB_APP_ORIGIN;
}

export function getSupabaseBaseUrl() {
  return supabaseBaseUrl;
}
