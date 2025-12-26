'use client';

import { memo } from 'react';
import { Globe, Sparkles, Users, Zap, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';

/* =============================================================================
   FEED EMPTY STATE COMPONENT (Global Public Feed)
   
   Beautiful, intentional empty state for the global public feed.
   Designed to feel welcoming and hint at upcoming features without
   implying anything is broken.
   
   Different from the profile feed empty state - this is for the
   community-wide public feed at /feed.
   
   @example
   <FeedEmptyState />
============================================================================= */

export interface FeedEmptyStateProps {
  /** Additional className */
  className?: string;
}

const FeedEmptyState = memo(function FeedEmptyState({
  className = '',
}: FeedEmptyStateProps) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="flex flex-col items-center justify-center text-center py-12 px-6 sm:py-16 sm:px-8">
        {/* Decorative icon cluster */}
        <div className="relative mb-8" aria-hidden="true">
          {/* Main icon container */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 flex items-center justify-center shadow-sm border border-primary/10">
            <Globe className="w-12 h-12 sm:w-14 sm:h-14 text-primary/70" strokeWidth={1.5} />
          </div>
          
          {/* Floating accent badges */}
          <div 
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-md animate-pulse-soft"
            style={{ animationDuration: '3s' }}
          >
            <Users className="w-4 h-4 text-white" />
          </div>
          <div 
            className="absolute -bottom-1 -left-3 w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md animate-pulse-soft"
            style={{ animationDuration: '4s', animationDelay: '1s' }}
          >
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
        
        {/* Title with personality */}
        <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3 tracking-tight">
          The community feed is getting ready
        </h3>
        
        {/* Warm, friendly description */}
        <p className="text-muted-foreground text-sm sm:text-base max-w-md leading-relaxed mb-6">
          Soon this will be the place to discover posts, updates, and moments from creators across the platform. We're putting the finishing touches on something special.
        </p>
        
        {/* Coming Soon indicator - feels intentional, not broken */}
        <div 
          className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-muted to-muted/80 border border-border/50"
          role="status"
          aria-label="Feature coming soon"
        >
          <div className="relative">
            <Clock className="w-4 h-4 text-primary" />
            <Sparkles className="w-2.5 h-2.5 text-accent absolute -top-1 -right-1" />
          </div>
          <span className="text-sm font-medium text-foreground">
            Public feed launching soon
          </span>
        </div>
        
        {/* Subtle progress indicator */}
        <div className="flex items-center gap-1.5 mt-8" aria-hidden="true">
          <div 
            className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse-soft" 
            style={{ animationDelay: '0ms' }} 
          />
          <div 
            className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" 
            style={{ animationDelay: '200ms' }} 
          />
          <div 
            className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse-soft" 
            style={{ animationDelay: '400ms' }} 
          />
        </div>
      </div>
    </Card>
  );
});

FeedEmptyState.displayName = 'FeedEmptyState';

export { FeedEmptyState };
export type { FeedEmptyStateProps };

