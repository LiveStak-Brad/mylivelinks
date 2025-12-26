import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Session,
  User,
  SignInWithPasswordCredentials,
  SignUpWithPasswordCredentials,
} from '@supabase/supabase-js';

import { supabase, supabaseConfigured } from '../lib/supabase';

type UseAuthReturn = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // If supabase client is not initialized, return offline mode
    if (!supabaseConfigured) {
      console.warn('[AUTH] Supabase client not initialized - running in offline mode');
      setLoading(false);
      return;
    }

    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted) {
          setSession(data.session ?? null);
        }
      } catch (e) {
        console.warn('[AUTH] getSession failed', e);
        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabaseConfigured) {
      throw new Error('Supabase client not initialized. Please configure environment variables.');
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    } satisfies SignInWithPasswordCredentials);

    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, username?: string) => {
    if (!supabaseConfigured) {
      throw new Error('Supabase client not initialized. Please configure environment variables.');
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: username ? { data: { username } } : undefined,
    } satisfies SignUpWithPasswordCredentials);

    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabaseConfigured) {
      throw new Error('Supabase client not initialized. Please configure environment variables.');
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const user = useMemo(() => session?.user ?? null, [session]);

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };
}
