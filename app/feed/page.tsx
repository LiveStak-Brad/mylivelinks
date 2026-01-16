'use client';

import { Rss } from 'lucide-react';
import PublicFeedClient from '@/components/feed/PublicFeedClient';
import { LinkOrNahPromoCard } from '@/components/link/LinkOrNahPromoCard';
import { MllProHero } from '@/components/mll-pro/MllProHero';

/* =============================================================================
   PUBLIC FEED PAGE
   
   Global community feed page.
   Route: /feed
   
   UI ONLY - No backend wiring, no data fetching, no mock data.
   
   Current state: Empty state (no posts exist yet)
   Composer is disabled with "Coming soon" indicators.
   
   Design Notes:
   - Composer feels intentionally locked, not broken
   - Empty state feels welcoming and hints at upcoming features
   - Typography and spacing follow design system rhythm
   - Fully accessible with proper ARIA labels
   - Responsive design for mobile and desktop
============================================================================= */

export default function FeedPage() {
  return (
    <main 
      id="main"
      className="min-h-[calc(100vh-7rem)] bg-background pb-20 md:pb-8"
    >
      {/* Wide mode: at 2xl+ expands to wider container, below 2xl stays max-w-2xl */}
      <div className="max-w-2xl 2xl:max-w-6xl mx-auto px-4 sm:px-6 2xl:px-10 py-6 sm:py-8 space-y-5">
        
        {/* Page header with icon */}
        <header className="mb-4 animate-fade-in">
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

        <div className="animate-slide-up" style={{ animationDelay: '25ms' }}>
          <MllProHero />
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '50ms' }}>
          <LinkOrNahPromoCard />
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '75ms' }}>
          <PublicFeedClient />
        </div>
        
        {/* Bottom padding for mobile safe area */}
        <div className="h-8 sm:h-4" aria-hidden="true" />
      </div>
    </main>
  );
}

