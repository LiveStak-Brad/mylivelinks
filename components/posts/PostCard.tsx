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
    md: 'w-10 h-10',
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-primary/60 to-accent/60 flex items-center justify-center`}
    >
      <span className="text-white font-semibold text-sm">?</span>
    </div>
  );
}

/** Comment preview row */
function CommentPreviewRow() {
  return (
    <div className="flex items-start gap-2 py-2">
      <AvatarPlaceholder size="sm" />
      <div className="flex-1 bg-muted rounded-2xl px-3 py-2">
        <span className="font-semibold text-sm text-foreground">Commenter</span>
        <p className="text-sm text-muted-foreground">This is a preview comment...</p>
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
        flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
        font-medium text-sm transition-all duration-200
        hover:bg-muted active:scale-[0.98]
        ${active ? activeColor : 'text-muted-foreground hover:text-foreground'}
      `}
    >
      <Icon className="w-5 h-5" />
      <span className="hidden sm:inline">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs">({count})</span>
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
    <Card className={`overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <div className="flex-shrink-0">
          {avatar || <AvatarPlaceholder />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground truncate">{displayName}</h4>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="truncate">{username}</span>
            <span>·</span>
            <span className="flex-shrink-0">{timestamp}</span>
          </div>
        </div>
        
        <button
          onClick={onMore}
          className="flex-shrink-0 p-1.5 -mr-1.5 rounded-full hover:bg-muted transition-colors"
        >
          <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
      
      {/* Content */}
      {content && (
        <div className="px-4 pb-3">
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      )}
      
      {/* Media */}
      {media && (
        <MediaPlaceholder type={media.type} aspectRatio={media.aspectRatio} />
      )}
      
      {/* Stats row */}
      {(likeCount > 0 || commentCount > 0 || shareCount > 0) && (
        <div className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            {likeCount > 0 && (
              <>
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Heart className="w-3 h-3 text-white fill-white" />
                </div>
                <span>{likeCount}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {commentCount > 0 && <span>{commentCount} comments</span>}
            {shareCount > 0 && <span>{shareCount} shares</span>}
          </div>
        </div>
      )}
      
      {/* Actions */}
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
      
      {/* Comment Preview Section */}
      {showCommentPreview && (
        <div className="px-4 pb-3 border-t border-border">
          {Array.from({ length: commentPreviewCount }).map((_, i) => (
            <CommentPreviewRow key={i} />
          ))}
          <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mt-1">
            View more comments
          </button>
        </div>
      )}
    </Card>
  );
});

PostCard.displayName = 'PostCard';

export { PostCard, AvatarPlaceholder, MediaPlaceholder };

