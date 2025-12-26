'use client';

import { useState, useEffect, useCallback, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  MessageCircle, 
  Send, 
  Bookmark,
  MoreHorizontal,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Camera,
  Film
} from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import type { MediaItem } from './PhotoGrid';

/* =============================================================================
   MEDIA VIEWER MODAL
   
   Instagram-style fullscreen media viewer with navigation and interactions.
   
   @example
   <MediaViewerModal
     isOpen={showViewer}
     onClose={() => setShowViewer(false)}
     items={mediaItems}
     initialIndex={0}
   />
============================================================================= */

export interface MediaViewerModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Array of media items */
  items: MediaItem[];
  /** Initial index to display */
  initialIndex?: number;
  /** Username of the profile owner */
  username?: string;
  /** Avatar URL of the profile owner */
  avatarUrl?: string;
}

export function MediaViewerModal({
  isOpen,
  onClose,
  items,
  initialIndex = 0,
  username = 'User',
  avatarUrl,
}: MediaViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Update index when initialIndex changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLiked(false);
      setIsSaved(false);
      setIsPlaying(false);
    }
  }, [isOpen, currentIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case ' ':
          e.preventDefault();
          if (currentItem?.type === 'video') {
            setIsPlaying(!isPlaying);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentIndex, isPlaying]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  }, [items.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  }, [items.length]);

  if (!isOpen || items.length === 0) return null;

  const currentItem = items[currentIndex];
  const hasMultiple = items.length > 1;

  return (
    <div 
      className="fixed inset-0 z-[1300] flex"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-sm animate-fade-in" />
      
      {/* Main Container */}
      <div 
        className="relative flex-1 flex flex-col lg:flex-row max-h-screen animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="
            absolute top-4 right-4 z-50
            w-10 h-10 rounded-full bg-black/50 hover:bg-black/70
            flex items-center justify-center
            text-white transition-all duration-200
            hover:scale-110 active:scale-95
          "
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Media Section */}
        <div className="flex-1 relative flex items-center justify-center p-4 lg:p-8">
          {/* Previous Button */}
          {hasMultiple && (
            <button
              onClick={goToPrevious}
              className="
                absolute left-4 top-1/2 -translate-y-1/2 z-40
                w-10 h-10 rounded-full bg-white/10 hover:bg-white/20
                flex items-center justify-center
                text-white transition-all duration-200
                hover:scale-110 active:scale-95
                backdrop-blur-sm
              "
              aria-label="Previous"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Media Display */}
          <div className="max-w-4xl max-h-[80vh] w-full h-full flex items-center justify-center">
            {currentItem.type === 'video' ? (
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
                {/* Video Placeholder */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                  <Film className="w-16 h-16 text-white/30 mb-4" />
                  <p className="text-white/50 text-sm">Video placeholder</p>
                </div>
                
                {/* Play/Pause Overlay */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="absolute inset-0 flex items-center justify-center group"
                >
                  <div className={`
                    w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm
                    flex items-center justify-center
                    transition-all duration-300
                    ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}
                    group-hover:scale-110
                  `}>
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-white" />
                    ) : (
                      <Play className="w-8 h-8 text-white ml-1" />
                    )}
                  </div>
                </button>

                {/* Video Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 h-1 bg-white/30 rounded-full mr-4">
                      <div className="h-full w-1/3 bg-white rounded-full" />
                    </div>
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="text-white hover:scale-110 transition-transform"
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative w-full max-w-2xl aspect-square bg-black rounded-lg overflow-hidden shadow-2xl">
                {/* Photo Placeholder */}
                {currentItem.thumbnailUrl ? (
                  <img
                    src={currentItem.thumbnailUrl}
                    alt={currentItem.caption || 'Photo'}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                    <Camera className="w-16 h-16 text-white/30 mb-4" />
                    <p className="text-white/50 text-sm">Photo placeholder</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Next Button */}
          {hasMultiple && (
            <button
              onClick={goToNext}
              className="
                absolute right-4 top-1/2 -translate-y-1/2 z-40
                w-10 h-10 rounded-full bg-white/10 hover:bg-white/20
                flex items-center justify-center
                text-white transition-all duration-200
                hover:scale-110 active:scale-95
                backdrop-blur-sm
              "
              aria-label="Next"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Pagination Dots */}
          {hasMultiple && items.length <= 10 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {items.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`
                    w-2 h-2 rounded-full transition-all duration-200
                    ${index === currentIndex 
                      ? 'w-6 bg-white' 
                      : 'bg-white/40 hover:bg-white/60'
                    }
                  `}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Counter for many items */}
          {hasMultiple && items.length > 10 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-white text-sm backdrop-blur-sm">
              {currentIndex + 1} / {items.length}
            </div>
          )}
        </div>

        {/* Sidebar - Details & Actions */}
        <div className="w-full lg:w-96 bg-card border-l border-border flex flex-col max-h-[40vh] lg:max-h-screen">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
              ) : (
                username[0].toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{username}</p>
              <p className="text-xs text-muted-foreground">Original • 2h ago</p>
            </div>
            <IconButton aria-label="More options" variant="ghost" size="sm">
              <MoreHorizontal className="w-5 h-5" />
            </IconButton>
          </div>

          {/* Caption */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="flex gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                ) : (
                  username[0].toUpperCase()
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{username}</span>{' '}
                  <span className="text-muted-foreground">
                    {currentItem.caption || 'No caption provided. This is a placeholder for the media description.'}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
              </div>
            </div>

            {/* Placeholder Comments */}
            <div className="space-y-4 opacity-50">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm"><span className="font-semibold">commenter1</span> Great photo! 🔥</p>
                  <p className="text-xs text-muted-foreground mt-1">1h</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm"><span className="font-semibold">user_two</span> Amazing! 💯</p>
                  <p className="text-xs text-muted-foreground mt-1">45m</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-border p-4">
            {/* Action Buttons */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLiked(!isLiked)}
                  className={`
                    p-2 rounded-lg transition-all duration-200
                    hover:bg-muted active:scale-90
                    ${isLiked ? 'text-red-500' : 'text-foreground'}
                  `}
                  aria-label={isLiked ? 'Unlike' : 'Like'}
                >
                  <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
                </button>
                <button
                  className="p-2 rounded-lg transition-all duration-200 hover:bg-muted active:scale-90 text-foreground"
                  aria-label="Comment"
                >
                  <MessageCircle className="w-6 h-6" />
                </button>
                <button
                  className="p-2 rounded-lg transition-all duration-200 hover:bg-muted active:scale-90 text-foreground"
                  aria-label="Share"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`
                  p-2 rounded-lg transition-all duration-200
                  hover:bg-muted active:scale-90
                  ${isSaved ? 'text-primary' : 'text-foreground'}
                `}
                aria-label={isSaved ? 'Unsave' : 'Save'}
              >
                <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Likes count */}
            <p className="text-sm font-semibold text-foreground mb-2">
              {isLiked ? '1,235' : '1,234'} likes
            </p>

            {/* Comment Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add a comment..."
                className="
                  flex-1 bg-transparent text-sm text-foreground
                  placeholder:text-muted-foreground
                  focus:outline-none
                "
              />
              <Button variant="ghost" size="sm" className="text-primary font-semibold">
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

