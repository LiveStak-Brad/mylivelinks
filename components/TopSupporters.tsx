'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { GifterBadge as TierBadge } from '@/components/gifter';
import type { GifterStatus } from '@/lib/gifter-status';
import { fetchGifterStatuses } from '@/lib/gifter-status-client';
import LiveAvatar from '@/components/LiveAvatar';
import UserNameWithBadges from '@/components/shared/UserNameWithBadges';

interface Supporter {
  profile_id: string;
  username: string;
  avatar_url?: string;
  is_live?: boolean;
  total_gifted: number; // Total coins gifted to current user
  gift_count: number; // Number of gifts sent
}

export default function TopSupporters() {
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [gifterStatusMap, setGifterStatusMap] = useState<Record<string, GifterStatus>>({});
  const supabase = createClient();

  useEffect(() => {
    loadTopSupporters();

    // Debounce timer for realtime updates
    let reloadTimer: NodeJS.Timeout | null = null;

    const debouncedReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        loadTopSupporters();
      }, 1000); // Wait 1 second before reloading (debounce)
    };

    // Realtime subscription for gifts (updates when new gifts are sent)
    const giftsChannel = supabase
      .channel('top-supporters-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gifts',
        },
        async (payload: any) => {
          // Only reload if gift is for current user
          const { data: { user } } = await supabase.auth.getUser();
          if (user && payload.new.recipient_id === user.id) {
            debouncedReload();
          }
        }
      )
      .subscribe();

    // Also subscribe to profile updates (gifter_level changes)
    const profilesChannel = supabase
      .channel('top-supporters-profiles-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          // Reload if gifter_level changes (badge updates)
          debouncedReload();
        }
      )
      .subscribe();

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      supabase.removeChannel(giftsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  const loadTopSupporters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Query top supporters: people who have sent the most gifts to current user
      const { data, error } = await supabase
        .from('gifts')
        .select(`
          sender_id,
          coin_amount,
          sent_at,
          sender:profiles!gifts_sender_id_fkey (
            id,
            username,
            avatar_url,
            is_live
          )
        `)
        .eq('recipient_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(100); // Get recent gifts to aggregate

      if (error) {
        console.error('Error loading top supporters:', error);
        setLoading(false);
        return;
      }

      // Aggregate by sender
      const supporterMap = new Map<string, Supporter>();
      
      data?.forEach((gift: any) => {
        const senderId = gift.sender_id;
        const profile = gift.sender;
        
        if (!profile) return;

        if (supporterMap.has(senderId)) {
          const existing = supporterMap.get(senderId)!;
          existing.total_gifted += gift.coin_amount || 0;
          existing.gift_count += 1;
        } else {
          supporterMap.set(senderId, {
            profile_id: senderId,
            username: profile.username || 'Unknown',
            avatar_url: profile.avatar_url,
            is_live: Boolean(profile.is_live ?? false),
            total_gifted: gift.coin_amount || 0,
            gift_count: 1,
          });
        }
      });

      // Sort by total_gifted descending and take top 10
      const topSupporters = Array.from(supporterMap.values())
        .sort((a, b) => b.total_gifted - a.total_gifted)
        .slice(0, 10);

      setSupporters(topSupporters);

      const statusMap = await fetchGifterStatuses(topSupporters.map((s) => s.profile_id));
      setGifterStatusMap(statusMap);
    } catch (error) {
      console.error('Error loading top supporters:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Your Top Supporters</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-2 p-2 bg-gray-200 dark:bg-gray-700 rounded">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full" />
              <div className="flex-1 h-4 bg-gray-300 dark:bg-gray-600 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (supporters.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Your Top Supporters</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No supporters yet. Start streaming to receive gifts!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-2">Your Top Supporters</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {supporters.map((supporter, index) => (
          <div
            key={supporter.profile_id}
            className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            {/* Rank */}
            <div className="flex-shrink-0 w-6 text-center text-xs font-bold text-gray-500 dark:text-gray-400">
              {index + 1}
            </div>

            {/* Avatar */}
            <LiveAvatar
              avatarUrl={supporter.avatar_url}
              username={supporter.username}
              isLive={supporter.is_live}
              size="sm"
              showLiveBadge={false}
            />

            {/* Username & Badge */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <UserNameWithBadges
                  profileId={supporter.profile_id}
                  name={supporter.username}
                  gifterStatus={gifterStatusMap[supporter.profile_id]}
                  textSize="text-sm"
                  nameClassName="font-medium truncate"
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {supporter.total_gifted.toLocaleString()} coins • {supporter.gift_count} {supporter.gift_count === 1 ? 'gift' : 'gifts'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

