import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Check if we're in preview/seed mode
// Default to true if env vars are not set (for local dev)
const hasSupabaseConfig = 
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isPreviewMode = 
  process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true' ||
  !hasSupabaseConfig;

const isSeedMode = 
  process.env.NEXT_PUBLIC_DEV_SEED_MODE === 'true' ||
  !hasSupabaseConfig ||
  isPreviewMode;

// Mock Supabase client for preview mode
const createMockClient = () => {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signIn: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        // Return a mock subscription object
        return {
          data: {
            subscription: {
              unsubscribe: () => {},
            },
          },
        };
      },
    },
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
      eq: function() { return this; },
      order: function() { return this; },
      limit: function() { return this; },
      single: function() { return { data: null, error: null }; },
    }),
    rpc: async () => ({ data: null, error: null }),
    channel: () => ({
      on: function() { return this; },
      subscribe: () => ({ status: 'SUBSCRIBED' }),
    }),
    removeChannel: () => {},
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' }, error: null }),
        remove: async () => ({ data: null, error: null }),
      }),
    },
  } as any;
};

// Singleton client instances to avoid multiple GoTrueClient warnings
let realClientInstance: ReturnType<typeof createSupabaseClient> | null = null;
let mockClientInstance: ReturnType<typeof createMockClient> | null = null;

export function createClient() {
  // Re-check env vars at runtime (they're available in Next.js)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const forcePreview = process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true';
  const forceSeed = process.env.NEXT_PUBLIC_DEV_SEED_MODE === 'true';
  
  // Use real client if we have credentials and not forcing mock mode
  if (!forcePreview && !forceSeed && url && key) {
    // Reuse existing client instance if available
    if (!realClientInstance) {
      realClientInstance = createSupabaseClient(url, key);
    }
    return realClientInstance;
  }
  
  // Otherwise use mock client (also singleton)
  if (!mockClientInstance) {
    mockClientInstance = createMockClient();
  }
  return mockClientInstance;
}

// Export for client-side use - check at runtime
export function isPreviewModeEnabled() {
  return process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true' || 
         !process.env.NEXT_PUBLIC_SUPABASE_URL || 
         !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function isSeedModeEnabled() {
  return process.env.NEXT_PUBLIC_DEV_SEED_MODE === 'true' || 
         isPreviewModeEnabled();
}

