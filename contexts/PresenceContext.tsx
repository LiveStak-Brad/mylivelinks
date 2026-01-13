'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase';

interface PresenceContextValue {
  onlineUsers: Set<string>;
  isOnline: (profileId: string) => boolean;
  refresh: () => Promise<void>;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);

export function usePresence() {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error('usePresence must be used within PresenceProvider');
  }
  return context;
}

interface PresenceProviderProps {
  children: ReactNode;
}

export function PresenceProvider({ children }: PresenceProviderProps) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const supabase = createClient();

  const refresh = useCallback(async () => {
    try {
      const cutoff = new Date(Date.now() - 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('room_presence')
        .select('profile_id')
        .eq('room_id', 'global')
        .gt('last_seen_at', cutoff);

      if (error) {
        console.error('[PresenceProvider] Error fetching online users:', error);
        return;
      }

      const onlineSet = new Set((data || []).map((row: { profile_id: string }) => row.profile_id));
      setOnlineUsers(onlineSet);
    } catch (err) {
      console.error('[PresenceProvider] Error refreshing presence:', err);
    }
  }, [supabase]);

  const isOnline = useCallback((profileId: string) => {
    return onlineUsers.has(profileId);
  }, [onlineUsers]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value: PresenceContextValue = {
    onlineUsers,
    isOnline,
    refresh,
  };

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}
