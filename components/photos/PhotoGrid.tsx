'use client';

import { ReactNode } from 'react';
import { Play, Film, Camera } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

/* =============================================================================
   PHOTO GRID COMPONENT
   
   Instagram-style grid layout for photos and videos.
   Supports loading skeleton, empty states, and video badges.
   
   @example
   <PhotoGrid
     items={mediaItems}
     onItemClick={(item, index) => openViewer(index)}
   />
============================================================================= */

export interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  thumbnailUrl?: string;
  caption?: string;
}

export interface PhotoGridProps {
  /** Array of media items to display */
  items: MediaItem[];
  /** Callback when an item is clicked */
  onItemClick?: (item: MediaItem, index: number) => void;
  /** Loading state - shows skeleton grid */
  isLoading?: boolean;
  /** Number of skeleton items to show when loading */
  skeletonCount?: number;
  /** Empty state configuration */
  emptyState?: {
    icon?: ReactNode;
    title: string;
    description?: string;
  };
  /** Additional className */
  className?: string;
}

export function PhotoGrid({
  items,
  onItemClick,
  isLoading = false,
  skeletonCount = 12,
  emptyState = {
    title: 'No photos yet',
    description: 'Photos and videos will appear here',
  },
  className = '',
}: PhotoGridProps) {
  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0.5 sm:gap-1 ${className}`}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <div key={index} className="aspect-square relative">
            <Skeleton 
              className="absolute inset-0 rounded-none"
              animation="shimmer"
              style={{ animationDelay: `${index * 50}ms` }}
            />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <EmptyState
        icon={emptyState.icon || <Camera className="w-8 h-8" />}
        title={emptyState.title}
        description={emptyState.description}
        size="lg"
        className={className}
      />
    );
  }

  return (
    <div className={`grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0.5 sm:gap-1 ${className}`}>
      {items.map((item, index) => (
        <PhotoGridItem
          key={item.id}
          item={item}
          onClick={() => onItemClick?.(item, index)}
        />
      ))}
    </div>
  );
}

/* -----------------------------------------------------------------------------
   Photo Grid Item
----------------------------------------------------------------------------- */

interface PhotoGridItemProps {
  item: MediaItem;
  onClick?: () => void;
}

function PhotoGridItem({ item, onClick }: PhotoGridItemProps) {
  return (
    <button
      onClick={onClick}
      className="
        aspect-square relative group overflow-hidden
        bg-muted transition-transform duration-200
        hover:z-10 focus:z-10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset
        active:scale-[0.98]
      "
      aria-label={item.caption || `View ${item.type}`}
    >
      {/* Thumbnail or Placeholder */}
      {item.thumbnailUrl ? (
        <img
          src={item.thumbnailUrl}
          alt={item.caption || ''}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/10 flex items-center justify-center">
          {item.type === 'video' ? (
            <Film className="w-8 h-8 text-muted-foreground/50" />
          ) : (
            <Camera className="w-8 h-8 text-muted-foreground/50" />
          )}
        </div>
      )}

      {/* Video Play Badge */}
      {item.type === 'video' && (
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1.5 shadow-lg">
          <Play className="w-3 h-3 text-white fill-white" />
        </div>
      )}

      {/* Hover Overlay */}
      <div className="
        absolute inset-0 bg-black/0 group-hover:bg-black/20 
        transition-colors duration-200
        flex items-center justify-center
      ">
        <div className="
          opacity-0 group-hover:opacity-100 
          transform scale-75 group-hover:scale-100
          transition-all duration-200
        ">
          {item.type === 'video' ? (
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 text-foreground fill-foreground ml-0.5" />
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

/* -----------------------------------------------------------------------------
   Photo Grid Skeleton - Standalone skeleton for external use
----------------------------------------------------------------------------- */

export function PhotoGridSkeleton({ 
  count = 12, 
  className = '' 
}: { 
  count?: number; 
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0.5 sm:gap-1 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="aspect-square relative">
          <Skeleton 
            className="absolute inset-0 rounded-none"
            animation="shimmer"
            style={{ animationDelay: `${index * 50}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

export type { MediaItem as PhotoGridMediaItem };


