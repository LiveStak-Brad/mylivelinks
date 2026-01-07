'use client';

import { useEffect, useState } from 'react';
import { X, Gift, Crown, Medal, Award } from 'lucide-react';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import Image from 'next/image';
import { GifterBadge as TierBadge } from '@/components/gifter';
import type { GifterStatus } from '@/lib/gifter-status';
import { fetchGifterStatuses } from '@/lib/gifter-status-client';
import { useStreamTopGifters } from '@/hooks/useStreamTopGifters';

interface StreamGiftersModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveStreamId?: number;
  streamUsername: string;
  onGifterClick?: (profileId: string, username: string) => void;
}

interface TopGifter {
  profile_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  total_coins: number;
  gifter_status?: GifterStatus | null;
  rank: number;
}

export default function StreamGiftersModal({
  isOpen,
  onClose,
  liveStreamId,
  streamUsername,
  onGifterClick,
}: StreamGiftersModalProps) {
  const [topGifters, setTopGifters] = useState<TopGifter[]>([]);
  const [loading, setLoading] = useState(true);
  const { gifters } = useStreamTopGifters({
    liveStreamId,
    enabled: isOpen && !!liveStreamId,
    pollIntervalMs: 7000,
    limit: 20,
  });

  useEffect(() => {
    if (!isOpen || !liveStreamId) return;

    let cancelled = false;
    const hydrateBadges = async () => {
      setLoading(true);
      try {
        const next: TopGifter[] = (gifters ?? []).map((g) => ({
          profile_id: g.profile_id,
          username: g.username,
          display_name: g.display_name ?? undefined,
          avatar_url: g.avatar_url ?? undefined,
          total_coins: g.total_coins,
          gifter_status: null,
          rank: g.rank,
        }));

        if (next.length > 0) {
          const statuses = await fetchGifterStatuses(next.map((g) => g.profile_id));
          next.forEach((g) => {
            g.gifter_status = statuses[g.profile_id];
          });
        }

        if (!cancelled) setTopGifters(next);
      } catch (e) {
        console.error('[StreamGiftersModal] Error hydrating top gifters:', e);
        if (!cancelled) setTopGifters([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void hydrateBadges();
    return () => {
      cancelled = true;
    };
  }, [gifters, isOpen, liveStreamId]);

  if (!isOpen) return null;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white';
      case 2:
        return 'bg-gradient-to-br from-gray-300 to-gray-500 text-white';
      case 3:
        return 'bg-gradient-to-br from-amber-500 to-amber-700 text-white';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white';
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 rounded-2xl shadow-2xl max-w-md w-full mt-4 animate-slide-down overflow-hidden flex flex-col modal-fullscreen-mobile"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-white/20 flex-shrink-0 mobile-safe-top">
          <div className="flex items-center justify-center gap-2">
            <Gift className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Top Gifters</h2>
          </div>
          <p className="text-center text-white/80 text-sm mt-1">
            {streamUsername}'s Stream
          </p>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition text-white mobile-touch-target"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body p-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
            </div>
          ) : topGifters.length === 0 ? (
            <div className="text-center py-12 text-white/80">
              <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-semibold">No gifts yet</p>
              <p className="text-sm mt-1">Be the first to send a gift!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topGifters.map((gifter) => (
                <div
                  key={gifter.profile_id}
                  className={`rounded-xl p-3 cursor-pointer hover:scale-[1.02] transition-all ${
                    gifter.rank <= 3
                      ? 'bg-white shadow-lg'
                      : 'bg-white/90 hover:bg-white'
                  }`}
                  onClick={() => onGifterClick?.(gifter.profile_id, gifter.username)}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${getRankStyle(
                        gifter.rank
                      )}`}
                    >
                      {gifter.rank <= 3 ? getRankIcon(gifter.rank) : gifter.rank}
                    </div>

                    {/* Avatar */}
                    <Image
                      src={getAvatarUrl(gifter.avatar_url)}
                      alt={gifter.username}
                      width={gifter.rank <= 3 ? 56 : 48}
                      height={gifter.rank <= 3 ? 56 : 48}
                      className={`rounded-full flex-shrink-0 ${
                        gifter.rank <= 3 ? 'ring-4 ring-white' : ''
                      }`}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 truncate text-base">
                        {gifter.display_name || gifter.username}
                      </div>
                      {gifter.gifter_status && (
                        <div className="mt-0.5">
                          <TierBadge
                            tier_key={gifter.gifter_status.tier_key}
                            level={gifter.gifter_status.level_in_tier}
                            size="sm"
                          />
                        </div>
                      )}
                    </div>

                    {/* Diamonds */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-xl font-bold text-purple-600">
                        {gifter.total_coins.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 font-semibold">
                        💰 Coins
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
