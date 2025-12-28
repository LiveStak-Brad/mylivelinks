import { useState, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';

import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { emitTopBarRefresh } from './topbar/useTopBarState';

/**
 * useNoties Hook - Mobile parity with web
 * 
 * Simplified version of web components/noties/NotiesContext.tsx
 * for mobile consumption. Provides same data structure and methods.
 */

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

export function useNoties() {
  const [noties, setNoties] = useState<Notie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthContext();
  const currentUserId = user?.id ?? null;

  const followeeIdsRef = useRef<string[]>([]);

  const unreadCount = noties.filter(n => !n.isRead).length;

  const getReadStorageKey = useCallback((userId: string) => `noties_read_ids:${userId}`, []);

  const loadReadIds = useCallback(
    async (userId: string) => {
      try {
        const raw = await SecureStore.getItemAsync(getReadStorageKey(userId));
        if (!raw) return new Set<string>();
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return new Set<string>();
        return new Set<string>(arr.map(String));
      } catch {
        return new Set<string>();
      }
    },
    [getReadStorageKey]
  );

  const saveReadIds = useCallback(
    async (userId: string, ids: Set<string>) => {
      try {
        await SecureStore.setItemAsync(getReadStorageKey(userId), JSON.stringify(Array.from(ids)));
      } catch {
      }
    },
    [getReadStorageKey]
  );

  const loadNoties = useCallback(async () => {
    const client = supabase;
    if (!client) {
      setNoties([]);
      setIsLoading(false);
      return;
    }

    if (!currentUserId) {
      setNoties([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const readIds = await loadReadIds(currentUserId);

      const { data: followers } = await client
        .from('follows')
        .select('id, follower_id, followee_id, followed_at')
        .eq('followee_id', currentUserId)
        .order('followed_at', { ascending: false })
        .limit(50);

      const followerIds = (followers || []).map((f: any) => String(f.follower_id)).filter(Boolean);
      const { data: followerProfiles } = followerIds.length
        ? await client
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

      const { data: following } = await client
        .from('follows')
        .select('followee_id')
        .eq('follower_id', currentUserId)
        .limit(500);
      const followeeIds = Array.from(new Set((following || []).map((r: any) => String(r.followee_id)).filter(Boolean)));
      followeeIdsRef.current = followeeIds;

      const { data: liveStreams } = followeeIds.length
        ? await client
            .from('live_streams')
            .select('id, profile_id, live_available, started_at')
            .in('profile_id', followeeIds)
            .eq('live_available', true)
            .order('started_at', { ascending: false, nullsFirst: false })
            .limit(50)
        : { data: [] as any[] };

      const liveUserIds = (liveStreams || []).map((ls: any) => String(ls.profile_id)).filter(Boolean);
      const { data: liveProfiles } = liveUserIds.length
        ? await client
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
        const { data: ledgerRows, error: ledgerErr } = await client
          .from('ledger_entries')
          .select('id, entry_type, delta_coins, amount_usd_cents, created_at')
          .eq('user_id', currentUserId)
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

      let giftNoties: Notie[] = [];
      try {
        const { data: giftLedger, error: giftLedgerErr } = await client
          .from('ledger_entries')
          .select('id, entry_type, delta_diamonds, provider_ref, created_at')
          .eq('user_id', currentUserId)
          .eq('entry_type', 'diamond_earn')
          .order('created_at', { ascending: false })
          .limit(50);

        const parseGiftId = (providerRef: unknown): number | null => {
          if (!providerRef) return null;
          const s = String(providerRef);
          if (!s.startsWith('gift:')) return null;
          const raw = s.split(':')[1];
          const n = raw ? parseInt(raw, 10) : NaN;
          return Number.isFinite(n) ? n : null;
        };

        if (!giftLedgerErr && Array.isArray(giftLedger)) {
          const giftIds = Array.from(
            new Set(giftLedger.map((r: any) => parseGiftId(r.provider_ref)).filter((n: any) => Number.isFinite(n)))
          ) as number[];

          const { data: gifts } = giftIds.length
            ? await client
                .from('gifts')
                .select('id, sender_id, recipient_id, coin_amount, diamonds_awarded')
                .in('id', giftIds)
            : { data: [] as any[] };

          const giftById = new Map<number, any>();
          for (const g of Array.isArray(gifts) ? gifts : []) {
            const idNum = Number(g?.id);
            if (Number.isFinite(idNum)) giftById.set(idNum, g);
          }

          const senderIds = Array.from(
            new Set(
              (Array.isArray(gifts) ? gifts : [])
                .map((g: any) => String(g?.sender_id ?? ''))
                .filter(Boolean)
            )
          );

          const { data: senderProfiles } = senderIds.length
            ? await client
                .from('profiles')
                .select('id, username, avatar_url, display_name')
                .in('id', senderIds)
            : { data: [] as any[] };

          const senderById = new Map<string, any>();
          for (const p of Array.isArray(senderProfiles) ? senderProfiles : []) {
            if (p?.id) senderById.set(String(p.id), p);
          }

          giftNoties = giftLedger.map((r: any) => {
            const id = `gift:le:${String(r.id)}`;
            const giftId = parseGiftId(r.provider_ref);
            const gift = giftId != null ? giftById.get(giftId) : null;
            const senderId = gift?.sender_id ? String(gift.sender_id) : '';
            const sender = senderId ? senderById.get(senderId) : null;
            const username = String(sender?.username ?? 'Someone');
            const displayName = String(sender?.display_name ?? '') || username;
            const avatarFallback = (displayName?.[0] ?? username?.[0] ?? '?').toUpperCase();
            const diamonds = Number(r.delta_diamonds ?? gift?.diamonds_awarded ?? 0);
            const coins = Number(gift?.coin_amount ?? 0);
            return {
              id,
              type: 'gift',
              title: 'New Gift',
              message: `${displayName} sent you +${diamonds} diamonds`,
              avatarUrl: sender?.avatar_url ?? undefined,
              avatarFallback,
              isRead: readIds.has(id),
              createdAt: r.created_at ? new Date(r.created_at) : new Date(),
              actionUrl: `/${username}`,
              metadata: {
                gift_id: giftId ?? undefined,
                sender_id: senderId || undefined,
                coins_spent: coins,
                diamonds_awarded: diamonds,
              },
            };
          });
        }
      } catch {
      }

      let conversionNoties: Notie[] = [];
      try {
        const { data: conversions, error: cvErr } = await client
          .from('diamond_conversions')
          .select('id, diamonds_in, coins_out, status, completed_at, created_at')
          .eq('profile_id', currentUserId)
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

      const combined = [...followNoties, ...liveNoties, ...giftNoties, ...purchaseNoties, ...conversionNoties]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 100);

      setNoties(combined);
    } catch {
      setNoties([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, loadReadIds]);

  const markAsRead = useCallback((id: string) => {
    setNoties(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));

    if (!currentUserId) return;
    void (async () => {
      const ids = await loadReadIds(currentUserId);
      ids.add(id);
      await saveReadIds(currentUserId, ids);
      emitTopBarRefresh();
    })();
  }, [currentUserId, loadReadIds, saveReadIds]);

  const markAllAsRead = useCallback(() => {
    setNoties(prev => prev.map(n => ({ ...n, isRead: true })));
    
    if (!currentUserId) return;
    void (async () => {
      const ids = await loadReadIds(currentUserId);
      for (const n of noties) ids.add(n.id);
      await saveReadIds(currentUserId, ids);
      emitTopBarRefresh();
    })();
  }, [currentUserId, noties, loadReadIds, saveReadIds]);

  const refreshNoties = useCallback(async () => {
    await loadNoties();
  }, [loadNoties]);

  // Load on mount and user change
  useEffect(() => {
    if (currentUserId) {
      loadNoties();
      return;
    }
    setNoties([]);
    setIsLoading(false);
  }, [currentUserId, loadNoties]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    if (!currentUserId) return;

    let mounted = true;

    const init = async () => {
      const { data } = await client
        .from('follows')
        .select('followee_id')
        .eq('follower_id', currentUserId)
        .limit(500);
      if (!mounted) return;
      followeeIdsRef.current = Array.from(new Set((data || []).map((r: any) => String(r.followee_id)).filter(Boolean)));
    };

    void init();

    const followsChannel = client
      .channel('mobile-noties-follows-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, () => {
        void loadNoties();
      })
      .subscribe();

    const txChannel = client
      .channel('mobile-noties-tx-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_entries', filter: `user_id=eq.${currentUserId}` }, () => {
        void loadNoties();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diamond_conversions', filter: `profile_id=eq.${currentUserId}` }, () => {
        void loadNoties();
      })
      .subscribe();

    const liveChannel = client
      .channel('mobile-noties-live-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, (payload: any) => {
        const row = payload?.new || payload?.old;
        const profileId = String(row?.profile_id ?? '');
        if (!profileId) return;
        const followeeIds = followeeIdsRef.current;
        if (followeeIds.length && !followeeIds.includes(profileId)) return;
        void loadNoties();
      })
      .subscribe();

    return () => {
      mounted = false;
      client.removeChannel(followsChannel);
      client.removeChannel(txChannel);
      client.removeChannel(liveChannel);
    };
  }, [currentUserId, loadNoties]);

  return {
    noties,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refreshNoties,
  };
}




