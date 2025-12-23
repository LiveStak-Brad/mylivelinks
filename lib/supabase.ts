import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Singleton client instance to avoid multiple GoTrueClient warnings
let clientInstance: any = null;

export function createClient(): any {
  // Re-check env vars at runtime (they're available in Next.js)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
  }
  
  // Reuse existing client instance if available
  if (!clientInstance) {
    clientInstance = createSupabaseClient(url, key);
  }
  
  return clientInstance;
}
