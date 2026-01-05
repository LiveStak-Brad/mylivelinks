import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

import { getRuntimeEnv } from './env';
import { logStartupBreadcrumb } from './startupTrace';

const supabaseUrl = getRuntimeEnv('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getRuntimeEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Log missing env vars but DON'T crash the app
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[SUPABASE] Missing environment variables:');
  if (!supabaseUrl) console.error('  - EXPO_PUBLIC_SUPABASE_URL is not set');
  if (!supabaseAnonKey) console.error('  - EXPO_PUBLIC_SUPABASE_ANON_KEY is not set');
  console.error('[SUPABASE] App will run in offline mode. Auth features will not work.');
  logStartupBreadcrumb('SUPABASE_ENV_MISSING', {
    hasUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(supabaseAnonKey),
  });
} else {
  logStartupBreadcrumb('SUPABASE_INIT', {
    host: (() => {
      try {
        return new URL(supabaseUrl).host;
      } catch {
        return 'invalid-url';
      }
    })(),
  });
}

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.warn('[SecureStore] getItem failed:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      return await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn('[SecureStore] setItem failed:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      return await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn('[SecureStore] removeItem failed:', error);
    }
  },
};

const safeSupabaseUrl = supabaseUrl ?? 'https://example.supabase.co';
const safeSupabaseAnonKey = supabaseAnonKey ?? 'public-anon-key-not-set';

export const supabaseBaseUrl = safeSupabaseUrl;

let derivedProjectRef = 'local';
try {
  const host = new URL(safeSupabaseUrl).host;
  derivedProjectRef = host.split('.')[0] || derivedProjectRef;
} catch {
  // ignore – fallback to "local"
}

export const supabaseProjectRef = derivedProjectRef;

export const supabase = createClient(safeSupabaseUrl, safeSupabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // CRITICAL: Use unique storage key to prevent conflicts with web sessions
    // Web uses default 'sb-{project-ref}-auth-token' in localStorage
    // Mobile uses 'sb-mobile-auth-token' in SecureStore
    // This allows independent sessions without backend token invalidation
    storageKey: 'sb-mobile-auth-token',
  },
});
