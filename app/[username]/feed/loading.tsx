import { Card, Skeleton, SkeletonAvatar, SkeletonText } from '@/components/ui';

/* =============================================================================
   FEED LOADING STATE
   
   Displayed via Next.js App Router Suspense while the feed page is loading.
   Uses design system skeleton components for consistency.
============================================================================= */

function ComposerSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <SkeletonAvatar size="md" />
          <Skeleton className="h-10 flex-1 rounded-full" />
        </div>
        <div className="h-px bg-border mb-2" />
        <div className="flex items-center justify-around">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    </Card>
  );
}

function PostCardSkeleton({ showMedia = true }: { showMedia?: boolean }) {
  return (
    <Card className="overflow-hidden">
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
        <Skeleton className="w-full aspect-video rounded-none" />
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
    </Card>
  );
}

export default function FeedLoading() {
  return (
    <div className="min-h-[calc(100vh-7rem)] bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Page header skeleton */}
        <div className="mb-2">
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        
        {/* Composer skeleton */}
        <ComposerSkeleton />
        
        {/* Post card skeletons */}
        <PostCardSkeleton showMedia={true} />
        <PostCardSkeleton showMedia={false} />
        <PostCardSkeleton showMedia={true} />
      </div>
    </div>
  );
}
