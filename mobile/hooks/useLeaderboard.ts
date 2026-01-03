/**
 * Leaderboard Hook - REAL DATA (parity with Web)
 * 
 * Fetches leaderboard data from Supabase
 * Same data source as components/Leaderboard.tsx on web
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase as createClient } from '../lib/supabase';

export interface LeaderboardEntry {
  profile_id: string;
  username: string;
  avatar_url?: string;
  gifter_level: number;
  metric_value: number;
  rank: number;
}

export type LeaderboardType = 'top_streamers' | 'top_gifters';
export type Period = 'daily' | 'weekly' | 'monthly' | 'alltime';

export function useLeaderboard(
  type: LeaderboardType = 'top_streamers',
  period: Period = 'daily',
  roomId?: string | null
) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient;
  const normalizedRoomId = roomId || null;

  const leaderboardKey = useMemo(
    () => `${normalizedRoomId ? `${normalizedRoomId}_` : ''}top_${type}_${period}`,
    [type, period, normalizedRoomId]
  );

  const loadLeaderboard = useCallback(async () => {
    try {
      // Try cache first
      if (!normalizedRoomId) {
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
          const entriesWithProfiles = cacheData.map((item: any) => {
            const profile = item.profiles;
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
          return;
        }
      }

      // Fallback: compute live from source tables using RPC
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_type: type,
        p_period: period,
        p_limit: 100,
        p_room_id: normalizedRoomId,
      });

      if (error) throw error;

      setEntries(data || []);
    } catch (error) {
      console.error('[LEADERBOARD] Error loading:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, leaderboardKey, type, period, normalizedRoomId]);

  useEffect(() => {
    loadLeaderboard();

    // Realtime subscription for ledger entries (updates leaderboard)
    const entryTypeFilter = type === 'top_streamers' ? 'entry_type=eq.diamond_earn' : 'entry_type=eq.coin_spend_gift';
    const filter = normalizedRoomId
      ? `${entryTypeFilter},room_id=eq.${normalizedRoomId}`
      : entryTypeFilter;

    const ledgerChannel = supabase
      .channel(`leaderboard-mobile-${leaderboardKey}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ledger_entries',
          filter,
        },
        () => {
          // Debounce reload
          setTimeout(() => loadLeaderboard(), 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ledgerChannel);
    };
  }, [loadLeaderboard, supabase, type, leaderboardKey]);

  return {
    entries,
    loading,
    refresh: loadLeaderboard,
  };
}

