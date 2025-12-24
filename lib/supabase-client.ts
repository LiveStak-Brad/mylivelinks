import { createBrowserClient } from '@supabase/ssr';

/**
 * Create a Supabase client for client-side usage (React components, hooks)
 * This properly handles cookies in the browser
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createBrowserClient(url, key);
}

