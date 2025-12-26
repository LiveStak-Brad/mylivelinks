import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase, supabaseConfigured } from '../lib/supabase';

type Profile = {
  id: string;
  username: string | null;
  date_of_birth: string | null;
  display_name?: string | null;
  bio?: string | null;
  [key: string]: any;
};

type UseProfileReturn = {
  profile: Profile | null;
  loading: boolean;
  isComplete: boolean;
  needsOnboarding: boolean;
};

function calculateAge(dobISODate: string): number {
  const birthDate = new Date(dobISODate);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

export function useProfile(userId?: string | null): UseProfileReturn {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // If supabase client is not initialized, skip loading profile
    if (!supabaseConfigured) {
      console.warn('[PROFILE] Supabase client not initialized - skipping profile load');
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) {
        setProfile(null);
        return;
      }
      setProfile((data as Profile) ?? null);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const age = useMemo(() => {
    if (!profile?.date_of_birth) return null;
    return calculateAge(profile.date_of_birth);
  }, [profile?.date_of_birth]);

  const isComplete = useMemo(() => {
    if (!profile?.username || !profile?.date_of_birth) return false;
    if (age === null) return false;
    return age >= 13;
  }, [age, profile?.date_of_birth, profile?.username]);

  const needsOnboarding = useMemo(() => {
    if (!userId) return false;
    if (!profile) return true;
    if (!profile.username || !profile.date_of_birth) return true;
    if (age === null) return true;
    return age < 13;
  }, [age, profile, userId]);

  return {
    profile,
    loading,
    isComplete,
    needsOnboarding,
  };
}
