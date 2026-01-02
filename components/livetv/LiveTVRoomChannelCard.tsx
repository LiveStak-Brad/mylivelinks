'use client';

import React from 'react';
import Link from 'next/link';
import { Users, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LiveTVRoomChannel {
  id: string;
  slug?: string;
  name: string;
  description?: string | null;
  room_type?: string;
  icon_url?: string | null;
  banner_url?: string | null;
  viewer_count?: number;
  streamer_count?: number;
  category?: string;
  gender?: 'Men' | 'Women';
  // Legacy fields for backwards compatibility
  liveNowCount?: number;
  categoryIcon?: string;
  avatars?: Array<{ id: string; label: string }>;
}

// Map category to emoji
function getCategoryIcon(category?: string): string {
  switch (category?.toLowerCase()) {
    case 'gaming': return '🎮';
    case 'music': return '🎵';
    case 'comedy': return '😂';
    case 'sports': return '⚽';
    case 'lifestyle': return '✨';
    case 'education': return '📚';
    default: return '📺';
  }
}

interface LiveTVRoomChannelCardProps {
  room: LiveTVRoomChannel;
  onPress?: (room: LiveTVRoomChannel) => void;
}

export function LiveTVRoomChannelCard({ room, onPress }: LiveTVRoomChannelCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onPress) {
      e.preventDefault();
      onPress(room);
    }
  };

  const liveCount = room.liveNowCount ?? room.streamer_count ?? 0;
  const viewerCount = room.viewer_count ?? 0;
  const categoryIcon = room.categoryIcon ?? getCategoryIcon(room.category);
  const roomSlug = room.slug || room.id;

  const content = (
    <>
      {/* Banner/Icon area */}
      <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
        {room.banner_url ? (
          <img 
            src={room.banner_url} 
            alt={room.name} 
            className="w-full h-full object-cover"
          />
        ) : room.icon_url ? (
          <img 
            src={room.icon_url} 
            alt={room.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl sm:text-5xl">{categoryIcon}</span>
          </div>
        )}
        
        {/* Live badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          LIVE
        </div>

        {/* Viewer count */}
        {viewerCount > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-lg">
            <Users className="w-3 h-3" />
            {viewerCount}
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* Room Name */}
        <h3 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {room.name}
        </h3>

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Video className="w-3 h-3" />
            <span>{liveCount} streaming</span>
          </div>
          <span className="capitalize">{room.category || 'Entertainment'}</span>
        </div>
      </div>
    </>
  );

  if (onPress) {
    return (
      <button
        onClick={handleClick}
        className="group w-[200px] sm:w-[220px] bg-card rounded-xl border border-border overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 flex-shrink-0 text-left"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={`/room/${roomSlug}`}
      className="group w-[200px] sm:w-[220px] bg-card rounded-xl border border-border overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 block flex-shrink-0"
    >
      {content}
    </Link>
  );
}

