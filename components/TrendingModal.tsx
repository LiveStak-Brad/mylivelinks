'use client';

import { useState } from 'react';
import { X, TrendingUp, Flame, Zap } from 'lucide-react';
import Link from 'next/link';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import Image from 'next/image';

interface TrendingEntry {
  profile_id: string;
  username: string;
  avatar_url?: string;
  trending_score: number;
  rank: number;
  change: number; // Position change from previous period
  viewer_count: number;
}

interface TrendingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TrendingModal({ isOpen, onClose }: TrendingModalProps) {
  // Mock trending data
  const [entries] = useState<TrendingEntry[]>([
    {
      profile_id: '1',
      username: 'CannaStreams',
      avatar_url: undefined,
      trending_score: 9850,
      rank: 1,
      change: 5,
      viewer_count: 1234,
    },
    {
      profile_id: '2',
      username: 'TechGuru',
      avatar_url: undefined,
      trending_score: 8920,
      rank: 2,
      change: 3,
      viewer_count: 892,
    },
    {
      profile_id: '3',
      username: 'GamingPro',
      avatar_url: undefined,
      trending_score: 8450,
      rank: 3,
      change: -1,
      viewer_count: 756,
    },
    {
      profile_id: '4',
      username: 'MusicVibes',
      avatar_url: undefined,
      trending_score: 7890,
      rank: 4,
      change: 2,
      viewer_count: 645,
    },
    {
      profile_id: '5',
      username: 'ArtistryLive',
      avatar_url: undefined,
      trending_score: 7320,
      rank: 5,
      change: 0,
      viewer_count: 534,
    },
    {
      profile_id: '6',
      username: 'FitnessFlow',
      avatar_url: undefined,
      trending_score: 6890,
      rank: 6,
      change: 4,
      viewer_count: 478,
    },
    {
      profile_id: '7',
      username: 'CookingShow',
      avatar_url: undefined,
      trending_score: 6420,
      rank: 7,
      change: -2,
      viewer_count: 423,
    },
    {
      profile_id: '8',
      username: 'TravelVlog',
      avatar_url: undefined,
      trending_score: 5980,
      rank: 8,
      change: 1,
      viewer_count: 389,
    },
  ]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  const getChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center gap-0.5 text-green-600">
          <TrendingUp className="w-3 h-3" />
          <span className="text-xs font-semibold">+{change}</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center gap-0.5 text-red-600">
          <TrendingUp className="w-3 h-3 rotate-180" />
          <span className="text-xs font-semibold">{change}</span>
        </div>
      );
    }
    return (
      <div className="text-xs font-semibold text-gray-400">
        —
      </div>
    );
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
      <div className="relative w-full max-w-lg max-h-[60vh] bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 rounded-b-2xl shadow-2xl overflow-hidden animate-slideDown flex flex-col modal-fullscreen-mobile">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 p-4 flex-shrink-0 mobile-safe-top">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Trending Now</h2>
                <p className="text-white/80 text-sm">Hottest streams right now</p>
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
        </div>

        {/* Content */}
        <div className="modal-body overflow-y-auto max-h-[calc(60vh-5rem)] p-4">
          <div className="space-y-2">
            {entries.map((entry, index) => (
              <Link
                key={entry.profile_id}
                href={`/live/${entry.username}`}
                onClick={onClose}
                className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-all hover:scale-[1.02] ${
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
                    entry.rank === 1 ? 'sm:text-2xl text-purple-600' : 
                    entry.rank === 2 ? 'sm:text-xl text-pink-500' : 
                    entry.rank === 3 ? 'sm:text-lg text-orange-600' : 'text-gray-600'
                  }`}>
                    {getRankIcon(entry.rank)}
                  </span>
                </div>

                {/* Avatar */}
                <div className="flex-shrink-0">
                  <Image
                    src={getAvatarUrl(entry.avatar_url)}
                    alt={entry.username}
                    width={entry.rank <= 3 ? 44 : 36}
                    height={entry.rank <= 3 ? 44 : 36}
                    className={`rounded-full object-cover border-2 ${
                      entry.rank === 1 ? 'border-purple-400' :
                      entry.rank === 2 ? 'border-pink-300' :
                      entry.rank === 3 ? 'border-orange-400' :
                      'border-gray-300'
                    }`}
                  />
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs sm:text-sm truncate text-gray-900">
                      {entry.username}
                    </span>
                    {entry.rank <= 3 && (
                      <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>{entry.viewer_count.toLocaleString()} watching</span>
                  </div>
                </div>

                {/* Trending Score & Change */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-xs sm:text-sm font-bold text-gray-900">
                    {entry.trending_score.toLocaleString()}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-purple-600 uppercase tracking-wide font-semibold mb-1">
                    TRENDING
                  </div>
                  {getChangeIndicator(entry.change)}
                </div>
              </Link>
            ))}
          </div>
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
