'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

// Notification types
export type NotieType = 'gift' | 'follow' | 'live' | 'mention' | 'comment' | 'level_up' | 'system' | 'purchase' | 'conversion';

export interface Notie {
  id: string;
  type: NotieType;
  title: string;
  message: string;
  avatarUrl?: string;
  avatarFallback?: string;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

interface NotiesContextType {
  noties: Notie[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refreshNoties: () => Promise<void>;
}

const NotiesContext = createContext<NotiesContextType | undefined>(undefined);

// Mock notifications for development
const MOCK_NOTIES: Notie[] = [
  {
    id: '1',
    type: 'gift',
    title: 'New Gift!',
    message: 'JohnDoe sent you a Rose 🌹',
    avatarUrl: undefined,
    avatarFallback: 'JD',
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
    actionUrl: '/JohnDoe',
    metadata: { giftName: 'Rose', giftAmount: 50 },
  },
  {
    id: '2',
    type: 'follow',
    title: 'New Follower',
    message: 'Sarah started following you',
    avatarFallback: 'S',
    isRead: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
    actionUrl: '/Sarah',
  },
  {
    id: '3',
    type: 'level_up',
    title: 'Level Up! 🔥',
    message: 'You reached VIP Level 12',
    avatarFallback: '🎯',
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    actionUrl: '/gifter-levels',
  },
  {
    id: '4',
    type: 'mention',
    title: 'Mentioned',
    message: 'Mike mentioned you in a comment',
    avatarFallback: 'M',
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    actionUrl: '/Mike',
  },
  {
    id: '5',
    type: 'purchase',
    title: 'Purchase Complete',
    message: 'Your coin purchase was successful 💰',
    avatarFallback: '✓',
    isRead: true,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
    actionUrl: '/wallet',
  },
  {
    id: '6',
    type: 'system',
    title: 'Welcome to MyLiveLinks!',
    message: 'Complete your profile to get started',
    avatarFallback: '👋',
    isRead: true,
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 3 days ago
    actionUrl: '/settings/profile',
  },
];

export function NotiesProvider({ children }: { children: ReactNode }) {
  const [noties, setNoties] = useState<Notie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const getReadStorageKey = useCallback((userId: string) => `noties_read_ids:${userId}`, []);

  const loadReadIds = useCallback((userId: string) => {
    try {
      if (typeof window === 'undefined') return new Set<string>();
      const raw = window.localStorage.getItem(getReadStorageKey(userId));
      if (!raw) return new Set<string>();
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return new Set<string>();
      return new Set<string>(arr.map(String));
    } catch {
      return new Set<string>();
    }
  }, [getReadStorageKey]);

  const saveReadIds = useCallback((userId: string, ids: Set<string>) => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(getReadStorageKey(userId), JSON.stringify(Array.from(ids)));
    } catch {
    }
  }, [getReadStorageKey]);

  const unreadCount = noties.filter(n => !n.isRead).length;

