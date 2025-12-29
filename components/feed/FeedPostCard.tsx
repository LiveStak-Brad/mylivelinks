'use client';

import { memo } from 'react';
import { Heart, MessageCircle, Gift, MoreHorizontal, Coins } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { getAvatarUrl } from '@/lib/defaultAvatar';
import ClipActions from '@/components/ClipActions';
import SafeRichText from '@/components/SafeRichText';

/* =============================================================================
   FEED POST CARD COMPONENT
   
   Presentational post card for the global public feed.
   Displays a single post with author info, content, media, and action buttons.
   
   UI ONLY - No API calls, no fake counts, no mock data.
   This component receives all data via props and renders it.
   
   @example
   <FeedPostCard
     authorName="Creator Name"
     authorUsername="username"
     authorAvatar={<Avatar />}
     content="This is my post content"
     timestamp="2 hours ago"
   />
============================================================================= */

export interface FeedPostCardProps {
  /** Author's display name */
  authorName: string;
  /** Author's username handle (without @) */
  authorUsername: string;
  /** Author's avatar URL */
  authorAvatarUrl?: string | null;
  /** Post text content */
  content?: string;
  /** Timestamp as Date or ISO string */
  timestamp?: string | Date;
  /** Media attachment element (image/video) */
  media?: React.ReactNode;
  /** If true, show clip completion actions instead of standard actions */
  isClipCompletion?: boolean;
  /** Clip ID (if isClipCompletion is true) */
  clipId?: string;
  /** Total coins gifted to this post */
  coinCount?: number;
  /** Whether current user liked this post */
  isLiked?: boolean;
  /** Callback when like button clicked */
  onLike?: () => void;
  /** Callback when comment button clicked */
  onComment?: () => void;
  /** Callback when gift button clicked */
  onGift?: () => void;
  /** Callback when more options clicked */
  onMore?: () => void;
  /** Callback when profile photo/username clicked */
  onProfileClick?: () => void;
  /** Callback when clip action is triggered */
  onClipAction?: (action: 'post' | 'save' | 'post-save' | 'composer') => void;
  /** Additional className */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/* -----------------------------------------------------------------------------
   Format Timestamp
   
   Formats timestamp in "Month Day • HH:MM AM/PM" format.
----------------------------------------------------------------------------- */
function formatTimestamp(timestamp?: string | Date): string {
  if (!timestamp) return 'Just now';
  
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    if (isNaN(date.getTime())) return 'Just now';
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
    
    return `${month} ${day} • ${hours}:${minutesStr} ${ampm}`;
  } catch {
    return 'Just now';
  }
}

/* -----------------------------------------------------------------------------
   Default Avatar Placeholder
   
   Shown when no avatar is provided.
----------------------------------------------------------------------------- */
function DefaultAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const imgSrc = getAvatarUrl(avatarUrl);
  
  return (
    <div 
      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
      aria-hidden="true"
    >
      <img 
        src={imgSrc} 
        alt={`${name}'s avatar`} 
        className="w-full h-full object-cover"
      />
    </div>
  );
}

/* -----------------------------------------------------------------------------
   Action Button
   
   Reusable action button for like, comment, gift.
----------------------------------------------------------------------------- */
function ActionButton({
  icon: Icon,
  label,
  count,
  isActive,
  onClick,
  variant = 'default',
}: {
  icon: React.ElementType;
  label: string;
  count?: number;
  isActive?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'gift' | 'coins';
}) {
  const getStyles = () => {
    if (variant === 'gift') {
      return 'text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30';
    }
    if (variant === 'coins') {
      return 'text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600';
    }
    if (isActive) {
      return 'text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-950/30';
    }
    return 'text-muted-foreground hover:text-foreground hover:bg-muted';
  };

  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
        font-medium text-sm transition-all duration-200
        active:scale-[0.98]
        ${getStyles()}
      `}
      aria-label={label}
    >
      <Icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} aria-hidden="true" />
      {count !== undefined && count > 0 && (
        <span className={variant === 'coins' ? 'font-bold' : ''}>{count}</span>
      )}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

const FeedPostCard = memo(function FeedPostCard({
  authorName,
  authorUsername,
  authorAvatarUrl,
  content,
  timestamp,
  media,
  isClipCompletion = false,
  clipId,
  coinCount = 0,
  isLiked = false,
  onLike,
  onComment,
  onGift,
  onMore,
  onProfileClick,
  onClipAction,
  className = '',
  style,
}: FeedPostCardProps) {
  const formattedTimestamp = formatTimestamp(timestamp);
  
  return (
    <Card className={`overflow-hidden ${className}`} style={style}>
      {/* Header - New Format: Avatar + Username + Date/Time */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <div 
          className="flex-shrink-0"
          onClick={onProfileClick}
          role={onProfileClick ? 'button' : undefined}
          tabIndex={onProfileClick ? 0 : undefined}
        >
          <DefaultAvatar name={authorName} avatarUrl={authorAvatarUrl} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div 
            className={`font-bold text-foreground truncate ${onProfileClick ? 'cursor-pointer hover:underline' : ''}`}
            onClick={onProfileClick}
            role={onProfileClick ? 'button' : undefined}
            tabIndex={onProfileClick ? 0 : undefined}
          >
            {authorName}
          </div>
          <time className="text-sm text-muted-foreground">{formattedTimestamp}</time>
        </div>
        
        {typeof onMore === 'function' ? (
          <button
            onClick={onMore}
            className="flex-shrink-0 p-1.5 -mr-1.5 rounded-full hover:bg-muted transition-colors"
            aria-label="More options"
          >
            <MoreHorizontal className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      
      {/* Content */}
      {content && (
        <div className="px-4 pb-3">
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
            <SafeRichText text={content} className="whitespace-pre-wrap" showLinkPreview={true} />
          </p>
        </div>
      )}
      
      {/* Media */}
      {media && (
        <div className="relative">
          {media}
        </div>
      )}
      
      {/* Actions */}
      {isClipCompletion ? (
        // Clip Completion Actions
        <div className="px-4 py-4 border-t border-border">
          <ClipActions
            clipId={clipId}
            onAction={onClipAction}
            variant="horizontal"
            compact={false}
          />
        </div>
      ) : (
        // Standard Post Actions - New Format: Like | Gift | Coin Count | Comments
        <div className="flex items-center border-t border-border mx-4 py-1">
          <ActionButton
            icon={Heart}
            label="Like"
            onClick={onLike}
            isActive={isLiked}
          />
          <ActionButton
            icon={Gift}
            label="Gift"
            onClick={onGift}
            variant="gift"
          />
          {coinCount > 0 && (
            <ActionButton
              icon={Coins}
              label="Coins"
              count={coinCount}
              variant="coins"
            />
          )}
          <ActionButton
            icon={MessageCircle}
            label="Comment"
            onClick={onComment}
          />
        </div>
      )}
    </Card>
  );
});

FeedPostCard.displayName = 'FeedPostCard';

export { FeedPostCard };

