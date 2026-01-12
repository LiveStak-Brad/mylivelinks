import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../state/AuthContext';

export type CurrentUserProfile = Record<string, any> & {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

type CurrentUserValue = {
  userId: string | null;
  profile: CurrentUserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const CurrentUserContext = createContext<CurrentUserValue | null>(null);

async function fetchProfileById(userId: string): Promise<CurrentUserProfile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

  if (error) {
    // If a profile row doesn't exist yet, treat it as null (no crash, no throw).
    console.error('[currentUser] profiles select error:', error.message);
    return null;
  }

  return (data as any) ?? null;
}

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const userId = user?.id ?? null;
  const latestUserIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const next = await fetchProfileById(userId);

    // Avoid late updates if userId changed while request was in-flight.
    if (latestUserIdRef.current !== userId) return;

    setProfile(next);
    setProfileLoading(false);
  }, [userId]);

  useEffect(() => {
    latestUserIdRef.current = userId;

    if (authLoading) return;

    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    // Load once per auth user, then let refresh() handle explicit reloads.
    void refresh();
  }, [authLoading, refresh, userId]);

  const value = useMemo<CurrentUserValue>(
    () => ({
      userId,
      profile,
      loading: authLoading || profileLoading,
      refresh,
    }),
    [authLoading, profile, profileLoading, refresh, userId]
  );

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error('useCurrentUser must be used within CurrentUserProvider');
  return ctx;
}

