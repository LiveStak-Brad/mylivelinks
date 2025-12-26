import { Rss } from 'lucide-react';
import { FeedComposerSkeleton, FeedSkeletonList } from '@/components/feed';

/* =============================================================================
   FEED PAGE LOADING STATE
   
   Loading skeleton for the public feed page.
   Shown while the page is loading.
============================================================================= */

export default function FeedLoading() {
  return (
    <main 
      id="main"
      className="min-h-[calc(100vh-7rem)] bg-background"
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        
        {/* Page header */}
        <header className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Rss className="w-5 h-5 text-primary" aria-hidden="true" />
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Public Feed
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground ml-7">
            Discover posts from the community
          </p>
        </header>
        
        {/* Composer skeleton */}
        <FeedComposerSkeleton />
        
        {/* Post skeletons */}
        <FeedSkeletonList count={3} />
        
        {/* Bottom padding for mobile safe area */}
        <div className="h-8 sm:h-4" aria-hidden="true" />
      </div>
    </main>
  );
}

