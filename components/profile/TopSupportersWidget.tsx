'use client';

import { Gift } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { GifterStatus } from '@/lib/gifter-status';

interface Supporter {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  total_gifted: number;
}

interface TopSupportersWidgetProps {
  supporters: Supporter[];
  cardStyle: React.CSSProperties;
  borderRadiusClass: string;
  accentColor: string;
  gifterStatuses?: Record<string, GifterStatus>;
}

export default function TopSupportersWidget({
  supporters,
  cardStyle,
  borderRadiusClass,
  accentColor,
  gifterStatuses
}: TopSupportersWidgetProps) {
  if (!supporters || supporters.length === 0) {
    return (
      <div className={`${borderRadiusClass} shadow-lg overflow-hidden`} style={cardStyle}>
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Gift size={20} style={{ color: accentColor }} />
            Top Supporters
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No supporters yet
          </p>
        </div>
      </div>
    );
  }
  
  const getRankEmoji = (index: number) => {
    const emojis = ['🥇', '🥈', '🥉'];
    return emojis[index] || '👑';
  };
  
  return (
    <div className={`${borderRadiusClass} shadow-lg overflow-hidden`} style={cardStyle}>
      <div className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Gift size={20} style={{ color: accentColor }} />
          Top Supporters
        </h3>
        
        <div className="space-y-3">
          {supporters.map((supporter, index) => (
            (() => {
              const status = gifterStatuses?.[supporter.id];
              const level = status && Number(status.lifetime_coins ?? 0) > 0
                ? Number(status.level_in_tier ?? 0)
                : 0;

              return (
            <Link
              key={supporter.id}
              href={`/${supporter.username}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <div className="text-2xl">{getRankEmoji(index)}</div>
              
              <div className="relative flex-shrink-0">
                {supporter.avatar_url ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden">
                    <Image
                      src={supporter.avatar_url}
                      alt={supporter.username}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: accentColor }}
                  >
                    {(supporter.username?.[0] ?? '?').toUpperCase()}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {supporter.display_name || supporter.username}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {supporter.total_gifted.toLocaleString()} coins
                </p>
              </div>
              
              {level > 0 && (
                <div 
                  className="text-xs font-bold px-2 py-1 rounded-full text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  Lv.{level}
                </div>
              )}
            </Link>
              );
            })()
          ))}
        </div>
      </div>
    </div>
  );
}

