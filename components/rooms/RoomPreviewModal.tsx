'use client';

import { useEffect, useState } from 'react';
import { X, Heart, Check, Users, Clock, AlertTriangle } from 'lucide-react';
import type { ComingSoonRoom } from './RoomsCarousel';
import { formatInterestCount } from '@/lib/coming-soon-rooms';

interface RoomPreviewModalProps {
  room: ComingSoonRoom | null;
  interested: boolean;
  isOpen: boolean;
  onClose: () => void;
  onToggleInterest: (room: ComingSoonRoom, interested: boolean) => void;
}

// Category color schemes
const categoryColors: Record<string, { bg: string; text: string; accent: string }> = {
  gaming: { bg: 'from-emerald-600 to-teal-700', text: 'text-emerald-400', accent: 'bg-emerald-500' },
  Gaming: { bg: 'from-emerald-600 to-teal-700', text: 'text-emerald-400', accent: 'bg-emerald-500' },
  music: { bg: 'from-violet-600 to-purple-700', text: 'text-violet-400', accent: 'bg-violet-500' },
  Music: { bg: 'from-violet-600 to-purple-700', text: 'text-violet-400', accent: 'bg-violet-500' },
  entertainment: { bg: 'from-rose-600 to-pink-700', text: 'text-rose-400', accent: 'bg-rose-500' },
  Entertainment: { bg: 'from-rose-600 to-pink-700', text: 'text-rose-400', accent: 'bg-rose-500' },
};

export default function RoomPreviewModal({ room, interested, isOpen, onClose, onToggleInterest }: RoomPreviewModalProps) {
  const [imageError, setImageError] = useState(false);

  // Reset state when room changes
  useEffect(() => {
    if (room) {
      setImageError(!room.image_url);
    }
  }, [room]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const categoryKey = room?.category ?? 'gaming';
  const categoryStyle = categoryColors[categoryKey] || categoryColors.gaming;
  const cat = room?.category?.toLowerCase();
  const categoryLabel = cat === 'gaming' ? 'Gaming' : cat === 'music' ? 'Music' : 'Entertainment';

  // Support both DB format (current_interest_count) and mock format (interest_count)
  const interestCount = room?.current_interest_count ?? room?.interest_count ?? 0;
  const threshold = room?.interest_threshold ?? 5000;

  const progressPercent = Math.min((interestCount / threshold) * 100, 100);

  const handleInterestClick = async () => {
    if (!room) return;
    onToggleInterest(room, !interested);
  };

  if (!isOpen || !room) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />
      
      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl 
                   animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero Image Section */}
        <div className="relative h-48 md:h-56 overflow-hidden">
          {!imageError ? (
            <img
              src={room.image_url || ''}
              alt={room.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-neutral-800 via-neutral-900 to-black" />
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 backdrop-blur-sm 
                       hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Status Badge */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 
                          rounded-full bg-black/60 backdrop-blur-sm border border-white/20">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-white">
              {room.status === 'opening_soon' ? 'Opening Soon' : 'Coming Soon'}
            </span>
          </div>

          {/* Category Badge - Bottom of image */}
          <div className={`absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-gradient-to-r 
                           ${categoryStyle.bg} text-white text-sm font-semibold`}>
            {categoryLabel}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Title + Special Badge */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{room.name}</h2>
            
            {room.disclaimer_required && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg 
                              bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-500">
                  Consent required — you must comply with community guidelines.
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          <p className="text-muted-foreground leading-relaxed">
            {room.description || 'Express interest to help us decide what to open next.'}
          </p>

          {/* Interest Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                {formatInterestCount(interestCount)} interested
              </span>
              <span className="text-muted-foreground">
                {formatInterestCount(threshold)} to open
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 
                            bg-gradient-to-r ${categoryStyle.bg}`}
                style={{ width: `${progressPercent}%` }}
              />
              {/* Shimmer effect */}
              <div 
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r 
                           from-transparent via-white/20 to-transparent animate-pulse"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              {progressPercent >= 100 
                ? '🎉 Goal reached! Opening soon...'
                : `${Math.round(progressPercent)}% of the way there!`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleInterestClick}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                font-semibold transition-all duration-200
                ${interested 
                  ? 'bg-primary/20 text-primary border-2 border-primary/30' 
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }
              `}
            >
              {interested ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Interested</span>
                </>
              ) : (
                <>
                  <Heart className="w-5 h-5" />
                  <span>I&apos;m Interested</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

