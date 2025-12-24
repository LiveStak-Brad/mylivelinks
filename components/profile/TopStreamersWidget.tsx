'use client';

import { TrendingUp, Eye, Radio } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Streamer {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  is_live: boolean;
  diamonds_earned_lifetime: number;
  peak_viewers: number;
  total_streams: number;
}

interface TopStreamersWidgetProps {
  streamers: Streamer[];
  cardStyle: React.CSSProperties;
  borderRadiusClass: string;
  accentColor: string;
}

export default function TopStreamersWidget({
  streamers,
  cardStyle,
  borderRadiusClass,
  accentColor
}: TopStreamersWidgetProps) {
  if (!streamers || streamers.length === 0) {
    return (
      <div className={`${borderRadiusClass} shadow-lg overflow-hidden`} style={cardStyle}>
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={20} style={{ color: accentColor }} />
            Top Streamers
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No streamers yet
          </p>
        </div>
      </div>
    );
  }
  
  const getRankEmoji = (index: number) => {
    const emojis = ['🥇', '🥈', '🥉'];
    return emojis[index] || '⭐';
  };
  
  return (
    <div className={`${borderRadiusClass} shadow-lg overflow-hidden`} style={cardStyle}>
      <div className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <TrendingUp size={20} style={{ color: accentColor }} />
          Top Streamers
        </h3>
        
        <div className="space-y-3">
          {streamers.map((streamer, index) => (
            <Link
              key={streamer.id}
              href={`/${streamer.username}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <div className="text-2xl">{getRankEmoji(index)}</div>
              
              <div className="relative flex-shrink-0">
                {streamer.avatar_url ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden">
                    <Image
                      src={streamer.avatar_url}
                      alt={streamer.username}
                      fill
                      className="object-cover"
                    />
                    {streamer.is_live && (
                      <div className="absolute inset-0 ring-2 ring-red-500 rounded-full" />
                    )}
                  </div>
                ) : (
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: accentColor }}
                  >
                    {streamer.username[0].toUpperCase()}
                  </div>
                )}
                {streamer.is_live && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <Radio size={10} className="text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate flex items-center gap-2">
                  {streamer.display_name || streamer.username}
                  {streamer.is_live && (
                    <span className="text-xs text-red-500 font-bold">LIVE</span>
                  )}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Eye size={12} />
                    {streamer.peak_viewers.toLocaleString()}
                  </span>
                  <span>💎 {streamer.diamonds_earned_lifetime.toLocaleString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

