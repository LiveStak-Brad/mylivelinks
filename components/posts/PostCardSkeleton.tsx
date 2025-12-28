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
      
      {/* Stats row */}
      <div className="flex items-center justify-between px-4 py-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-around border-t border-border mx-4 py-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      
      {/* Comment Preview Section */}
      {showCommentPreview && (
        <div className="px-4 pb-3 border-t border-border pt-3">
          <div className="flex items-start gap-2">
            <SkeletonAvatar size="sm" />
            <Skeleton className="flex-1 h-12 rounded-2xl" />
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




