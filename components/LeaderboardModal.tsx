'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Trophy, Gem, Coins } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { GifterBadge as TierBadge } from '@/components/gifter';
import type { GifterStatus } from '@/lib/gifter-status';
import { fetchGifterStatuses } from '@/lib/gifter-status-client';
import Link from 'next/link';
import { getAvatarUrl } from '@/lib/defaultAvatar';

interface LeaderboardEntry {
  profile_id: string;
  username: string;
  avatar_url?: string;
  gifter_level: number;
  metric_value: number;
  rank: number;
}

type LeaderboardType = 'top_streamers' | 'top_gifters';
type Period = 'daily' | 'weekly' | 'monthly' | 'alltime';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  const [type, setType] = useState<LeaderboardType>('top_streamers');
  const [period, setPeriod] = useState<Period>('daily');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [gifterStatusMap, setGifterStatusMap] = useState<Record<string, GifterStatus>>({});

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      loadLeaderboard();
    }
  }, [isOpen, type, period]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_type: type,
        p_period: period,
        p_limit: 50,
      });

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      const entriesWithBadges = rows
        .map((row: any) => ({
          profile_id: row.profile_id,
          username: row.username,
          avatar_url: row.avatar_url,
          gifter_level: row.gifter_level || 0,
          metric_value: Number(row.metric_value ?? 0),
          rank: Number(row.rank ?? 0),
        }))
        .filter((entry: any) => Number(entry.metric_value ?? 0) > 0);

      setEntries(entriesWithBadges);

      const statusMap = await fetchGifterStatuses(entriesWithBadges.map((e: any) => e.profile_id));
      setGifterStatusMap(statusMap);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMetric = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-20 md:pt-28 lg:pt-32">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[calc(100vh-8rem)] md:max-h-[calc(100vh-10rem)] lg:max-h-[calc(100vh-12rem)] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Leaderboards</h2>
                <p className="text-white/80 text-sm">Top performers</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Type Tabs */}
          <div className="flex gap-1.5 mt-4">
            <button
              onClick={() => setType('top_streamers')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                type === 'top_streamers'
                  ? 'bg-white text-amber-600 shadow-md'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Top Streamers
            </button>
            <button
              onClick={() => setType('top_gifters')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                type === 'top_gifters'
                  ? 'bg-white text-amber-600 shadow-md'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Top Gifters
            </button>
          </div>

          {/* Period Tabs */}
          <div className="flex gap-1.5 mt-2">
            {(['daily', 'weekly', 'monthly', 'alltime'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 px-2 py-2 rounded-lg text-sm font-medium transition ${
                  period === p
                    ? 'bg-white text-amber-600 shadow-md'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {p === 'alltime' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(100vh-16rem)] md:max-h-[calc(100vh-18rem)] lg:max-h-[calc(100vh-20rem)] p-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No entries yet</p>
              <p className="text-sm text-muted-foreground/70">Be the first to make the leaderboard!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, index) => (
                <Link
                  key={entry.profile_id}
                  href={`/${entry.username}`}
                  onClick={onClose}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] ${
                    entry.rank <= 3
                      ? 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20'
                      : 'bg-muted/50 hover:bg-muted border border-transparent'
                  }`}
                  style={{
                    animation: `slideIn 0.3s ease-out ${index * 0.03}s both`,
                  }}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-10 text-center">
                    <span className={`text-lg font-bold ${
                      entry.rank === 1 ? 'text-2xl' : 
                      entry.rank === 2 ? 'text-xl' : 
                      entry.rank === 3 ? 'text-lg' : 'text-muted-foreground'
                    }`}>
                      {getRankIcon(entry.rank)}
                    </span>
                  </div>

                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <img
                      src={getAvatarUrl(entry.avatar_url)}
                      alt={entry.username}
                      className={`rounded-full object-cover border-2 ${
                        entry.rank === 1 ? 'w-12 h-12 border-amber-400' :
                        entry.rank === 2 ? 'w-11 h-11 border-gray-300' :
                        entry.rank === 3 ? 'w-10 h-10 border-orange-400' :
                        'w-9 h-9 border-border'
                      }`}
                    />
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold truncate ${entry.rank <= 3 ? 'text-foreground' : 'text-foreground/80'}`}>
                        @{entry.username}
                      </span>
                      {(() => {
                        const status = gifterStatusMap[entry.profile_id];
                        if (!status || Number(status.lifetime_coins ?? 0) <= 0) return null;
                        return (
                          <TierBadge
                            tier_key={status.tier_key}
                            level={status.level_in_tier}
                            size="sm"
                          />
                        );
                      })()}
                    </div>
                  </div>

                  {/* Metric */}
                  <div className="flex-shrink-0 text-right">
                    <div className={`font-bold ${entry.rank <= 3 ? 'text-foreground' : 'text-foreground/90'}`}>
                      {formatMetric(entry.metric_value)}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                      {type === 'top_streamers' ? (
                        <>
                          <Gem className="w-3 h-3" /> diamonds
                        </>
                      ) : (
                        <>
                          <Coins className="w-3 h-3" /> coins
                        </>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground/80">
                      {type === 'top_streamers' ? 'Diamonds earned' : 'Coins gifted'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

