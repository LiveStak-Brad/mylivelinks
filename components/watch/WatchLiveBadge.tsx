'use client';

import { Eye } from 'lucide-react';

interface WatchLiveBadgeProps {
  viewerCount?: number;
  className?: string;
}

/**
 * LIVE Badge Component
 * 
 * Displays a pulsing red LIVE indicator with optional viewer count.
 * Used on WatchContentItem when content type is 'live'.
 */
export function WatchLiveBadge({ viewerCount = 0, className = '' }: WatchLiveBadgeProps) {
  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className={`watch-live-badge ${className}`}>
      <div className="watch-live-badge-pill">
        <span className="watch-live-badge-dot" />
        <span className="watch-live-badge-text">LIVE</span>
      </div>
      {viewerCount > 0 && (
        <div className="watch-live-badge-viewers">
          <Eye className="w-3 h-3" />
          <span>{formatCount(viewerCount)}</span>
        </div>
      )}
    </div>
  );
}

export default WatchLiveBadge;
