'use client';

/**
 * TopGiftersDisplay - Compact display of top 3 gifters for a battle side
 * 
 * Shows rank badge, avatar, truncated name, and points.
 * Used in the bottom row of BattleGridWrapper.
 */

import { useMemo } from 'react';
import Image from 'next/image';
import { getAvatarUrl } from '@/lib/defaultAvatar';

export interface TeamTopGifter {
  profile_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
  rank: 1 | 2 | 3;
}

interface TopGiftersDisplayProps {
  /** Array of top gifters (max 3) */
  gifters: TeamTopGifter[];
  /** Team side for color styling */
  side: 'A' | 'B';
  /** Team color (hex) */
  color: string;
  /** Additional className */
  className?: string;
}

// Rank badge styles (no emojis)
const RANK_STYLES: Record<1 | 2 | 3, { bg: string; text: string }> = {
  1: { bg: 'bg-amber-500', text: 'text-black' },
  2: { bg: 'bg-gray-400', text: 'text-black' },
  3: { bg: 'bg-amber-700', text: 'text-white' },
};

export default function TopGiftersDisplay({
  gifters,
  side,
  color,
  className = '',
}: TopGiftersDisplayProps) {
  // Format points compactly
  const formatPoints = (points: number): string => {
    if (points >= 1000000) return `${(points / 1000000).toFixed(1)}M`;
    if (points >= 1000) return `${(points / 1000).toFixed(1)}K`;
    return points.toString();
  };

  if (gifters.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      {gifters.map((gifter) => {
        const rankStyle = RANK_STYLES[gifter.rank];
        return (
          <div
            key={gifter.profile_id}
            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-black/40"
          >
            {/* Rank badge */}
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${rankStyle.bg} ${rankStyle.text}`}
            >
              {gifter.rank}
            </div>

            {/* Avatar */}
            <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
              <Image
                src={getAvatarUrl(gifter.avatar_url)}
                alt={gifter.username}
                width={20}
                height={20}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Name (truncated) */}
            <span className="text-[10px] text-white/80 truncate max-w-[50px]">
              {gifter.display_name || gifter.username}
            </span>

            {/* Points */}
            <span
              className="text-[10px] font-bold ml-auto"
              style={{ color }}
            >
              {formatPoints(gifter.points)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
