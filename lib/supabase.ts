import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Singleton client instance to avoid multiple GoTrueClient warnings
let clientInstance: any = null;

export function createClient(): any {
  // Re-check env vars at runtime (they're available in Next.js)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // During build time, return a mock client to prevent build failures
  // The actual error will occur at runtime when the client is used
  if (!url || !key) {
    // Check if we're in a build context (server-side during build)
    if (typeof window === 'undefined') {
      // Return a minimal mock client for build time
      // This prevents build failures but will fail at runtime if env vars aren't set
      return {
        auth: {
          getUser: async () => ({ data: { user: null }, error: { message: 'Missing Supabase environment variables' } }),
          signUp: async () => ({ data: null, error: { message: 'Missing Supabase environment variables' } }),
          signInWithPassword: async () => ({ data: null, error: { message: 'Missing Supabase environment variables' } }),
          signOut: async () => ({ error: { message: 'Missing Supabase environment variables' } }),
          onAuthStateChange: () => ({ data: { subscription: null }, error: null }),
        },
        from: () => ({
          select: () => ({ single: async () => ({ data: null, error: { message: 'Missing Supabase environment variables' } }) }),
          insert: () => ({ error: { message: 'Missing Supabase environment variables' } }),
          update: () => ({ error: { message: 'Missing Supabase environment variables' } }),
          delete: () => ({ error: { message: 'Missing Supabase environment variables' } }),
        }),
        rpc: () => ({ data: null, error: { message: 'Missing Supabase environment variables' } }),
        channel: () => ({
          on: () => ({ subscribe: () => {} }),
          subscribe: () => {},
        }),
        removeChannel: () => {},
      };
    }
    
    // At runtime in browser, throw error so user knows what's wrong
    console.error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
  }
  
  // Reuse existing client instance if available
  if (!clientInstance) {
    clientInstance = createSupabaseClient(url, key);
  }
  
  return clientInstance;
}
