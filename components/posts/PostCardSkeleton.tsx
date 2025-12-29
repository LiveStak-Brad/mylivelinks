'use client';

import { memo } from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonAvatar, SkeletonText } from '@/components/ui/Skeleton';

/* =============================================================================
   POST CARD SKELETON COMPONENT
   
   Loading skeleton for post cards, matching the PostCard structure.
   
   @example
   <PostCardSkeleton showMedia />
============================================================================= */

export interface PostCardSkeletonProps {
  /** Show media placeholder */
  showMedia?: boolean;
  /** Media aspect ratio */
  mediaAspect?: 'square' | 'video' | 'portrait';
  /** Show comment preview section */
  showCommentPreview?: boolean;
  /** Additional className */
  className?: string;
}

const PostCardSkeleton = memo(function PostCardSkeleton({
  showMedia = true,
  mediaAspect = 'video',
  showCommentPreview = false,
  className = '',
}: PostCardSkeletonProps) {
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
  };

  return (
    <Card className={`overflow-hidden animate-pulse ${className}`}>
      {/* Header - Instagram/Facebook Style */}
      <div className="flex items-center gap-3 px-4 py-3">
        <SkeletonAvatar size="md" className="w-11 h-11" />
        
        <div className="flex-1 space-y-2">
          <Skeleton className="h-[15px] w-32 rounded-md" />
          <Skeleton className="h-[13px] w-28 rounded-md" />
        </div>
        
        <Skeleton className="w-9 h-9 rounded-full" />
      </div>
      
      {/* Content - Larger Font Skeleton */}
      <div className="px-4 pb-3 space-y-2">
        <Skeleton className="h-[15px] w-full rounded-md" />
        <Skeleton className="h-[15px] w-4/5 rounded-md" />
      </div>
      
      {/* Media - Full Width */}
      {showMedia && (
        <Skeleton className={`w-full ${aspectClasses[mediaAspect]} rounded-none`} />
      )}
      
      {/* Stats row */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <Skeleton className="h-4 w-16 rounded-md" />
        <Skeleton className="h-4 w-24 rounded-md" />
      </div>
      
      {/* Actions - Cleaner Skeleton */}
      <div className="border-t border-border">
        <div className="flex items-center px-2 py-1 gap-1">
          <Skeleton className="flex-1 h-10 rounded-lg" />
          <Skeleton className="flex-1 h-10 rounded-lg" />
          <Skeleton className="flex-1 h-10 rounded-lg" />
        </div>
      </div>
      
      {/* Comment Preview Section */}
      {showCommentPreview && (
        <div className="px-4 pb-3 pt-2 border-t border-border">
          <div className="flex items-start gap-2">
            <SkeletonAvatar size="sm" />
            <Skeleton className="flex-1 h-14 rounded-2xl" />
          </div>
        </div>
      )}
    </Card>
  );
});

PostCardSkeleton.displayName = 'PostCardSkeleton';

/** Multiple post skeletons for loading states */
function PostCardSkeletonList({
  count = 3,
  className = '',
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <PostCardSkeleton
          key={index}
          showMedia={index % 2 === 0}
          mediaAspect={index === 0 ? 'video' : 'square'}
          showCommentPreview={index === 0}
        />
      ))}
    </div>
  );
}

PostCardSkeletonList.displayName = 'PostCardSkeletonList';

export { PostCardSkeleton, PostCardSkeletonList };







