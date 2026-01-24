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
  points_contributed: number; // Changed from 'points' to match database schema
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

export default function TopGiftersDisplay({
  gifters,
  side,
  color,
  className = '',
}: TopGiftersDisplayProps) {
  if (gifters.length === 0) {
    return null;
  }

  // Rank badge colors (gold, silver, bronze)
  const RANK_COLORS: Record<1 | 2 | 3, string> = {
    1: '#FFD700', // Gold
    2: '#C0C0C0', // Silver
    3: '#CD7F32', // Bronze
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {gifters.map((gifter) => (
        <div
          key={gifter.profile_id}
          className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2"
          style={{ 
            borderColor: RANK_COLORS[gifter.rank],
            boxShadow: `0 0 8px ${RANK_COLORS[gifter.rank]}40`
          }}
        >
          <Image
            src={getAvatarUrl(gifter.avatar_url)}
            alt={gifter.username}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}
