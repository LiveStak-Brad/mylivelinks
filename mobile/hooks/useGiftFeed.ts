import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export type TopGifter = {
  profile_id: string;
  username: string;
  avatar_url?: string | null;
  total_coins: number;
};

export type GiftTickerEntry = {
  id: string;
  senderId: string;
  senderUsername: string;
  avatarUrl?: string | null;
  coinValue: number;
  giftName?: string | null;
  createdAt: string;
};

const FALLBACK_GIFTERS: TopGifter[] = [
  { profile_id: 'mock1', username: 'TopSupporter', avatar_url: null, total_coins: 5000 },
  { profile_id: 'mock2', username: 'MegaFan', avatar_url: null, total_coins: 3500 },
  { profile_id: 'mock3', username: 'GiftKing', avatar_url: null, total_coins: 2000 },
];

const MAX_TICKER_ITEMS = 6;

export function useGiftFeed(profileId?: string | null) {
  const [topGifters, setTopGifters] = useState<TopGifter[]>(FALLBACK_GIFTERS);
  const [recentGifts, setRecentGifts] = useState<GiftTickerEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const hasProfile = useMemo(() => typeof profileId === 'string' && profileId.length > 0, [profileId]);

  const loadTopGifters = useCallback(async () => {
    if (!hasProfile || !profileId) {
      setTopGifters(FALLBACK_GIFTERS);
      setRecentGifts([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gifts')
        .select(`
          id,
          sender_id,
          coin_value,
          gift_name,
          created_at,
          profiles!gifts_sender_id_fkey (
            username,
            avatar_url
          )
        `)
        .eq('recipient_id', profileId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const rows = (data || []) as Array<{
        id: string;
        sender_id: string;
        coin_value: number;
        gift_name?: string | null;
        created_at: string;
        profiles?: { username?: string | null; avatar_url?: string | null } | null;
      }>;

      const totals = rows.reduce<Record<string, TopGifter>>((acc, gift) => {
        const senderId = gift.sender_id;
        if (!senderId) return acc;
        if (!acc[senderId]) {
          acc[senderId] = {
            profile_id: senderId,
            username: gift.profiles?.username || 'Supporter',
            avatar_url: gift.profiles?.avatar_url ?? null,
            total_coins: 0,
          };
        }
        acc[senderId].total_coins += gift.coin_value || 0;
        return acc;
      }, {});

      const sorted = Object.values(totals)
        .sort((a, b) => b.total_coins - a.total_coins)
        .slice(0, 3);

      setTopGifters(sorted.length > 0 ? sorted : FALLBACK_GIFTERS);
      setRecentGifts(
        rows.slice(0, MAX_TICKER_ITEMS).map((gift) => ({
          id: gift.id,
          senderId: gift.sender_id,
          senderUsername: gift.profiles?.username || 'Supporter',
          avatarUrl: gift.profiles?.avatar_url ?? null,
          coinValue: gift.coin_value || 0,
          giftName: gift.gift_name ?? null,
          createdAt: gift.created_at,
        }))
      );
    } catch (error) {
      console.warn('[useGiftFeed] Failed to load gifters', error);
      setTopGifters(FALLBACK_GIFTERS);
    } finally {
      setLoading(false);
    }
  }, [hasProfile, profileId]);

  useEffect(() => {
    void loadTopGifters();
  }, [loadTopGifters]);

  useEffect(() => {
    if (!hasProfile || !profileId) return;

    const channel = supabase
      .channel(`gifts-recipient-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gifts',
          filter: `recipient_id=eq.${profileId}`,
        },
        async (payload: any) => {
          const gift = payload?.new;
          if (!gift) return;

          let senderUsername = 'Supporter';
          let avatarUrl: string | null = null;
          try {
            const { data } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', gift.sender_id)
              .maybeSingle();
            if (data) {
              senderUsername = data.username || senderUsername;
              avatarUrl = data.avatar_url ?? null;
            }
          } catch {
            // ignore profile lookup errors
          }

          setTopGifters((prev) => {
            const map = new Map(prev.map((gifter) => [gifter.profile_id, { ...gifter }]));
            if (!map.has(gift.sender_id)) {
              map.set(gift.sender_id, {
                profile_id: gift.sender_id,
                username: senderUsername,
                avatar_url: avatarUrl,
                total_coins: 0,
              });
            }
            const updated = map.get(gift.sender_id)!;
            updated.total_coins += gift.coin_value || 0;
            updated.avatar_url = avatarUrl ?? updated.avatar_url;
            updated.username = senderUsername || updated.username;
            return Array.from(map.values())
              .sort((a, b) => b.total_coins - a.total_coins)
              .slice(0, 3);
          });

          setRecentGifts((prev) => {
            const entry: GiftTickerEntry = {
              id: gift.id,
              senderId: gift.sender_id,
              senderUsername,
              avatarUrl,
              coinValue: gift.coin_value || 0,
              giftName: gift.gift_name ?? null,
              createdAt: gift.created_at || new Date().toISOString(),
            };
            const deduped = [entry, ...prev.filter((item) => item.id !== entry.id)];
            return deduped.slice(0, MAX_TICKER_ITEMS);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hasProfile, profileId]);

  return {
    topGifters,
    recentGifts,
    loading,
    refresh: loadTopGifters,
  };
}
