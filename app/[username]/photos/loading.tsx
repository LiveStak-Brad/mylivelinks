import { Card, Skeleton } from '@/components/ui';

/* =============================================================================
   PHOTOS LOADING STATE
   
   Displayed via Next.js App Router Suspense while the photos page is loading.
   Uses design system skeleton components for consistency.
============================================================================= */

function StoriesBarSkeleton() {
  return (
    <div className="py-4 border-b border-border">
      <div className="flex items-center gap-4 overflow-x-auto scrollbar-hidden px-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TabNavSkeleton() {
  return (
    <div className="border-b border-border bg-background">
      <div className="flex items-center">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 flex items-center justify-center gap-2 py-3">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-12 hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotoGridSkeleton() {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-0.5 sm:gap-1">
      {Array.from({ length: 12 }).map((_, index) => (
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

export default function PhotosLoading() {
  return (
    <div className="min-h-[calc(100vh-7rem)] bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Page header skeleton */}
        <div className="px-4 py-4 border-b border-border">
          <Skeleton className="h-7 w-40 mb-2" />
          <Skeleton className="h-4 w-28" />
        </div>
        
        {/* Stories bar skeleton */}
        <StoriesBarSkeleton />
        
        {/* Tab navigation skeleton */}
        <TabNavSkeleton />
        
        {/* Photo grid skeleton */}
        <PhotoGridSkeleton />
      </div>
    </div>
  );
}
