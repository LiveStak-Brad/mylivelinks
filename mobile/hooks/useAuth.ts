import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Session,
  User,
  SignInWithPasswordCredentials,
  SignUpWithPasswordCredentials,
} from '@supabase/supabase-js';

import { supabase, supabaseConfigured } from '../lib/supabase';
import { getDeviceId } from '../lib/deviceId';
import { clearPendingReferralCode, getPendingReferralCode } from '../lib/referrals';

type UseAuthReturn = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const claimInFlightRef = useRef(false);
  const lastClaimedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // If supabase client is not initialized, return offline mode
    if (!supabaseConfigured) {
      console.warn('[AUTH] Supabase client not initialized - running in offline mode');
      setLoading(false);
      return;
    }

    const maybeClaimReferral = async (nextSession: Session | null) => {
      if (!supabaseConfigured) return;
      const userId = nextSession?.user?.id;
      if (!userId) return;

      const pendingCode = await getPendingReferralCode();
      if (!pendingCode) return;

      if (claimInFlightRef.current) return;
      claimInFlightRef.current = true;

      try {
        const deviceId = await getDeviceId();
        const { error } = await supabase.rpc('claim_referral', {
          p_code: pendingCode,
          p_click_id: null,
          p_device_id: deviceId,
        });

        if (!error) {
          await clearPendingReferralCode();
          lastClaimedUserIdRef.current = userId;
        } else {
          console.warn('[referrals] claim_referral failed (non-blocking):', error);
        }
      } catch (e) {
        console.warn('[referrals] claim_referral threw (non-blocking):', e);
      } finally {
        claimInFlightRef.current = false;
      }
    };

    const bootstrap = async () => {
      try {
        console.log('[AUTH] Bootstrap: fetching initial session...');
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted) {
          console.log('[AUTH] Bootstrap: session loaded', {
            hasSession: !!data.session,
            userId: data.session?.user?.id,
          });
          setSession(data.session ?? null);
        }

        await maybeClaimReferral(data.session ?? null);
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

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      console.log('[AUTH] onAuthStateChange fired:', {
        event,
        hasSession: !!newSession,
        userId: newSession?.user?.id,
      });
      setSession(newSession);
      setLoading(false);

      // Best-effort referral claim (non-blocking). Idempotent on the DB side.
      // Only attempt on transitions where we have a session.
      if (newSession?.user?.id && lastClaimedUserIdRef.current !== newSession.user.id) {
        void maybeClaimReferral(newSession);
      }
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
    console.log('[AUTH] signIn called for:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    } satisfies SignInWithPasswordCredentials);

    if (error) {
      console.error('[AUTH] signIn failed:', error);
      throw error;
    }
    console.log('[AUTH] signIn successful, waiting for onAuthStateChange...');
  }, []);

  const signUp = useCallback(async (email: string, password: string, username?: string) => {
    if (!supabaseConfigured) {
      throw new Error('Supabase client not initialized. Please configure environment variables.');
    }
    console.log('[AUTH] signUp called for:', email);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: username ? { data: { username } } : undefined,
    } satisfies SignUpWithPasswordCredentials);

    if (error) {
      console.error('[AUTH] signUp failed:', error);
      throw error;
    }
    console.log('[AUTH] signUp successful, waiting for onAuthStateChange...');
  }, []);

  const signOut = useCallback(async () => {
    if (!supabaseConfigured) {
      throw new Error('Supabase client not initialized. Please configure environment variables.');
    }
    console.log('[AUTH] signOut called');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[AUTH] signOut failed:', error);
      throw error;
    }
    console.log('[AUTH] signOut successful');
  }, []);

  // CRITICAL: Get access token from the session in React state
  // This is the SINGLE SOURCE OF TRUTH for auth
  // DO NOT call supabase.auth.getSession() directly - it bypasses React state
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!supabaseConfigured) {
      console.warn('[AUTH] Supabase not configured');
      return null;
    }

    // Use session from React state (from onAuthStateChange)
    if (session?.access_token) {
      return session.access_token;
    }

    // If token is missing at time of request, attempt a single refresh to recover.
    // This is intentionally minimal and does not log any secrets.
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn('[AUTH] refreshSession failed');
        return null;
      }
      if (data?.session) {
        setSession(data.session);
      }
      return data?.session?.access_token ?? null;
    } catch {
      console.warn('[AUTH] refreshSession threw');
      return null;
    }

    // No fallback outside React state; caller must handle missing token
    return null;
  }, [session, supabaseConfigured]);

  const user = useMemo(() => session?.user ?? null, [session]);

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    getAccessToken,
  };
}
