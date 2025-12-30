'use client';

import React from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LiveTVRoomChannel {
  id: string;
  name: string;
  liveNowCount: number;
  categoryIcon: string;
  avatars: Array<{ id: string; label: string }>;
  gender?: 'Men' | 'Women';
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

  const content = (
    <>
      <div className="p-3 sm:p-5 flex flex-col items-center gap-2 sm:gap-4 relative">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Category Icon with glow */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 blur-xl sm:blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-4xl sm:text-6xl relative transform group-hover:scale-110 transition-transform duration-300">
            {room.categoryIcon}
          </div>
        </div>
        
        {/* Room Name */}
        <h3 className="font-black text-xs sm:text-base text-foreground text-center line-clamp-1 relative group-hover:text-primary transition-colors px-1">
          {room.name}
        </h3>

        {/* Avatar Stack with improved styling */}
        <div className="flex items-center justify-center -space-x-2 sm:-space-x-3 relative">
          {room.avatars.slice(0, 4).map((avatar, idx) => (
            <div
              key={avatar.id}
              className={cn(
                'w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center border border-card sm:border-2',
                'shadow-md sm:shadow-lg transform group-hover:scale-110 transition-all duration-300',
                'ring-1 sm:ring-2 ring-primary/20'
              )}
              style={{ 
                zIndex: 10 - idx,
                transitionDelay: `${idx * 50}ms`
              }}
            >
              <span className="text-white text-[10px] sm:text-xs font-black">{avatar.label}</span>
            </div>
          ))}
        </div>

        {/* Live Count with pulse animation */}
        <div className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] sm:text-xs font-black px-2 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl shadow-md sm:shadow-lg shadow-red-500/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
          <Users className="w-2.5 h-2.5 sm:w-4 sm:h-4 relative animate-pulse" />
          <span className="relative">{room.liveNowCount} Live</span>
        </div>
      </div>
    </>
  );

  if (onPress) {
    return (
      <button
        onClick={handleClick}
        className="group w-[220px] bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 flex-shrink-0"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={`/rooms/${room.id}`}
      className="group w-[160px] sm:w-[220px] bg-card rounded-xl sm:rounded-2xl border border-border sm:border-2 overflow-hidden shadow-md sm:shadow-lg hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 sm:hover:-translate-y-2 hover:border-primary/50 block flex-shrink-0"
    >
      {content}
    </Link>
  );
}

