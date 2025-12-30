'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Stream {
  id: string;
  slug: string;
  streamer_display_name: string;
  thumbnail_url: string | null;
  viewer_count: number;
  category: string | null;
  badges?: StreamBadge[];
  gender?: 'Men' | 'Women';
}

export type StreamBadge = 'Trending' | 'Featured' | 'Sponsored';

interface StreamCardProps {
  stream: Stream;
  onPress?: (stream: Stream) => void;
  /** Optional: Use flexible width for grid layouts instead of fixed width */
  flexibleWidth?: boolean;
}

const BADGE_STYLES: Record<StreamBadge, { bg: string; text: string }> = {
  Trending: { bg: 'bg-red-500', text: 'Trending' },
  Featured: { bg: 'bg-amber-500', text: 'Featured' },
  Sponsored: { bg: 'bg-purple-500', text: 'Sponsored' },
};

/**
 * StreamCard - LiveTV stream card component (Web)
 * 
 * Premium discovery card for LiveTV with:
 * - 16:9 aspect ratio thumbnail
 * - Streamer display name with avatar
 * - Viewer count
 * - Tag badges (Trending/Featured/Sponsored)
 * - Category label
 * - TikTok/Kik-level polish
 */
export function StreamCard({ stream, onPress, flexibleWidth = false }: StreamCardProps) {
  const [imageError, setImageError] = useState(false);
  
  const primaryBadge = stream.badges?.[0];
  const badgeInfo = primaryBadge ? BADGE_STYLES[primaryBadge] : null;

  const handleClick = (e: React.MouseEvent) => {
    if (onPress) {
      e.preventDefault();
      onPress(stream);
    }
  };

  // Base classes for the card
  const cardBaseClasses = "group bg-gradient-to-br from-card via-card to-card/95 rounded-xl sm:rounded-2xl border border-border overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2 hover:border-primary/50 relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/0 before:to-accent/0 hover:before:from-primary/5 hover:before:to-accent/5 before:transition-all before:duration-300";
  
  // Width classes: flexible for grids, fixed for rails
  const widthClasses = flexibleWidth ? "w-full" : "w-[180px] sm:w-[280px] flex-shrink-0";
  
  const cardClasses = cn(cardBaseClasses, widthClasses);

  const content = (
    <>
      {/* Thumbnail Container (16:9 aspect ratio) */}
      <div className="relative w-full aspect-video bg-muted overflow-hidden">
        {stream.thumbnail_url && !imageError ? (
          <Image
            src={stream.thumbnail_url}
            alt={stream.streamer_display_name}
            fill
            className="object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-pink-500/10">
            <span className="text-7xl opacity-30 group-hover:opacity-40 transition-opacity">📺</span>
          </div>
        )}

        {/* Gradient Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

        {/* Primary Badge - Top Left (moved for better visibility) */}
        {badgeInfo && (
          <div
            className={cn(
              'absolute top-1.5 left-1.5 sm:top-3 sm:left-3 px-1.5 py-0.5 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg shadow-lg sm:shadow-2xl backdrop-blur-sm',
              'flex items-center gap-0.5 sm:gap-1.5 border border-white/20',
              badgeInfo.bg
            )}
          >
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-white text-[9px] sm:text-xs font-black tracking-wider uppercase">
              {badgeInfo.text}
            </span>
          </div>
        )}

        {/* Viewer Count Badge - Bottom Right */}
        {stream.viewer_count > 0 && (
          <div className="absolute bottom-1.5 right-1.5 sm:bottom-3 sm:right-3 flex items-center gap-1 sm:gap-1.5 bg-black/80 backdrop-blur-md text-white text-[9px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg border border-white/10 shadow-lg sm:shadow-xl">
            <Eye className="w-2.5 h-2.5 sm:w-4 sm:h-4" />
            <span className="font-black">
              {stream.viewer_count >= 1000
                ? `${(stream.viewer_count / 1000).toFixed(1)}K`
                : stream.viewer_count}
            </span>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-accent/0 group-hover:from-primary/10 group-hover:to-accent/10 transition-all duration-300" />
      </div>

      {/* Content */}
      <div className="p-2 sm:p-4 flex flex-col gap-1 sm:gap-2">
        {/* Name Row with Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 shadow-md ring-1 sm:ring-2 ring-primary/20">
            <span className="text-white text-xs sm:text-base font-black">
              {stream.streamer_display_name.slice(0, 1).toUpperCase()}
            </span>
          </div>
          <span className="text-foreground font-bold text-xs sm:text-base leading-tight truncate flex-1 tracking-tight group-hover:text-primary transition-colors">
            {stream.streamer_display_name}
          </span>
        </div>

        {/* Category Label */}
        {stream.category && (
          <div className="flex items-center gap-1 sm:gap-2 pl-0.5">
            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-gradient-to-r from-primary to-accent" />
            <span className="text-muted-foreground text-[10px] sm:text-sm font-semibold truncate">
              {stream.category}
            </span>
          </div>
        )}
      </div>
    </>
  );

  if (onPress) {
    return (
      <button
        onClick={handleClick}
        className={cn(cardClasses, "text-left")}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={`/live/${stream.slug}`}
      className={cn(cardClasses, "block")}
    >
      {content}
    </Link>
  );
}

