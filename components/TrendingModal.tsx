'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, Flame, Zap, Eye, Heart } from 'lucide-react';
import Link from 'next/link';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';

interface TrendingEntry {
  stream_id: number;
  profile_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  trending_score: number;
  views_count: number;
  likes_count: number;
  comments_count: number;
}

interface TrendingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TrendingModal({ isOpen, onClose }: TrendingModalProps) {
  const [entries, setEntries] = useState<TrendingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const loadTrending = async () => {
      setLoading(true);
      const supabase = createClient();
      
      try {
        const { data, error } = await supabase.rpc('rpc_get_trending_live_streams', {
          p_limit: 50,
          p_offset: 0
        });

        if (error) {
          console.error('[TrendingModal] Error fetching trending:', error);
          return;
        }

        if (data) {
          setEntries(data);
        }
      } catch (err) {
        console.error('[TrendingModal] Error loading trending:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTrending();
  }, [isOpen]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="text-2xl font-bold text-yellow-500">1</span>
      );
    }
    if (rank === 2) {
      return (
        <span className="text-xl font-bold text-gray-400">2</span>
      );
    }
    if (rank === 3) {
      return (
        <span className="text-lg font-bold text-orange-600">3</span>
      );
    }
    return <span className="text-base font-bold text-gray-600">{rank}</span>;
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
                <p className="text-white/80 text-sm">{entries.length} live streams</p>
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
          {loading ? (
            <div className="text-center py-8 text-white">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-white">
              <Flame className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No live streams trending right now</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, index) => {
                const rank = index + 1;
                return (
                  <Link
                    key={entry.stream_id}
                    href={`/live/${entry.username}`}
                    onClick={onClose}
                    className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-all hover:scale-[1.02] ${
                      rank <= 3
                        ? 'bg-white/95 shadow-lg'
                        : 'bg-white/80 hover:bg-white/90'
                    }`}
                    style={{
                      animation: `slideIn 0.3s ease-out ${index * 0.03}s both`,
                    }}
                  >
                    {/* Rank */}
                    <div className="flex-shrink-0 w-8 sm:w-10 text-center">
                      {getRankBadge(rank)}
                    </div>

                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <Image
                        src={getAvatarUrl(entry.avatar_url)}
                        alt={entry.username}
                        width={rank <= 3 ? 44 : 36}
                        height={rank <= 3 ? 44 : 36}
                        className={`rounded-full object-cover border-2 ${
                          rank === 1 ? 'border-purple-400' :
                          rank === 2 ? 'border-pink-300' :
                          rank === 3 ? 'border-orange-400' :
                          'border-gray-300'
                        }`}
                      />
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm truncate text-gray-900">
                          {entry.display_name || entry.username}
                        </span>
                        {rank <= 3 && (
                          <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Eye className="w-3 h-3" />
                        <span>{entry.views_count}</span>
                        <span>•</span>
                        <Heart className="w-3 h-3" />
                        <span>{entry.likes_count}</span>
                      </div>
                    </div>

                    {/* Trending Score */}
                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-center gap-1 text-xs sm:text-sm font-bold text-purple-600">
                        <Flame className="w-3 h-3 text-orange-500" />
                        <span>{Math.round(entry.trending_score)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
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
