import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

const expoExtra: Record<string, any> =
  (Constants.expoConfig?.extra as any) ?? (Constants as any).manifest?.extra ?? (Constants as any).manifest2?.extra ?? {};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? expoExtra.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? expoExtra.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Log missing env vars but DON'T crash the app
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[SUPABASE] Missing environment variables:');
  if (!supabaseUrl) console.error('  - EXPO_PUBLIC_SUPABASE_URL is not set');
  if (!supabaseAnonKey) console.error('  - EXPO_PUBLIC_SUPABASE_ANON_KEY is not set');
  console.error('[SUPABASE] App will run in offline mode. Auth features will not work.');
}

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const safeSupabaseUrl = supabaseUrl ?? 'https://example.supabase.co';
const safeSupabaseAnonKey = supabaseAnonKey ?? 'public-anon-key-not-set';

export const supabase = createClient(safeSupabaseUrl, safeSupabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
