'use client';

import { useParams } from 'next/navigation';
import { Image as ImageIcon, Video, Smile, Sparkles, Lock, Rss } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { FeedEmptyState } from '@/components/posts';

/* =============================================================================
   FEED PAGE
   
   Facebook-style feed page for user profiles.
   Route: /[username]/feed
   
   UI ONLY - No backend wiring, no data fetching.
   
   Current state: Empty state (no posts exist yet)
   All interactive elements are disabled with "Coming soon" indicators.
   
   Design Notes:
   - Composer feels intentionally locked, not broken
   - Empty state feels welcoming and hints at upcoming features
   - Typography and spacing follow design system rhythm
   - Fully accessible with proper ARIA labels
============================================================================= */

/* -----------------------------------------------------------------------------
   Disabled Composer Card
   
   Visual placeholder for post creation. All actions disabled.
   Designed to feel intentional - a preview of what's coming.
----------------------------------------------------------------------------- */
function DisabledComposerCard() {
  return (
    <Card className="overflow-hidden relative group">
      <CardContent className="p-4 sm:p-5">
        {/* Composer trigger area */}
        <div className="flex items-center gap-3 mb-4">
          {/* Avatar placeholder with gradient */}
          <div 
            className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 flex items-center justify-center flex-shrink-0 border border-primary/10"
            aria-hidden="true"
          >
            <span className="text-base font-semibold text-primary/50">✦</span>
          </div>
          
          {/* Input placeholder - styled as locked, not broken */}
          <div
            className="
              flex-1 flex items-center justify-between
              px-4 py-3 rounded-xl
              bg-muted/60 border border-border/50
              cursor-not-allowed select-none
            "
            role="textbox"
            aria-disabled="true"
            aria-label="Post composer - Coming soon"
          >
            <span className="text-muted-foreground/70 text-sm sm:text-base">
              What's on your mind?
            </span>
            <Lock className="w-4 h-4 text-muted-foreground/40 ml-2" aria-hidden="true" />
          </div>
        </div>
        
        {/* Divider */}
        <div className="h-px bg-border/60 mb-3" aria-hidden="true" />
        
        {/* Disabled action buttons row */}
        <div 
          className="flex items-center justify-around"
          role="group"
          aria-label="Post creation options - Coming soon"
        >
          <DisabledActionButton 
            icon={ImageIcon} 
            label="Photo" 
            iconColor="text-green-500/40" 
          />
          <DisabledActionButton 
            icon={Video} 
            label="Video" 
            iconColor="text-red-500/40" 
          />
          <DisabledActionButton 
            icon={Smile} 
            label="Feeling" 
            iconColor="text-amber-500/40" 
          />
        </div>
        
        {/* Coming soon badge - subtle, intentional */}
        <div className="mt-4 pt-3 border-t border-border/40" aria-hidden="true">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60">
              <Sparkles className="w-3.5 h-3.5 text-primary/60" />
              <span className="font-medium">Post creation coming soon</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -----------------------------------------------------------------------------
   Disabled Action Button
   
   Individual action button in disabled state.
----------------------------------------------------------------------------- */
function DisabledActionButton({ 
  icon: Icon, 
  label, 
  iconColor 
}: { 
  icon: React.ElementType; 
  label: string; 
  iconColor: string;
}) {
  return (
    <div
      className="
        flex items-center gap-2 px-3 py-2.5 rounded-lg
        text-sm font-medium text-muted-foreground/50
        cursor-not-allowed select-none
        transition-colors duration-150
      "
      role="button"
      aria-disabled="true"
      aria-label={`${label} - Coming soon`}
    >
      <Icon className={`w-5 h-5 ${iconColor}`} aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

/* -----------------------------------------------------------------------------
   Feed Page Component
----------------------------------------------------------------------------- */
export default function FeedPage() {
  const params = useParams();
  const username = params.username as string;

  return (
    <div className="min-h-[calc(100vh-7rem)] bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        
        {/* Page header with icon */}
        <header className="mb-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <Rss className="w-5 h-5 text-primary" aria-hidden="true" />
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              @{username}'s Feed
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground ml-7">
            Posts, updates, and thoughts
          </p>
        </header>
        
        {/* Disabled composer */}
        <div className="animate-slide-up" style={{ animationDelay: '50ms' }}>
          <DisabledComposerCard />
        </div>
        
        {/* Empty state - default since no backend */}
        <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <FeedEmptyState isOwnProfile={false} displayName={username} />
        </div>
        
        {/* Bottom padding for mobile safe area */}
        <div className="h-8 sm:h-4" aria-hidden="true" />
      </div>
    </div>
  );
}
