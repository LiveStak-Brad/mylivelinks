'use client';

import { memo } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
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
  /** Author's avatar element */
  authorAvatar?: React.ReactNode;
  /** Post text content */
  content?: string;
  /** Formatted timestamp string */
  timestamp?: string;
  /** Media attachment element (image/video) */
  media?: React.ReactNode;
  /** If true, show clip completion actions instead of standard actions */
  isClipCompletion?: boolean;
  /** Clip ID (if isClipCompletion is true) */
  clipId?: string;
  /** Callback when like button clicked */
  onLike?: () => void;
  /** Callback when comment button clicked */
  onComment?: () => void;
  /** Callback when share button clicked */
  onShare?: () => void;
  /** Callback when more options clicked */
  onMore?: () => void;
  /** Callback when clip action is triggered */
  onClipAction?: (action: 'post' | 'save' | 'post-save' | 'composer') => void;
  /** Additional className */
  className?: string;
}

/* -----------------------------------------------------------------------------
   Default Avatar Placeholder
   
   Shown when no avatar is provided.
----------------------------------------------------------------------------- */
function DefaultAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initial = name.charAt(0).toUpperCase();
  const imgSrc = getAvatarUrl(avatarUrl);
  
  return (
    <div 
      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
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
   
   Reusable action button for like, comment, share.
----------------------------------------------------------------------------- */
function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="
        flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
        font-medium text-sm transition-all duration-200
        text-muted-foreground hover:text-foreground hover:bg-muted
        active:scale-[0.98]
      "
      aria-label={label}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

const FeedPostCard = memo(function FeedPostCard({
  authorName,
  authorUsername,
  authorAvatar,
  content,
  timestamp = 'Just now',
  media,
  isClipCompletion = false,
  clipId,
  onLike,
  onComment,
  onShare,
  onMore,
  onClipAction,
  className = '',
}: FeedPostCardProps) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <div className="flex-shrink-0">
          {authorAvatar || <DefaultAvatar name={authorName} />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground truncate">{authorName}</h4>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="truncate">@{authorUsername}</span>
            <span aria-hidden="true">·</span>
            <time className="flex-shrink-0">{timestamp}</time>
          </div>
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
        // Standard Post Actions
        <div className="flex items-center border-t border-border mx-4 py-1">
          <ActionButton
            icon={Heart}
            label="Like"
            onClick={onLike}
          />
          <ActionButton
            icon={MessageCircle}
            label="Comment"
            onClick={onComment}
          />
          <ActionButton
            icon={Share2}
            label="Share"
            onClick={onShare}
          />
        </div>
      )}
    </Card>
  );
});

FeedPostCard.displayName = 'FeedPostCard';

export { FeedPostCard };

