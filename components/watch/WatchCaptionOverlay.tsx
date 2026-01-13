'use client';

import { useState } from 'react';
import { MapPin, ChevronDown, ChevronUp, Eye } from 'lucide-react';

interface WatchCaptionOverlayProps {
  username: string;
  displayName?: string;
  title?: string;
  caption?: string;
  hashtags?: string[];
  location?: string;
  viewCount?: number;
  isLive?: boolean;
  onUsernameClick?: () => void;
  onHashtagClick?: (hashtag: string) => void;
  onLocationClick?: () => void;
  className?: string;
}

const MAX_CAPTION_LENGTH = 80;

/**
 * Watch Caption Overlay
 * 
 * Bottom overlay showing content metadata.
 * Includes: @username, title, caption, hashtags, location
 * Supports "...more" expansion for long captions.
 * 
 * UI only - no navigation logic.
 */
export function WatchCaptionOverlay({
  username,
  displayName,
  title,
  caption = '',
  hashtags = [],
  location,
  viewCount = 0,
  isLive = false,
  onUsernameClick,
  onHashtagClick,
  onLocationClick,
  className = '',
}: WatchCaptionOverlayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const shouldTruncate = caption.length > MAX_CAPTION_LENGTH;
  const displayCaption = isExpanded || !shouldTruncate
    ? caption
    : `${caption.slice(0, MAX_CAPTION_LENGTH)}`;

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <div className={`watch-caption-overlay ${className}`}>
      {/* Tap to enter hint for live streams */}
      {isLive && (
        <div className="text-gray-400 text-xs text-center mb-1">
          tap to enter
        </div>
      )}
      
      {/* Display Name + View Count */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onUsernameClick}
          className="watch-caption-username"
        >
          {displayName || username}
        </button>
        {viewCount > 0 && (
          <span className="flex items-center gap-1 text-white/70 text-sm">
            <Eye className="w-4 h-4" />
            {formatCount(viewCount)}
          </span>
        )}
      </div>

      {/* Title */}
      {title && (
        <h3 className="watch-caption-title">{title}</h3>
      )}

      {/* Caption with expand */}
      {caption && (
        <div className="watch-caption-text-wrap">
          <p className="watch-caption-text">
            {displayCaption}
            {shouldTruncate && !isExpanded && (
              <button
                type="button"
                onClick={toggleExpand}
                className="watch-caption-more"
              >
                ...more
              </button>
            )}
          </p>
          {isExpanded && shouldTruncate && (
            <button
              type="button"
              onClick={toggleExpand}
              className="watch-caption-less"
            >
              <ChevronUp className="w-4 h-4" />
              <span>less</span>
            </button>
          )}
        </div>
      )}

      {/* Hashtags */}
      {hashtags.length > 0 && (
        <div className="watch-caption-hashtags">
          {hashtags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onHashtagClick?.(tag)}
              className="watch-caption-hashtag"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Location */}
      {location && (
        <button
          type="button"
          onClick={onLocationClick}
          className="watch-caption-location"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>{location}</span>
        </button>
      )}
    </div>
  );
}

export default WatchCaptionOverlay;
