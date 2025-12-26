'use client';

import { useMemo, useState } from 'react';
import { Heart, Check, Clock, AlertTriangle } from 'lucide-react';
import type { ComingSoonRoom } from './RoomsCarousel';
import { formatInterestCount } from '@/lib/coming-soon-rooms';

interface RoomCardProps {
  room: ComingSoonRoom;
  interested: boolean;
  onOpenPreview: (room: ComingSoonRoom) => void;
  onToggleInterest: (room: ComingSoonRoom, interested: boolean) => void;
}

// Category color schemes for visual distinction
const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  gaming: { 
    bg: 'bg-emerald-500/20', 
    text: 'text-emerald-400', 
    border: 'border-emerald-500/30' 
  },
  music: { 
    bg: 'bg-violet-500/20', 
    text: 'text-violet-400', 
    border: 'border-violet-500/30' 
  },
  entertainment: { 
    bg: 'bg-rose-500/20', 
    text: 'text-rose-400', 
    border: 'border-rose-500/30' 
  },
};

export default function RoomCard({ room, interested, onOpenPreview, onToggleInterest }: RoomCardProps) {
  const [imageError, setImageError] = useState(!room.image_url);
  const [isAnimating, setIsAnimating] = useState(false);

  const categoryStyle = categoryColors[room.category] || categoryColors.gaming;
  const categoryLabel = useMemo(() => {
    if (room.category === 'gaming') return 'Gaming';
    if (room.category === 'music') return 'Music';
    return 'Entertainment';
  }, [room.category]);

  const progressPercent = useMemo(() => {
    const denom = room.interest_threshold || 1;
    return Math.min((room.current_interest_count / denom) * 100, 100);
  }, [room.current_interest_count, room.interest_threshold]);

  const handleInterestClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    setIsAnimating(true);
    onToggleInterest(room, !interested);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div
      onClick={() => onOpenPreview(room)}
      className="
        group relative flex-shrink-0 w-[260px] md:w-[280px] 
        rounded-2xl overflow-hidden cursor-pointer
        transition-all duration-300 ease-out
        hover:scale-[1.03] hover:shadow-2xl hover:shadow-primary/20
        border border-white/10 hover:border-white/20
      "
    >
      {/* Background Image */}
      <div className="relative h-[180px] md:h-[200px] overflow-hidden">
        {!imageError ? (
          <img
            src={room.image_url || ''}
            alt={room.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-800 via-neutral-900 to-black" />
        )}
        
        {/* Gradient Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        
        {/* Status Pill - Top Right */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 
                        rounded-full bg-black/60 backdrop-blur-sm border border-white/20">
          <Clock className="w-3 h-3 text-amber-400" />
          <span className="text-[11px] font-semibold text-white tracking-wide">
            {room.status === 'opening_soon' ? 'Opening Soon' : 'Coming Soon'}
          </span>
        </div>

        {room.disclaimer_required && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 
                          rounded-full bg-amber-500/80 backdrop-blur-sm">
            <AlertTriangle className="w-3 h-3 text-black" />
            <span className="text-[10px] font-bold text-black uppercase tracking-wide">
              Consent
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="relative bg-card/95 backdrop-blur-sm p-4 space-y-3">
        {/* Category Tag */}
        <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold 
                         ${categoryStyle.bg} ${categoryStyle.text} border ${categoryStyle.border}`}>
          {categoryLabel}
        </div>

        {/* Room Name */}
        <h3 className="text-lg font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {room.name}
        </h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatInterestCount(room.current_interest_count)} interested</span>
            <span>{formatInterestCount(room.interest_threshold)} to open</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-primary/80 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Interest Count + CTA */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Heart className={`w-4 h-4 ${interested ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span className="text-sm font-medium">
              {formatInterestCount(room.current_interest_count)}
            </span>
          </div>

          <button
            onClick={handleInterestClick}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold
              transition-all duration-200
              ${interested 
                ? 'bg-primary/20 text-primary border border-primary/30' 
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }
              ${isAnimating ? 'scale-95' : 'scale-100'}
            `}
          >
            {interested ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Interested</span>
              </>
            ) : (
              <span>Interested</span>
            )}
          </button>
        </div>
      </div>

      {/* Hover Glow Effect */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 
                      transition-opacity duration-300 pointer-events-none
                      bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
    </div>
  );
}

