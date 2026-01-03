'use client';

import { useMemo, useState } from 'react';
import { Heart, Check, Clock, AlertTriangle, Users, Sparkles } from 'lucide-react';
import type { ComingSoonRoom } from './RoomsCarousel';
import { formatInterestCount } from '@/lib/coming-soon-rooms';
import { StatusBadge } from '@/components/ui';
import { Tooltip } from '@/components/ui/Tooltip';

interface RoomCardProps {
  room: ComingSoonRoom;
  interested: boolean;
  onOpenPreview: (room: ComingSoonRoom) => void;
  onToggleInterest: (room: ComingSoonRoom, interested: boolean) => void;
}

// Category color schemes for visual distinction
const categoryColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  gaming: { 
    bg: 'bg-emerald-500/15', 
    text: 'text-emerald-400', 
    border: 'border-emerald-500/30',
    gradient: 'from-emerald-500/20 to-emerald-600/20',
  },
  Gaming: { 
    bg: 'bg-emerald-500/15', 
    text: 'text-emerald-400', 
    border: 'border-emerald-500/30',
    gradient: 'from-emerald-500/20 to-emerald-600/20',
  },
  music: { 
    bg: 'bg-violet-500/15', 
    text: 'text-violet-400', 
    border: 'border-violet-500/30',
    gradient: 'from-violet-500/20 to-violet-600/20',
  },
  Music: { 
    bg: 'bg-violet-500/15', 
    text: 'text-violet-400', 
    border: 'border-violet-500/30',
    gradient: 'from-violet-500/20 to-violet-600/20',
  },
  entertainment: { 
    bg: 'bg-rose-500/15', 
    text: 'text-rose-400', 
    border: 'border-rose-500/30',
    gradient: 'from-rose-500/20 to-rose-600/20',
  },
  Entertainment: { 
    bg: 'bg-rose-500/15', 
    text: 'text-rose-400', 
    border: 'border-rose-500/30',
    gradient: 'from-rose-500/20 to-rose-600/20',
  },
};

export default function RoomCard({ room, interested, onOpenPreview, onToggleInterest }: RoomCardProps) {
  const [imageError, setImageError] = useState(!room.image_url);
  const [isAnimating, setIsAnimating] = useState(false);

  const categoryStyle = categoryColors[room.category] || categoryColors.gaming;
  const categoryLabel = useMemo(() => {
    const cat = room.category?.toLowerCase();
    if (cat === 'gaming') return 'Gaming';
    if (cat === 'music') return 'Music';
    return 'Entertainment';
  }, [room.category]);

  // Support both DB format (current_interest_count) and mock format (interest_count)
  const interestCount = room.current_interest_count ?? room.interest_count ?? 0;
  const threshold = room.interest_threshold ?? 5000;

  const progressPercent = useMemo(() => {
    return Math.min((interestCount / threshold) * 100, 100);
  }, [interestCount, threshold]);

  const isNearThreshold = progressPercent >= 75;

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
        border border-border hover:border-primary/40
        bg-card
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
          <div className={`w-full h-full bg-gradient-to-br ${categoryStyle.gradient} flex items-center justify-center`}>
            <div className="text-6xl opacity-30">
              {room.category?.toLowerCase() === 'gaming' ? '🎮' : 
               room.category?.toLowerCase() === 'music' ? '🎵' : '🎬'}
            </div>
          </div>
        )}
        
        {/* Gradient Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
        
        {/* Status Badge - Top Right */}
        <div className="absolute top-3 right-3">
          <StatusBadge 
            variant="coming-soon" 
            size={room.status === 'opening_soon' ? 'md' : 'sm'}
            pulse={isNearThreshold}
          >
            {room.status === 'opening_soon' ? 'OPENING SOON' : 'COMING SOON'}
          </StatusBadge>
        </div>

        {/* Consent warning */}
        {room.disclaimer_required && (
          <Tooltip content="Age verification required" position="right">
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 
                            rounded-full bg-amber-500/90 backdrop-blur-sm cursor-help">
              <AlertTriangle className="w-3 h-3 text-black" />
              <span className="text-[10px] font-bold text-black uppercase tracking-wide">
                18+
              </span>
            </div>
          </Tooltip>
        )}

        {/* Progress indicator on image */}
        {isNearThreshold && (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-medium text-white">
                Almost there! {progressPercent.toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="relative p-4 space-y-3">
        {/* Category Tag */}
        <div className={`
          inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold 
          ${categoryStyle.bg} ${categoryStyle.text} border ${categoryStyle.border}
        `}>
          {categoryLabel}
        </div>

        {/* Room Name */}
        <h3 className="text-lg font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {room.name}
        </h3>

        {room.subtitle ? (
          <p className="text-sm text-muted-foreground line-clamp-1">
            {room.subtitle}
          </p>
        ) : null}

        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {formatInterestCount(interestCount)} interested
            </span>
            <span>{formatInterestCount(threshold)} to open</span>
          </div>
          
          {/* Progress bar with gradient */}
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`
                absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out
                ${isNearThreshold 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                  : 'bg-gradient-to-r from-primary/80 to-accent/80'
                }
              `}
              style={{ width: `${progressPercent}%` }}
            />
            
            {/* Shimmer effect on progress */}
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full"
              style={{ 
                transform: `translateX(${progressPercent - 100}%)`,
                transition: 'transform 0.5s ease-out'
              }}
            />
          </div>
        </div>

        {/* Interest Count + CTA */}
        <div className="flex items-center justify-between pt-1">
          <Tooltip content={`${interestCount.toLocaleString()} people are interested`} position="bottom">
            <div className="flex items-center gap-1.5 text-muted-foreground cursor-help">
              <Heart className={`w-4 h-4 transition-colors ${interested ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span className="text-sm font-medium">
                {formatInterestCount(interestCount)}
              </span>
            </div>
          </Tooltip>

          <button
            onClick={handleInterestClick}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold
              transition-all duration-200 active:scale-95
              ${interested 
                ? 'bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20' 
                : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20'
              }
              ${isAnimating ? 'scale-95' : 'scale-100'}
            `}
          >
            {interested ? (
              <>
                <Check className="w-4 h-4" />
                <span>Interested</span>
              </>
            ) : (
              <>
                <Heart className="w-4 h-4" />
                <span>Interested</span>
              </>
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
