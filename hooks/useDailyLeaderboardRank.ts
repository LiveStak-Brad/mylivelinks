import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface LeaderboardRankData {
  rank: number | null;
  metricValue: number;
  pointsToNextRank: number | null;
  nextRankMetricValue: number | null;
  tierName: string;
  isLoading: boolean;
}

/**
 * Hook to fetch the current user's daily leaderboard rank and points needed to advance
 * @param profileId - The profile ID to check ranking for
 * @param leaderboardType - 'top_streamers' or 'top_gifters'
 */
export function useDailyLeaderboardRank(
  profileId: string | null,
  leaderboardType: 'top_streamers' | 'top_gifters' = 'top_streamers'
): LeaderboardRankData {
  const [data, setData] = useState<LeaderboardRankData>({
    rank: null,
    metricValue: 0,
    pointsToNextRank: null,
    nextRankMetricValue: null,
    tierName: '',
    isLoading: true,
  });

  const supabase = createClient();

  useEffect(() => {
    if (!profileId) {
      setData({
        rank: null,
        metricValue: 0,
        pointsToNextRank: null,
        nextRankMetricValue: null,
        tierName: '',
        isLoading: false,
      });
      return;
    }

    const fetchRankData = async () => {
      try {
        const leaderboardKey = `top_${leaderboardType}_daily`;

        // Fetch user's current rank from cache
        const { data: userRankData, error: userError } = await supabase
          .from('leaderboard_cache')
          .select('rank, metric_value')
          .eq('leaderboard_type', leaderboardKey)
          .eq('profile_id', profileId)
          .order('period_start', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (userError) throw userError;

        const currentRank = userRankData?.rank ?? null;
        const currentMetricValue = Number(userRankData?.metric_value ?? 0);

        // Determine tier name based on rank
        let tierName = '';
        if (currentRank === 1) tierName = 'Diamond';
        else if (currentRank === 2) tierName = 'Platinum';
        else if (currentRank === 3) tierName = 'Gold';
        else if (currentRank && currentRank <= 10) tierName = 'Silver';
        else if (currentRank && currentRank <= 50) tierName = 'Bronze';
        else tierName = 'Unranked';

        // Fetch next rank's metric value to calculate points needed
        let pointsToNextRank: number | null = null;
        let nextRankMetricValue: number | null = null;

        if (currentRank === null) {
          // User is not ranked yet - fetch 100th place
          const { data: rank100Data } = await supabase
            .from('leaderboard_cache')
            .select('metric_value')
            .eq('leaderboard_type', leaderboardKey)
            .eq('rank', 100)
            .order('period_start', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (rank100Data) {
            nextRankMetricValue = Number(rank100Data.metric_value);
            pointsToNextRank = Math.max(0, nextRankMetricValue - currentMetricValue);
          } else {
            // No 100th place yet, just need 1 point to get to top 100
            pointsToNextRank = Math.max(1, 1 - currentMetricValue);
          }
        } else if (currentRank > 1) {
          // Fetch the next higher rank (currentRank - 1)
          const { data: nextRankData } = await supabase
            .from('leaderboard_cache')
            .select('metric_value')
            .eq('leaderboard_type', leaderboardKey)
            .eq('rank', currentRank - 1)
            .order('period_start', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (nextRankData) {
            nextRankMetricValue = Number(nextRankData.metric_value);
            pointsToNextRank = Math.max(1, nextRankMetricValue - currentMetricValue + 1);
          }
        }

        setData({
          rank: currentRank,
          metricValue: currentMetricValue,
          pointsToNextRank,
          nextRankMetricValue,
          tierName,
          isLoading: false,
        });
      } catch (error) {
        console.error('[useDailyLeaderboardRank] Error fetching rank:', error);
        setData({
          rank: null,
          metricValue: 0,
          pointsToNextRank: null,
          nextRankMetricValue: null,
          tierName: '',
          isLoading: false,
        });
      }
    };

    fetchRankData();

    // Subscribe to leaderboard updates
    const channel = supabase
      .channel(`leaderboard-rank-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard_cache',
          filter: `profile_id=eq.${profileId}`,
        },
        () => {
          fetchRankData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, leaderboardType, supabase]);

  return data;
}
