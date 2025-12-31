/**
 * BattleTopSupporters - Shows top 3 supporters for a battle side
 * Displays ranking, avatars, and coin amounts
 */

'use client';

import type { BattleSupporter, BattleSide } from '@/types/battle';
import { GifterBadge as TierBadge } from '@/components/gifter';
import type { GifterStatus } from '@/lib/gifter-status';

interface BattleTopSupportersProps {
  supporters: BattleSupporter[];
  side: BattleSide;
  sideColor: string;
  className?: string;
}

export default function BattleTopSupporters({ 
  supporters, 
  side, 
  sideColor,
  className = '' 
}: BattleTopSupportersProps) {
  // Show top 3 only
  const topThree = supporters.slice(0, 3);

  if (topThree.length === 0) {
    return null;
  }

  const rankEmojis = ['🥇', '🥈', '🥉'];

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-2">
        <div 
          className="w-2 h-2 rounded-full" 
          style={{ backgroundColor: sideColor }}
        />
        <span className="text-white/80 text-xs font-semibold uppercase tracking-wide">
          Side {side} Top Supporters
        </span>
      </div>

      {/* Supporters List */}
      <div className="flex flex-col gap-1">
        {topThree.map((supporter, index) => (
          <div 
            key={supporter.id}
            className="flex items-center gap-2 px-2 py-1.5 bg-black/30 rounded-lg backdrop-blur-sm"
          >
            {/* Rank */}
            <span className="text-lg">{rankEmojis[index]}</span>

            {/* Avatar */}
            {supporter.avatar_url ? (
              <img 
                src={supporter.avatar_url} 
                alt={supporter.username}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white">
                {supporter.username.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Username & Badge */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-white text-sm font-medium truncate">
                  {supporter.username}
                </span>
                {/* NOTE: Battles currently use legacy gifter_level field.
                    This component will be updated when battles migrate to gifterStatus.
                    For now, we don't show the gifter badge in battles to avoid showing
                    the wrong legacy system. */}
              </div>
            </div>

            {/* Coins Sent */}
            <div className="flex items-center gap-1 text-amber-400">
              <span className="text-lg">🪙</span>
              <span className="text-xs font-bold tabular-nums">
                {supporter.total_coins_sent.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

