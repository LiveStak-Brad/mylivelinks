'use client';

import { memo } from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonAvatar, SkeletonText } from '@/components/ui/Skeleton';

/* =============================================================================
   FEED SKELETON COMPONENT
   
   Loading skeleton for the public feed page.
   Shows placeholder UI while content is loading.
   
   @example
   <FeedSkeleton />
   <FeedSkeletonList count={5} />
============================================================================= */

export interface FeedSkeletonProps {
  /** Show media placeholder */
  showMedia?: boolean;
  /** Media aspect ratio */
  mediaAspect?: 'square' | 'video' | 'portrait';
  /** Additional className */
  className?: string;
}

/* -----------------------------------------------------------------------------
   Single Post Skeleton
----------------------------------------------------------------------------- */
const FeedSkeleton = memo(function FeedSkeleton({
  showMedia = true,
  mediaAspect = 'video',
  className = '',
}: FeedSkeletonProps) {
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <SkeletonAvatar size="md" />
        
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
      
      {/* Content */}
      <div className="px-4 pb-3">
        <SkeletonText lines={2} />
      </div>
      
      {/* Media */}
      {showMedia && (
        <Skeleton className={`w-full ${aspectClasses[mediaAspect]} rounded-none`} />
      )}
      
      {/* Actions */}
      <div className="flex items-center justify-around border-t border-border mx-4 py-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </Card>
  );
});

FeedSkeleton.displayName = 'FeedSkeleton';

/* -----------------------------------------------------------------------------
   Composer Skeleton
----------------------------------------------------------------------------- */
const FeedComposerSkeleton = memo(function FeedComposerSkeleton({
  className = '',
}: { className?: string }) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="p-4 sm:p-5">
        {/* Composer trigger area */}
        <div className="flex items-center gap-3 mb-4">
          <SkeletonAvatar size="md" />
          <Skeleton className="flex-1 h-11 rounded-xl" />
        </div>
        
        {/* Divider */}
        <div className="h-px bg-border/60 mb-3" />
        
        {/* Action buttons */}
        <div className="flex items-center justify-around">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    </Card>
  );
});

FeedComposerSkeleton.displayName = 'FeedComposerSkeleton';

/* -----------------------------------------------------------------------------
   Feed Skeleton List
   
   Multiple post skeletons for loading states.
----------------------------------------------------------------------------- */
export interface FeedSkeletonListProps {
  /** Number of skeleton items to show */
  count?: number;
  /** Additional className */
  className?: string;
}

const FeedSkeletonList = memo(function FeedSkeletonList({
  count = 3,
  className = '',
}: FeedSkeletonListProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <FeedSkeleton
          key={index}
          showMedia={index % 2 === 0}
          mediaAspect={index === 0 ? 'video' : 'square'}
        />
      ))}
    </div>
  );
});

FeedSkeletonList.displayName = 'FeedSkeletonList';

export { FeedSkeleton, FeedComposerSkeleton, FeedSkeletonList };

