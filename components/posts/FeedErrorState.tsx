'use client';

import { memo } from 'react';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/* =============================================================================
   FEED ERROR STATE COMPONENT
   
   Error state component for feed loading failures.
   
   @example
   <FeedErrorState onRetry={() => refetch()} />
============================================================================= */

export interface FeedErrorStateProps {
  /** Error title */
  title?: string;
  /** Error description */
  description?: string;
  /** Error type for different icons */
  type?: 'generic' | 'network' | 'permission';
  /** Retry callback */
  onRetry?: () => void;
  /** Additional className */
  className?: string;
}

const FeedErrorState = memo(function FeedErrorState({
  title = 'Failed to load posts',
  description = 'Something went wrong while loading the feed. Please try again.',
  type = 'generic',
  onRetry,
  className = '',
}: FeedErrorStateProps) {
  const icons = {
    generic: AlertCircle,
    network: WifiOff,
    permission: AlertCircle,
  };
  
  const Icon = icons[type];

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="flex flex-col items-center justify-center text-center py-12 px-6">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-destructive" />
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground max-w-xs mb-6">
          {description}
        </p>
        
        {/* Retry button */}
        {onRetry && (
          <Button
            variant="outline"
            size="md"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Try again
          </Button>
        )}
      </div>
    </Card>
  );
});

FeedErrorState.displayName = 'FeedErrorState';

export { FeedErrorState };







