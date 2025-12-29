'use client';

import { memo } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

/* =============================================================================
   POST CARD COMPONENT
   
   Facebook-style post card with header, content, media, and action buttons.
   
   @example
   <PostCard
     avatar={<AvatarPlaceholder />}
     displayName="User Name"
     timestamp="2 hours ago"
     content="This is my post content"
     media={{ type: 'image', aspectRatio: 'video' }}
   />
============================================================================= */

export interface PostCardProps {
  /** Avatar element or placeholder */
  avatar?: React.ReactNode;
  /** Display name */
  displayName?: string;
  /** Username handle */
  username?: string;
  /** Timestamp string */
  timestamp?: string;
  /** Post text content */
  content?: string;
  /** Media attachment */
  media?: {
    type: 'image' | 'video';
    aspectRatio?: 'square' | 'video' | 'portrait';
  };
  /** Like count */
  likeCount?: number;
  /** Comment count */
  commentCount?: number;
  /** Share count */
  shareCount?: number;
  /** Show comment preview section */
  showCommentPreview?: boolean;
  /** Number of comment previews to show */
  commentPreviewCount?: 1 | 2;
  /** Additional className */
  className?: string;
  /** Click handlers (UI only) */
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onMore?: () => void;
}

/** Avatar placeholder component */
function AvatarPlaceholder({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-primary/60 to-accent/60 flex items-center justify-center ring-1 ring-gray-200 dark:ring-gray-700`}
    >
      <span className="text-white font-semibold text-sm">?</span>
    </div>
  );
}

/** Comment preview row */
function CommentPreviewRow() {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <AvatarPlaceholder size="sm" />
      <div className="flex-1 bg-muted/50 rounded-2xl px-3.5 py-2.5">
        <span className="font-semibold text-[15px] text-foreground">Commenter</span>
        <p className="text-[15px] text-foreground mt-0.5">This is a preview comment...</p>
      </div>
    </div>
  );
}

/** Media placeholder */
function MediaPlaceholder({ 
  type, 
  aspectRatio = 'video' 
}: { 
  type: 'image' | 'video'; 
  aspectRatio?: 'square' | 'video' | 'portrait'; 
}) {
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
  };
  
  return (
    <div 
      className={`
        ${aspectClasses[aspectRatio]} 
        bg-gradient-to-br from-muted to-muted/50 
        flex items-center justify-center
        relative overflow-hidden
      `}
    >
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 10px,
          currentColor 10px,
          currentColor 11px
        )`
      }} />
      
      <div className="text-muted-foreground/50 flex flex-col items-center gap-2">
        {type === 'video' ? (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
        <span className="text-xs font-medium uppercase tracking-wider">
          {type === 'video' ? 'Video' : 'Image'}
        </span>
      </div>
    </div>
  );
}

/** Action button for post actions */
function ActionButton({
  icon: Icon,
  label,
  count,
  onClick,
  active = false,
  activeColor = 'text-primary',
}: {
  icon: React.ElementType;
  label: string;
  count?: number;
  onClick?: () => void;
  active?: boolean;
  activeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg
        font-semibold text-[15px] transition-all duration-150
        hover:bg-muted/60 active:scale-95
        ${active ? activeColor : 'text-muted-foreground'}
      `}
    >
      <Icon className="w-[22px] h-[22px]" />
      <span className="hidden sm:inline">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="font-medium text-sm">({count})</span>
      )}
    </button>
  );
}

const PostCard = memo(function PostCard({
  avatar,
  displayName = 'Display Name',
  username = '@username',
  timestamp = 'Just now',
  content,
  media,
  likeCount = 0,
  commentCount = 0,
  shareCount = 0,
  showCommentPreview = false,
  commentPreviewCount = 1,
  className = '',
  onLike,
  onComment,
  onShare,
  onMore,
}: PostCardProps) {
  return (
    <Card className={`overflow-hidden hover:shadow-md transition-shadow ${className}`}>
      {/* Header - Instagram/Facebook Style */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-shrink-0">
          {avatar || <AvatarPlaceholder />}
        </div>
        
        <div className="flex-1 min-w-0 leading-tight">
          <div className="font-semibold text-[15px] text-foreground truncate">{displayName}</div>
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <span className="truncate">{username}</span>
            <span>·</span>
            <span className="flex-shrink-0">{timestamp}</span>
          </div>
        </div>
        
        {typeof onMore === 'function' ? (
          <button
            onClick={onMore}
            className="flex-shrink-0 p-2 -mr-2 rounded-full hover:bg-muted/60 transition-colors"
            aria-label="More options"
          >
            <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
          </button>
        ) : null}
      </div>
      
      {/* Content - Larger Font Like Facebook/Instagram */}
      {content && (
        <div className="px-4 pb-3">
          <p className="text-[15px] leading-[1.5] text-foreground whitespace-pre-wrap">{content}</p>
        </div>
      )}
      
      {/* Media - Full Width No Padding */}
      {media && (
        <div className="w-full">
          <MediaPlaceholder type={media.type} aspectRatio={media.aspectRatio} />
        </div>
      )}
      
      {/* Stats row */}
      {(likeCount > 0 || commentCount > 0 || shareCount > 0) && (
        <div className="flex items-center justify-between px-4 py-2.5 text-[13px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {likeCount > 0 && (
              <>
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-sm">
                  <Heart className="w-3 h-3 text-white fill-white" />
                </div>
                <span className="font-medium">{likeCount}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 font-medium">
            {commentCount > 0 && <span>{commentCount} comments</span>}
            {shareCount > 0 && <span>{shareCount} shares</span>}
          </div>
        </div>
      )}
      
      {/* Actions - Clean Facebook/Instagram Style */}
      <div className="border-t border-border">
        <div className="flex items-center px-2 py-1">
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
      </div>
      
      {/* Comment Preview Section */}
      {showCommentPreview && (
        <div className="px-4 pb-3 pt-2 border-t border-border">
          {Array.from({ length: commentPreviewCount }).map((_, i) => (
            <CommentPreviewRow key={i} />
          ))}
          <button className="text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors mt-2">
            View more comments
          </button>
        </div>
      )}
    </Card>
  );
});

PostCard.displayName = 'PostCard';

export { PostCard, AvatarPlaceholder, MediaPlaceholder };