  const loadNoties = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setNoties([]);
        return;
      }

      const readIds = loadReadIds(user.id);

      const { data: followers } = await supabase
        .from('follows')
        .select('id, follower_id, followee_id, followed_at')
        .eq('followee_id', user.id)
        .order('followed_at', { ascending: false })
        .limit(50);

      const followerIds = (followers || []).map((f: any) => String(f.follower_id)).filter(Boolean);
      const { data: followerProfiles } = followerIds.length
        ? await supabase
            .from('profiles')
            .select('id, username, avatar_url, display_name')
            .in('id', followerIds)
        : { data: [] as any[] };
      const followerProfileById = new Map<string, any>();
      for (const p of Array.isArray(followerProfiles) ? followerProfiles : []) {
        if (p?.id) followerProfileById.set(String(p.id), p);
      }

      const followNoties: Notie[] = (followers || []).map((f: any) => {
        const id = `follow:${String(f.id)}`;
        const p = followerProfileById.get(String(f.follower_id));
        const username = String(p?.username ?? 'Someone');
        const displayName = String(p?.display_name ?? '') || username;
        const avatarFallback = (displayName?.[0] ?? username?.[0] ?? '?').toUpperCase();
        return {
          id,
          type: 'follow',
          title: 'New Follower',
          message: `${displayName} started following you`,
          avatarUrl: p?.avatar_url ?? undefined,
          avatarFallback,
          isRead: readIds.has(id),
          createdAt: f.followed_at ? new Date(f.followed_at) : new Date(),
          actionUrl: `/${username}`,
          metadata: { follower_id: String(f.follower_id) },
        };
      });

      const { data: following } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', user.id)
        .limit(500);
      const followeeIds = Array.from(new Set((following || []).map((r: any) => String(r.followee_id)).filter(Boolean)));

      const { data: liveStreams } = followeeIds.length
        ? await supabase
            .from('live_streams')
            .select('id, profile_id, live_available, started_at')
            .in('profile_id', followeeIds)
            .eq('live_available', true)
            .order('started_at', { ascending: false, nullsFirst: false })
            .limit(50)
        : { data: [] as any[] };

      const liveUserIds = (liveStreams || []).map((ls: any) => String(ls.profile_id)).filter(Boolean);
      const { data: liveProfiles } = liveUserIds.length
        ? await supabase
            .from('profiles')
            .select('id, username, avatar_url, display_name')
            .in('id', liveUserIds)
        : { data: [] as any[] };
      const liveProfileById = new Map<string, any>();
      for (const p of Array.isArray(liveProfiles) ? liveProfiles : []) {
        if (p?.id) liveProfileById.set(String(p.id), p);
      }

      const liveNoties: Notie[] = (liveStreams || []).map((ls: any) => {
        const startedAt = ls.started_at ? String(ls.started_at) : '';
        const id = `live:${String(ls.id)}:${startedAt}`;
        const p = liveProfileById.get(String(ls.profile_id));
        const username = String(p?.username ?? 'Someone');
        const displayName = String(p?.display_name ?? '') || username;
        const avatarFallback = (displayName?.[0] ?? username?.[0] ?? '?').toUpperCase();
        return {
          id,
          type: 'live',
          title: 'Live Now',
          message: `${displayName} is live now`,
          avatarUrl: p?.avatar_url ?? undefined,
          avatarFallback,
          isRead: readIds.has(id),
          createdAt: ls.started_at ? new Date(ls.started_at) : new Date(),
          actionUrl: '/live',
          metadata: { profile_id: String(ls.profile_id), live_stream_id: String(ls.id) },
        };
      });

      let purchaseNoties: Notie[] = [];
      try {
        const { data: ledgerRows, error: ledgerErr } = await supabase
          .from('ledger_entries')
          .select('id, entry_type, delta_coins, amount_usd_cents, created_at')
          .eq('user_id', user.id)
          .eq('entry_type', 'coin_purchase')
          .order('created_at', { ascending: false })
          .limit(20);

        if (!ledgerErr && Array.isArray(ledgerRows)) {
          purchaseNoties = ledgerRows.map((r: any) => {
            const coins = Number(r.delta_coins ?? 0);
            const cents = Number(r.amount_usd_cents ?? 0);
            const id = `purchase:le:${String(r.id)}`;
            return {
              id,
              type: 'purchase',
              title: 'Purchase Complete',
              message: cents > 0 ? `Purchase complete: +${coins} coins` : `Purchase complete: +${coins} coins`,
              avatarFallback: '✓',
              isRead: readIds.has(id),
              createdAt: r.created_at ? new Date(r.created_at) : new Date(),
              actionUrl: '/wallet',
              metadata: { coins, usd_cents: cents },
            };
          });
        }
      } catch {
      }

      let conversionNoties: Notie[] = [];
      try {
        const { data: conversions, error: cvErr } = await supabase
          .from('diamond_conversions')
          .select('id, diamonds_in, coins_out, status, completed_at, created_at')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!cvErr && Array.isArray(conversions)) {
          conversionNoties = conversions
            .filter((r: any) => !r.status || String(r.status) === 'completed')
            .map((r: any) => {
              const diamondsIn = Number(r.diamonds_in ?? 0);
              const coinsOut = Number(r.coins_out ?? 0);
              const at = r.completed_at || r.created_at;
              const id = `conversion:${String(r.id)}`;
              return {
                id,
                type: 'conversion',
                title: 'Conversion Complete',
                message: `Converted ${diamondsIn} diamonds to ${coinsOut} coins`,
                avatarFallback: '✓',
                isRead: readIds.has(id),
                createdAt: at ? new Date(at) : new Date(),
                actionUrl: '/wallet',
                metadata: { diamonds_in: diamondsIn, coins_out: coinsOut },
              };
            });
        }
      } catch {
      }

      const combined = [...followNoties, ...liveNoties, ...purchaseNoties, ...conversionNoties]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 100);

      setNoties(combined);
      
    } catch (error) {
      console.error('[Noties] Error loading notifications:', error);
      if (process.env.NODE_ENV !== 'production') {
        setNoties(MOCK_NOTIES);
      } else {
        setNoties([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadReadIds, supabase]);

  const markAsRead = useCallback((id: string) => {
    setNoties(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ids = loadReadIds(user.id);
      ids.add(id);
      saveReadIds(user.id, ids);
    })();
  }, [loadReadIds, saveReadIds, supabase]);

  const markAllAsRead = useCallback(() => {
    setNoties(prev => prev.map(n => ({ ...n, isRead: true })));
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ids = loadReadIds(user.id);
      for (const n of noties) ids.add(n.id);
      saveReadIds(user.id, ids);
    })();
  }, [loadReadIds, noties, saveReadIds, supabase]);

  const refreshNoties = useCallback(async () => {
    await loadNoties();
  }, [loadNoties]);

  // Load on mount
  useEffect(() => {
    loadNoties();
  }, [loadNoties]);

  // Subscribe to auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadNoties();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, loadNoties]);

  useEffect(() => {
    let isMounted = true;
    let followeeIds: string[] = [];
    let userId: string | null = null;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;
      userId = user.id;
      const { data } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', user.id)
        .limit(500);
      followeeIds = Array.from(new Set((data || []).map((r: any) => String(r.followee_id)).filter(Boolean)));
    };

    void init();

    const followsChannel = supabase
      .channel('noties-follows-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows' },
        () => {
          void loadNoties();
        }
      )
      .subscribe();

    const txChannel = supabase
      .channel('noties-tx-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ledger_entries', filter: userId ? `user_id=eq.${userId}` : undefined },
        () => {
          void loadNoties();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'diamond_conversions', filter: userId ? `profile_id=eq.${userId}` : undefined },
        () => {
          void loadNoties();
        }
      )
      .subscribe();

    const liveChannel = supabase
      .channel('noties-live-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_streams' },
        (payload: any) => {
          const row = payload?.new || payload?.old;
          const profileId = String(row?.profile_id ?? '');
          if (!profileId) return;
          if (followeeIds.length && !followeeIds.includes(profileId)) return;
          void loadNoties();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(followsChannel);
      supabase.removeChannel(liveChannel);
      supabase.removeChannel(txChannel);
    };
  }, [loadNoties, supabase]);

  return (
    <NotiesContext.Provider value={{
      noties,
      unreadCount,
      isLoading,
      markAsRead,
      markAllAsRead,
      refreshNoties,
    }}>
      {children}
    </NotiesContext.Provider>
  );
}

export function useNoties() {
  const context = useContext(NotiesContext);
  if (!context) {
    throw new Error('useNoties must be used within a NotiesProvider');
  }
  return context;
}

