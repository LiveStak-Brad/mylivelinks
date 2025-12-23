'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import GifterBadge from './GifterBadge';

interface LeaderboardEntry {
  profile_id: string;
  username: string;
  avatar_url?: string;
  gifter_level: number;
  badge_name?: string;
  badge_color?: string;
  metric_value: number;
  rank: number;
}

type LeaderboardType = 'top_streamers' | 'top_gifters';
type Period = 'daily' | 'weekly' | 'alltime';

export default function Leaderboard() {
  const [type, setType] = useState<LeaderboardType>('top_streamers');
  const [period, setPeriod] = useState<Period>('daily');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [badgeInfo, setBadgeInfo] = useState<Record<number, any>>({});

  const supabase = createClient();

  const leaderboardKey = useMemo(
    () => `top_${type}_${period}`,
    [type, period]
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

    // Subscribe to realtime updates for profiles (total_gifts_received, total_spent changes)
    const profilesChannel = supabase
      .channel('leaderboard-profiles-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload: any) => {
          // Only reload if the relevant field changed
          if (
            (type === 'top_streamers' && payload.new.total_gifts_received !== payload.old?.total_gifts_received) ||
            (type === 'top_gifters' && payload.new.total_spent !== payload.old?.total_spent)
          ) {
            debouncedReload();
          }
        }
      )
      .subscribe();

    // Subscribe to leaderboard_cache updates (if cache is refreshed)
    const cacheChannel = supabase
      .channel('leaderboard-cache-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard_cache',
          filter: `leaderboard_type=eq.${leaderboardKey}`,
        },
        () => {
          debouncedReload();
        }
      )
      .subscribe();

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(cacheChannel);
    };
  }, [type, period, leaderboardKey]);

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
        // Batch load all unique gifter levels at once (much faster than N queries)
        const uniqueLevels = [...new Set(
          cacheData
            .map((item: any) => item.profiles?.gifter_level)
            .filter((l: any) => l !== null && l > 0)
        )];
        const badgeMap: Record<number, any> = {};
        
        if (uniqueLevels.length > 0) {
          const { data: badges } = await supabase
            .from('gifter_levels')
            .select('*')
            .in('level', uniqueLevels);
          
          if (badges) {
            badges.forEach((badge: any) => {
              badgeMap[badge.level] = badge;
            });
          }
        }

        // Map entries with badge info from cache
        const entriesWithProfiles = cacheData.map((item: any) => {
          const profile: any = item.profiles;
          const badgeInfo = profile.gifter_level ? badgeMap[profile.gifter_level] : null;

          return {
            profile_id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            gifter_level: profile.gifter_level || 0,
            badge_name: badgeInfo?.badge_name,
            badge_color: badgeInfo?.badge_color,
            metric_value: item.metric_value,
            rank: item.rank,
          };
        });

        setEntries(entriesWithProfiles);
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
      // Optimized: Single query with only needed fields, using indexes
      let data: any[] = [];
      let error: any = null;

      if (type === 'top_streamers') {
        // Top streamers: by diamonds earned (total_gifts_received)
        // Use index: idx_profiles_total_gifts_received
        const result = await supabase
          .from('profiles')
          .select('id, username, avatar_url, gifter_level, total_gifts_received')
          .not('total_gifts_received', 'is', null)
          .order('total_gifts_received', { ascending: false })
          .limit(100);
        data = result.data || [];
        error = result.error;
      } else {
        // Top gifters: by coins spent (total_spent)
        // Use index: idx_profiles_total_spent
        const result = await supabase
          .from('profiles')
          .select('id, username, avatar_url, gifter_level, total_spent')
          .not('total_spent', 'is', null)
          .order('total_spent', { ascending: false })
          .limit(100);
        data = result.data || [];
        error = result.error;
      }

      if (error) throw error;

      // Batch load all unique gifter levels at once (much faster than N queries)
      const uniqueLevels = [...new Set(
        data.map((profile: any) => profile.gifter_level).filter((l: any) => l !== null && l > 0)
      )];
      const badgeMap: Record<number, any> = {};
      
      if (uniqueLevels.length > 0) {
        const { data: badges } = await supabase
          .from('gifter_levels')
          .select('*')
          .in('level', uniqueLevels);
        
        if (badges) {
          badges.forEach((badge: any) => {
            badgeMap[badge.level] = badge;
          });
        }
      }

      // Map entries with badge info from cache
      const entriesWithBadges = data.map((profile: any, index: number) => {
        const badgeInfo = profile.gifter_level ? badgeMap[profile.gifter_level] : null;

        return {
          profile_id: profile.id,
          username: profile.username,
          avatar_url: profile.avatar_url,
          gifter_level: profile.gifter_level || 0,
          badge_name: badgeInfo?.badge_name,
          badge_color: badgeInfo?.badge_color,
          metric_value: type === 'top_streamers' ? profile.total_gifts_received : profile.total_spent,
          rank: index + 1,
        };
      });

      setEntries(entriesWithBadges);
    } catch (error) {
      console.error('Error computing live leaderboard:', error);
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold mb-6">Leaderboards</h2>

      {/* Type Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setType('top_streamers')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            type === 'top_streamers'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Top Streamers
        </button>
        <button
          onClick={() => setType('top_gifters')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            type === 'top_gifters'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Top Gifters
        </button>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-2 mb-6">
        {(['daily', 'weekly', 'alltime'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              period === p
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

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
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div
              key={entry.profile_id}
              className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all group"
              style={{
                animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
              }}
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-6 text-center">
                <span
                  className={`text-sm font-bold ${
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
                {entry.avatar_url ? (
                  <img
                    src={entry.avatar_url}
                    alt={entry.username}
                    className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold border border-gray-200 dark:border-gray-700">
                    {entry.username[0].toUpperCase()}
                  </div>
                )}
                {/* Gifter Badge Overlay - Top Right */}
                {entry.gifter_level > 0 && (
                  <div
                    className="absolute -top-0.5 -right-0.5 rounded-full px-1 py-0.5 text-[8px] font-bold text-white shadow-sm border border-white dark:border-gray-800"
                    style={{
                      backgroundColor: entry.badge_color || '#94A3B8',
                    }}
                  >
                    {entry.gifter_level}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-medium text-sm truncate">{entry.username}</span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  {type === 'top_streamers' ? 'Diamonds earned' : 'Coins spent'}
                </p>
              </div>

              {/* Metric Value */}
              <div className="flex-shrink-0 text-right">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatMetric(entry.metric_value)}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
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


