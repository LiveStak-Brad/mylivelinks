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
    return rank;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-0">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[60vh] bg-gradient-to-br from-orange-500 to-yellow-600 rounded-b-2xl shadow-2xl overflow-hidden animate-slideDown flex flex-col modal-fullscreen-mobile">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 p-4 flex-shrink-0 mobile-safe-top">
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
              className="p-2 hover:bg-white/20 rounded-full transition text-white mobile-touch-target"
              aria-label="Close"
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
        <div className="modal-body overflow-y-auto max-h-[calc(100vh-16rem)] md:max-h-[calc(100vh-18rem)] lg:max-h-[calc(100vh-20rem)] p-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto text-white/50 mb-3" />
              <p className="text-white font-semibold">No entries yet</p>
              <p className="text-sm text-white/70">Be the first to make the leaderboard!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, index) => (
                <Link
                  key={entry.profile_id}
                  href={`/${entry.username}`}
                  onClick={onClose}
                  className={`flex items-center gap-2 p-2.5 sm:gap-3 sm:p-3 rounded-xl transition-all hover:scale-[1.02] ${
                    entry.rank <= 3
                      ? 'bg-white/95 shadow-lg'
                      : 'bg-white/80 hover:bg-white/90'
                  }`}
                  style={{
                    animation: `slideIn 0.3s ease-out ${index * 0.03}s both`,
                  }}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-8 sm:w-10 text-center">
                    <span className={`text-base sm:text-lg font-bold ${
                      entry.rank === 1 ? 'sm:text-2xl text-amber-600' : 
                      entry.rank === 2 ? 'sm:text-xl text-gray-500' : 
                      entry.rank === 3 ? 'sm:text-lg text-orange-600' : 'text-gray-600'
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
                        entry.rank === 1 ? 'w-10 h-10 sm:w-12 sm:h-12 border-amber-400' :
                        entry.rank === 2 ? 'w-9 h-9 sm:w-11 sm:h-11 border-gray-300' :
                        entry.rank === 3 ? 'w-8 h-8 sm:w-10 sm:h-10 border-orange-400' :
                        'w-8 h-8 sm:w-9 sm:h-9 border-gray-300'
                      }`}
                    />
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-xs sm:text-sm truncate text-gray-900">
                        {entry.username}
                      </span>
                      {(() => {
                        const status = gifterStatusMap[entry.profile_id];
                        if (!status || Number(status.lifetime_coins ?? 0) <= 0) return null;
                        return (
                          <div className="flex items-center">
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

                  {/* Metric */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs sm:text-sm font-bold text-gray-900">
                      {formatMetric(entry.metric_value)}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-orange-600 uppercase tracking-wide font-semibold">
                      {type === 'top_streamers' ? 'diamonds' : 'coins'}
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

