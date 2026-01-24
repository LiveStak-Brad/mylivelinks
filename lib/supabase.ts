import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * SINGLETON Supabase client for browser usage
 * Prevents multiple GoTrueClient instances
 * Uses @supabase/ssr for Next.js App Router compatibility
 */
let clientInstance: SupabaseClient | null = null;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Build-time mock for SSR (prevents build failures)
  if (!url || !key) {
    if (typeof window === 'undefined') {
      // Return mock client for server-side build
      return {
        auth: {
          getUser: async () => ({ data: { user: null }, error: { message: 'Missing Supabase environment variables' } }),
          getSession: async () => ({ data: { session: null }, error: null }),
          signUp: async () => ({ data: null, error: { message: 'Missing Supabase environment variables' } }),
          signInWithPassword: async () => ({ data: null, error: { message: 'Missing Supabase environment variables' } }),
          signInWithOAuth: async () => ({ data: null, error: { message: 'Missing Supabase environment variables' } }),
          linkIdentity: async () => ({ data: null, error: { message: 'Missing Supabase environment variables' } }),
          signOut: async () => ({ error: { message: 'Missing Supabase environment variables' } }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        },
        from: () => ({
          select: () => ({ 
            single: async () => ({ data: null, error: { message: 'Missing Supabase environment variables' } }),
            eq: () => ({ single: async () => ({ data: null, error: null }) }),
          }),
          insert: async () => ({ data: null, error: { message: 'Missing Supabase environment variables' } }),
          update: async () => ({ data: null, error: { message: 'Missing Supabase environment variables' } }),
          delete: async () => ({ data: null, error: { message: 'Missing Supabase environment variables' } }),
        }),
        rpc: async () => ({ data: null, error: { message: 'Missing Supabase environment variables' } }),
        channel: () => ({
          on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
        }),
        removeChannel: () => {},
      } as unknown as SupabaseClient;
    }
    
    // Runtime browser error
    console.error('Missing Supabase environment variables');
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  // Return existing singleton instance
  if (clientInstance) {
    return clientInstance;
  }
  
  // Create singleton instance using SSR-compatible client with persistent storage
  clientInstance = createBrowserClient(url, key, {
    auth: {
      // Use localStorage for persistence (works in PWAs)
      // This prevents session loss on page refresh
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      // Auto-refresh tokens to prevent expiration
      autoRefreshToken: true,
      // Persist session across browser tabs
      persistSession: true,
      // Detect session from URL (for OAuth callbacks)
      detectSessionInUrl: true,
    },
  });
  
  return clientInstance;
}
