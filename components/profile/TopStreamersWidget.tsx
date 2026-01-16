'use client';

import { TrendingUp } from 'lucide-react';
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
  total_gifted_to?: number; // How much this profile has sent to them
}

interface TopStreamersWidgetProps {
  streamers: Streamer[];
  cardStyle: React.CSSProperties;
  borderRadiusClass: string;
  accentColor: string;
}

const PODIUM_COLORS = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

const formatAmount = (amount: number) => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toString();
};

interface PodiumPlaceProps {
  streamer: Streamer | undefined;
  place: 1 | 2 | 3;
  podiumColor: string;
  podiumHeight: number;
  avatarSize: number;
  accentColor: string;
}

function PodiumPlace({ streamer, place, podiumColor, podiumHeight, avatarSize, accentColor }: PodiumPlaceProps) {
  if (!streamer) return <div className="flex-1" />;
  
  const displayName = streamer.display_name || streamer.username;
  const placeLabels = { 1: '1st', 2: '2nd', 3: '3rd' };

  return (
    <Link
      href={`/${streamer.username}`}
      className="flex-1 flex flex-col items-center justify-end hover:opacity-80 transition"
    >
      {/* Avatar with crown/medal */}
      <div className="relative mb-2">
        {place === 1 && (
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-2xl z-10">
            👑
          </div>
        )}
        <div className="relative">
          {streamer.avatar_url ? (
            <div 
              className="rounded-full overflow-hidden"
              style={{ 
                width: avatarSize, 
                height: avatarSize, 
                border: `3px solid ${podiumColor}` 
              }}
            >
              <Image
                src={streamer.avatar_url}
                alt={streamer.username}
                width={avatarSize}
                height={avatarSize}
                className="object-cover"
              />
            </div>
          ) : (
            <div 
              className="rounded-full flex items-center justify-center text-white font-bold"
              style={{ 
                width: avatarSize, 
                height: avatarSize, 
                backgroundColor: accentColor,
                border: `3px solid ${podiumColor}` 
              }}
            >
              {(streamer.username?.[0] ?? '?').toUpperCase()}
            </div>
          )}
          {/* Live badge */}
          {streamer.is_live && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
          )}
        </div>
        {/* Place badge */}
        <div 
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-bold text-black"
          style={{ backgroundColor: podiumColor }}
        >
          {placeLabels[place]}
        </div>
      </div>

      {/* Name */}
      <p className="text-sm font-semibold text-center truncate max-w-[90px] mt-1">
        {displayName}
      </p>

      {/* Amount gifted to this streamer */}
      <p className="text-xs font-bold mb-2" style={{ color: accentColor }}>
        {formatAmount(streamer.total_gifted_to ?? streamer.diamonds_earned_lifetime)}
      </p>

      {/* Podium block */}
      <div 
        className="w-[90%] rounded-t-lg flex items-center justify-center"
        style={{ height: podiumHeight, backgroundColor: podiumColor }}
      >
        <span className="text-xl font-extrabold text-black/30">{place}</span>
      </div>
    </Link>
  );
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

  // Get top 3 streamers
  const top3 = streamers.slice(0, 3);
  const first = top3[0];
  const second = top3[1];
  const third = top3[2];
  
  return (
    <div className={`${borderRadiusClass} shadow-lg overflow-hidden`} style={cardStyle}>
      <div className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <TrendingUp size={20} style={{ color: accentColor }} />
          Top Streamers
        </h3>
        
        {/* Podium Layout: 2nd - 1st - 3rd */}
        <div className="flex items-end justify-center pt-6">
          <PodiumPlace 
            streamer={second} 
            place={2} 
            podiumColor={PODIUM_COLORS.silver} 
            podiumHeight={50} 
            avatarSize={60} 
            accentColor={accentColor}
          />
          <PodiumPlace 
            streamer={first} 
            place={1} 
            podiumColor={PODIUM_COLORS.gold} 
            podiumHeight={70} 
            avatarSize={76} 
            accentColor={accentColor}
          />
          <PodiumPlace 
            streamer={third} 
            place={3} 
            podiumColor={PODIUM_COLORS.bronze} 
            podiumHeight={40} 
            avatarSize={56} 
            accentColor={accentColor}
          />
        </div>
      </div>
    </div>
  );
}

