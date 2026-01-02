'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { GifterBadge as TierBadge } from '@/components/gifter';
import type { GifterStatus } from '@/lib/gifter-status';
import { fetchGifterStatuses } from '@/lib/gifter-status-client';
import LiveAvatar from '@/components/LiveAvatar';

interface LeaderboardEntry {
  profile_id: string;
  username: string;
  avatar_url?: string;
  is_live?: boolean;
  gifter_level: number;
  badge_name?: string;
  badge_color?: string;
  metric_value: number;
  rank: number;
}

type LeaderboardType = 'top_streamers' | 'top_gifters';
type Period = 'daily' | 'weekly' | 'monthly' | 'alltime';
type LeaderboardScope = 'room' | 'global';

interface LeaderboardProps {
  roomSlug?: string; // If provided, enables room-specific leaderboard (slug-based scope key)
  roomName?: string; // Display name for the room
}

export default function Leaderboard({ roomSlug, roomName }: LeaderboardProps = {}) {
  const [type, setType] = useState<LeaderboardType>('top_streamers');
  const [period, setPeriod] = useState<Period>('daily');
  const [scope, setScope] = useState<LeaderboardScope>(roomSlug ? 'room' : 'global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [gifterStatusMap, setGifterStatusMap] = useState<Record<string, GifterStatus>>({});

  const supabase = createClient();

  const leaderboardKey = useMemo(
    () => `${scope === 'room' && roomSlug ? `room_${roomSlug}_` : ''}top_${type}_${period}`,
    [type, period, scope, roomSlug]
  );

  useEffect(() => {
    loadLeaderboard();

    // Debounce timer for realtime updates (prevent too many reloads)
    let reloadTimer: NodeJS.Timeout | null = null;

    const debouncedReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        loadLeaderboard(false); // Don't show loading spinner on realtime updates
      }, 1000); // Wait 1 second before reloading (debounce)
    };

    const entryTypeFilter = type === 'top_streamers' ? 'entry_type=eq.diamond_earn' : 'entry_type=eq.coin_spend_gift';

    const ledgerChannel = supabase
      .channel('leaderboard-ledger-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ledger_entries',
          filter: entryTypeFilter,
        },
        () => {
          debouncedReload();
        }
      )
      .subscribe();

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      supabase.removeChannel(ledgerChannel);
    };
  }, [type, period, scope, roomSlug, leaderboardKey]);

  const loadLeaderboard = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // Try materialized view first (fastest) - if it exists
      // Otherwise try cache, then fallback to live compute
      
      // First try: Use direct profiles query (fastest, no joins needed)
      // This is faster than cache for small datasets
      const useDirectQuery = true; // Always use direct for now (fastest)
      
      if (useDirectQuery) {
        await computeLiveLeaderboard();
        return;
      }

      // Second try: Cache (if available)
      const { data: cacheData, error: cacheError } = await supabase
        .from('leaderboard_cache')
        .select(`
          profile_id,
          rank,
          metric_value,
          profiles!inner (
            id,
            username,
            avatar_url,
            gifter_level
          )
        `)
        .eq('leaderboard_type', leaderboardKey)
        .order('rank', { ascending: true })
        .limit(100);

      if (!cacheError && cacheData && cacheData.length > 0) {
        // Map entries with badge info from cache
        const entriesWithProfiles = cacheData.map((item: any) => {
          const profile: any = item.profiles;

          return {
            profile_id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            gifter_level: profile.gifter_level || 0,
            metric_value: item.metric_value,
            rank: item.rank,
          };
        }).filter((entry: any) => Number(entry.metric_value ?? 0) > 0);

        setEntries(entriesWithProfiles);

        const statusMap = await fetchGifterStatuses(entriesWithProfiles.map((e: any) => e.profile_id));
        setGifterStatusMap(statusMap);
      } else {
        // Fallback: compute live from source tables
        await computeLiveLeaderboard();
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      await computeLiveLeaderboard();
    } finally {
      setLoading(false);
    }
  };

  const computeLiveLeaderboard = async () => {
    try {
      // Note: p_room_id is NULL for global leaderboards
      const roomIdParam = scope === 'room' ? roomSlug : null;
      
      console.log('[Leaderboard] Loading:', { type, period, scope, roomId: roomIdParam });
      
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_type: type,
        p_period: period,
        p_limit: 100,
        p_room_id: roomIdParam,
      });

      if (error) {
        console.error('[Leaderboard] RPC error:', error);
        throw error;
      }

      console.log('[Leaderboard] Raw data:', data?.length ?? 0, 'entries');

      const rows = Array.isArray(data) ? data : [];
      const mapped = rows
        .map((row: any) => ({
          profile_id: row.profile_id,
          username: row.username,
          avatar_url: row.avatar_url,
          is_live: Boolean(row.is_live ?? false),
          gifter_level: row.gifter_level || 0,
          metric_value: Number(row.metric_value ?? 0),
          rank: Number(row.rank ?? 0),
        }))
        .filter((entry: any) => Number(entry.metric_value ?? 0) > 0);

      console.log('[Leaderboard] Mapped entries:', mapped.length);
      setEntries(mapped);

      if (mapped.length > 0) {
        const statusMap = await fetchGifterStatuses(mapped.map((e: any) => e.profile_id));
        setGifterStatusMap(statusMap);
      }
    } catch (error) {
      console.error('[Leaderboard] Error computing live leaderboard:', error);
      setEntries([]); // Clear entries on error
    }
  };

  const formatMetric = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 sm:p-4 lg:p-6">
      <h2 className="text-lg font-semibold mb-2">Leaderboards</h2>

      {/* Type Tabs */}
      <div className="grid grid-cols-2 gap-[2px] mb-1">
        <button
          onClick={() => setType('top_streamers')}
          className={`w-full min-w-0 h-5 px-0 inline-flex items-center justify-center rounded-md text-[11px] font-semibold leading-none transition ${
            type === 'top_streamers'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Streamers
        </button>
        <button
          onClick={() => setType('top_gifters')}
          className={`w-full min-w-0 h-5 px-0 inline-flex items-center justify-center rounded-md text-[11px] font-semibold leading-none transition ${
            type === 'top_gifters'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Gifters
        </button>
      </div>

      {/* Period Tabs */}
      <div className="grid grid-cols-4 gap-[2px] mb-2 sm:mb-3">
        {(['daily', 'weekly', 'monthly', 'alltime'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`w-full min-w-0 h-5 inline-flex items-center justify-center px-0 rounded-md text-[10px] font-semibold leading-none whitespace-nowrap transition ${
              period === p
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {p === 'alltime' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Scope Toggle (Room vs Global) - Only show if roomId is provided */}
      {roomSlug && (
        <div className="grid grid-cols-2 gap-[2px] mb-2 sm:mb-3">
          <button
            onClick={() => setScope('room')}
            className={`w-full min-w-0 h-6 inline-flex items-center justify-center gap-1 px-2 rounded-md text-[10px] font-semibold leading-none whitespace-nowrap transition ${
              scope === 'room'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span>🏠</span>
            <span>{roomName || 'Room'}</span>
          </button>
          <button
            onClick={() => setScope('global')}
            className={`w-full min-w-0 h-6 inline-flex items-center justify-center gap-1 px-2 rounded-md text-[10px] font-semibold leading-none whitespace-nowrap transition ${
              scope === 'global'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span>🌍</span>
            <span>Global</span>
          </button>
        </div>
      )}

      {/* Leaderboard List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No entries yet. Be the first!
        </div>
      ) : (
        <div className="space-y-1.5 sm:space-y-2">
          {entries.map((entry, index) => (
            <div
              key={entry.profile_id}
              className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all group"
              style={{
                animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
              }}
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-5 sm:w-6 text-center">
                <span
                  className={`text-xs sm:text-sm font-bold ${
                    entry.rank === 1
                      ? 'text-yellow-500'
                      : entry.rank === 2
                      ? 'text-gray-400'
                      : entry.rank === 3
                      ? 'text-orange-400'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}
                >
                  #{entry.rank}
                </span>
              </div>

              {/* Avatar with Badge Overlay */}
              <div className="flex-shrink-0 relative">
                <LiveAvatar
                  avatarUrl={entry.avatar_url}
                  username={entry.username}
                  isLive={entry.is_live}
                  size="sm"
                  showLiveBadge={false}
                  className="border border-gray-200 dark:border-gray-700 scale-[0.85] sm:scale-95 lg:scale-100 origin-left"
                />
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-[11px] sm:text-sm truncate">{entry.username}</span>
                  {(() => {
                    const status = gifterStatusMap[entry.profile_id];
                    if (!status || Number(status.lifetime_coins ?? 0) <= 0) return null;
                    return (
                      <div className="flex items-center scale-[0.85] sm:scale-95 lg:scale-100 origin-left">
                        <TierBadge
                          tier_key={status.tier_key}
                          level={status.level_in_tier}
                          size="sm"
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Metric Value */}
              <div className="flex-shrink-0 text-center">
                <div className="text-[11px] sm:text-sm font-bold text-gray-900 dark:text-white">
                  {formatMetric(entry.metric_value)}
                </div>
                <div className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {type === 'top_streamers' ? 'diamonds' : 'coins'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}


