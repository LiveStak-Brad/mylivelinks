'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Trophy, Gem, Coins } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { GifterBadge as TierBadge } from '@/components/gifter';
import type { GifterStatus } from '@/lib/gifter-status';
import { fetchGifterStatuses } from '@/lib/gifter-status-client';
import Link from 'next/link';

interface LeaderboardEntry {
  profile_id: string;
  username: string;
  avatar_url?: string;
  gifter_level: number;
  metric_value: number;
  rank: number;
}

type LeaderboardType = 'top_streamers' | 'top_gifters';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  const [type, setType] = useState<LeaderboardType>('top_streamers');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [gifterStatusMap, setGifterStatusMap] = useState<Record<string, GifterStatus>>({});

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      loadLeaderboard();
    }
  }, [isOpen, type]);

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
      let data: any[] = [];

      if (type === 'top_streamers') {
        const result = await supabase
          .from('profiles')
          .select('id, username, avatar_url, gifter_level, total_gifts_received')
          .not('total_gifts_received', 'is', null)
          .gt('total_gifts_received', 0)
          .order('total_gifts_received', { ascending: false })
          .limit(50);
        data = result.data || [];
      } else {
        const result = await supabase
          .from('profiles')
          .select('id, username, avatar_url, gifter_level, total_spent')
          .not('total_spent', 'is', null)
          .gt('total_spent', 0)
          .order('total_spent', { ascending: false })
          .limit(50);
        data = result.data || [];
      }

      const entriesWithBadges = data.map((profile: any, index: number) => ({
        profile_id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        gifter_level: profile.gifter_level || 0,
        metric_value: type === 'top_streamers' ? profile.total_gifts_received : profile.total_spent,
        rank: index + 1,
      })).filter((entry: any) => Number(entry.metric_value ?? 0) > 0);

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[85vh] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-scale-in">
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
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setType('top_streamers')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition ${
                type === 'top_streamers'
                  ? 'bg-white text-amber-600 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Gem className="w-4 h-4" />
              Top Earners
            </button>
            <button
              onClick={() => setType('top_gifters')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition ${
                type === 'top_gifters'
                  ? 'bg-white text-amber-600 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Coins className="w-4 h-4" />
              Top Gifters
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-180px)] p-4">
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
                    {entry.avatar_url ? (
                      <img
                        src={entry.avatar_url}
                        alt={entry.username}
                        className={`rounded-full object-cover border-2 ${
                          entry.rank === 1 ? 'w-12 h-12 border-amber-400' :
                          entry.rank === 2 ? 'w-11 h-11 border-gray-300' :
                          entry.rank === 3 ? 'w-10 h-10 border-orange-400' :
                          'w-9 h-9 border-border'
                        }`}
                      />
                    ) : (
                      <div className={`rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold border-2 ${
                        entry.rank === 1 ? 'w-12 h-12 text-lg border-amber-400' :
                        entry.rank === 2 ? 'w-11 h-11 border-gray-300' :
                        entry.rank === 3 ? 'w-10 h-10 border-orange-400' :
                        'w-9 h-9 text-sm border-border'
                      }`}>
                        {(entry.username?.[0] ?? '?').toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold truncate ${entry.rank <= 3 ? 'text-foreground' : 'text-foreground/80'}`}>
                        {entry.username}
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
                    <div className={`font-bold ${entry.rank <= 3 ? 'text-lg' : 'text-base'} ${
                      type === 'top_streamers' ? 'text-cyan-500' : 'text-amber-500'
                    }`}>
                      {formatMetric(entry.metric_value)}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
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

