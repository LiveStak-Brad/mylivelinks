'use client';

import { memo } from 'react';
import { Image as ImageIcon, Video, Smile, Sparkles, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

/* =============================================================================
   FEED COMPOSER COMPONENT (DISABLED STATE)
   
   A beautiful, intentionally disabled post composer for the global public feed.
   Designed to feel like a preview of upcoming functionality, not broken.
   
   All interactive elements are disabled with visual cues.
   
   @example
   <FeedComposer />
============================================================================= */

export interface FeedComposerProps {
  /** Additional className */
  className?: string;
}

/* -----------------------------------------------------------------------------
   Disabled Action Button
   
   Individual action button in disabled state with muted styling.
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

const FeedComposer = memo(function FeedComposer({
  className = '',
}: FeedComposerProps) {
  return (
    <Card className={`overflow-hidden ${className}`}>
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
              Share something with the community...
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
        <div className="mt-4 pt-3 border-t border-border/40">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60">
              <Sparkles className="w-3.5 h-3.5 text-primary/60" aria-hidden="true" />
              <span className="font-medium">Post creation coming soon</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

FeedComposer.displayName = 'FeedComposer';

export { FeedComposer };

