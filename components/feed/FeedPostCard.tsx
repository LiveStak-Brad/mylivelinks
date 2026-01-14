'use client';

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Heart, MessageCircle, Gift, Flag, Coins, Pin, MoreHorizontal, Eye, Share2 } from 'lucide-react';
import { PostManagementModal } from './PostManagementModal';
import { Card } from '@/components/ui/Card';
import LiveAvatar from '@/components/LiveAvatar';
import ClipActions from '@/components/ClipActions';
import SafeRichText from '@/components/SafeRichText';
import { PostReactions } from './PostReactions';
import { ReactionPicker, REACTIONS, type ReactionType } from './ReactionPicker';
import UserNameWithBadges from '@/components/shared/UserNameWithBadges';
import { useContentViewTracking } from '@/lib/useContentViewTracking';

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

export type TopGifter = {
  id: string;
  username: string;
  avatar_url: string | null;
  total_coins: number;
};

export interface FeedPostCardProps {
  /** Author's profile ID */
  authorProfileId?: string;
  /** Author's display name */
  authorName: string;
  /** Author's username handle (without @) */
  authorUsername: string;
  /** Author's avatar URL */
  authorAvatarUrl?: string | null;
  /** Is author currently live */
  authorIsLive?: boolean;
  /** Author's gifter status */
  authorGifterStatus?: any;
  /** Feeling emoji (e.g. 😊) */
  feelingEmoji?: string | null;
  /** Feeling label (e.g. "happy") */
  feelingLabel?: string | null;
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
  /** Total diamonds earned from gifts */
  diamondCount?: number;
  /** Top 3 gifters for this post */
  topGifters?: TopGifter[];
  /** Whether current user liked this post */
  isLiked?: boolean;
  /** The reaction emoji selected by the current user */
  userReaction?: ReactionType | null;
  /** Number of likes on this post */
  likesCount?: number;
  /** Number of views on this post */
  viewsCount?: number;
  /** Unique identifier of the post (for reactions modal) */
  postId?: string;
  /** Post type (personal or team) */
  postType?: 'personal' | 'team';
  /** Current user ID */
  currentUserId?: string;
  /** Is current user a moderator (for team posts) */
  isModerator?: boolean;
  /** Post visibility */
  visibility?: 'public' | 'friends' | 'private' | 'members';
  /** Is post pinned */
  isPinned?: boolean;
  /** Callback when like button clicked */
  onLike?: (reactionType?: ReactionType) => void;
  /** Callback when comment button clicked */
  onComment?: () => void;
  /** Callback when gift button clicked */
  onGift?: () => void;
  /** Callback when share button clicked */
  onShare?: () => void;
  /** Callback when more options clicked */
  onMore?: () => void;
  /** Callback when profile photo/username clicked */
  onProfileClick?: () => void;
  /** Callback when clip action is triggered */
  onClipAction?: (action: 'post' | 'save' | 'post-save' | 'composer') => void;
  /** Callback when post is deleted */
  onPostDeleted?: () => void;
  /** Callback when post is updated */
  onPostUpdated?: () => void;
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
   Default Avatar Placeholder - NOW USES LIVE AVATAR
   
   Shown when no avatar is provided.
----------------------------------------------------------------------------- */
function DefaultAvatar({ name, avatarUrl, isLive, username }: { name: string; avatarUrl?: string | null; isLive?: boolean; username: string }) {
  return (
    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      <LiveAvatar
        avatarUrl={avatarUrl}
        username={username}
        displayName={name}
        isLive={isLive}
        size="md"
        showLiveBadge={false}
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
  buttonRef,
  onKeyDown,
  reactionEmoji,
}: {
  icon: React.ElementType;
  label: string;
  count?: number;
  isActive?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: 'default' | 'gift' | 'coins';
  buttonRef?: React.RefObject<HTMLButtonElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>;
  reactionEmoji?: string | null;
}) {
  const getStyles = () => {
    if (variant === 'gift') {
      return 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20';
    }
    if (variant === 'coins') {
      return 'text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600';
    }
    if (isActive) {
      return 'text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/20';
    }
    return 'text-muted-foreground hover:bg-muted/60';
  };

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`
        flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg
        font-semibold text-[15px] transition-all duration-150
        active:scale-95
        ${getStyles()}
      `}
      aria-label={label}
    >
      {reactionEmoji ? (
        <span className="text-2xl" aria-hidden="true">
          {reactionEmoji}
        </span>
      ) : (
        <Icon className={`w-[22px] h-[22px] ${isActive ? 'fill-current' : ''}`} aria-hidden="true" />
      )}
      {count !== undefined && count > 0 && (
        <span className={`${variant === 'coins' ? 'font-bold' : 'font-medium'}`}>{count}</span>
      )}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

const FeedPostCard = memo(function FeedPostCard({
  authorProfileId,
  authorName,
  authorUsername,
  authorAvatarUrl,
  authorIsLive = false,
  authorGifterStatus,
  feelingEmoji,
  feelingLabel,
  content,
  timestamp,
  media,
  isClipCompletion = false,
  clipId,
  coinCount = 0,
  diamondCount = 0,
  topGifters = [],
  isLiked = false,
  likesCount = 0,
  viewsCount = 0,
  userReaction = null,
  postId,
  postType = 'personal',
  currentUserId,
  isModerator = false,
  visibility = 'public',
  isPinned = false,
  onLike,
  onComment,
  onGift,
  onShare,
  onMore,
  onProfileClick,
  onClipAction,
  onPostDeleted,
  onPostUpdated,
  className = '',
  style,
}: FeedPostCardProps) {
  const formattedTimestamp = formatTimestamp(timestamp);
  const [pickerAnchor, setPickerAnchor] = useState<DOMRect | null>(null);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const likeButtonRef = useRef<HTMLButtonElement>(null);
  
  // Track content view automatically
  const { ref: viewTrackingRef } = useContentViewTracking({
    contentType: 'feed_post',
    contentId: postId,
    enabled: !!postId
  });

  const isAuthor = currentUserId && authorProfileId && currentUserId === authorProfileId;
  const canManage = isAuthor || (postType === 'team' && isModerator);

  const activeReaction = useMemo(
    () => (userReaction ? REACTIONS.find((reaction) => reaction.type === userReaction) ?? null : null),
    [userReaction]
  );

  const closeReactionPicker = useCallback(() => setPickerAnchor(null), []);

  const handleLikeButtonClick = useCallback<React.MouseEventHandler<HTMLButtonElement>>(
    (event) => {
      event.preventDefault();
      if (!onLike) return;

      const rect = event.currentTarget.getBoundingClientRect();
      setPickerAnchor(rect);
    },
    [onLike]
  );

  const handleLikeKeyDown = useCallback<React.KeyboardEventHandler<HTMLButtonElement>>(
    (event) => {
      if (!onLike) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;

      event.preventDefault();

      const target = event.currentTarget as HTMLButtonElement;
      setPickerAnchor(target.getBoundingClientRect());
    },
    [onLike]
  );

  const handleReactionSelect = useCallback(
    (reaction: ReactionType) => {
      onLike?.(reaction);
      closeReactionPicker();
    },
    [closeReactionPicker, onLike]
  );

  return (
    <>
      <Card 
        ref={viewTrackingRef}
        className={`overflow-hidden hover:shadow-md transition-shadow ${className}`} 
        style={style}
      >
        {/* Header - Instagram/Facebook Style */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div 
            className="flex-shrink-0"
            onClick={onProfileClick}
            role={onProfileClick ? 'button' : undefined}
            tabIndex={onProfileClick ? 0 : undefined}
          >
            <DefaultAvatar name={authorName} avatarUrl={authorAvatarUrl} isLive={authorIsLive} username={authorUsername} />
          </div>
          
          <div className="flex-1 min-w-0 leading-tight">
            <div className="mb-0.5 flex items-center gap-2 flex-wrap">
              <UserNameWithBadges
                profileId={authorProfileId}
                name={authorName}
                gifterStatus={authorGifterStatus}
                textSize="text-[15px]"
                nameClassName="font-semibold text-foreground"
                clickable={!!onProfileClick}
                onClick={onProfileClick}
              />
              {feelingEmoji && feelingLabel && (
                <span className="text-[14px] text-muted-foreground">
                  is feeling {feelingEmoji} {feelingLabel}
                </span>
              )}
              {isPinned && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  <Pin className="w-3 h-3 text-primary fill-current" />
                  <span className="text-xs font-semibold text-primary">Pinned</span>
                </div>
              )}
            </div>
            <time className="text-[13px] text-muted-foreground">{formattedTimestamp}</time>
          </div>
          
          <div className="flex items-center gap-1">
            {postId && (
              <button
                onClick={() => setShowManagementModal(true)}
                className="flex-shrink-0 p-2 -mr-2 rounded-lg hover:bg-muted/60 transition-colors"
                aria-label="More options"
              >
                <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        
        {/* Content - Larger Font Like Facebook/Instagram */}
        {content && (
          <div className="px-4 pb-3">
            <div className="text-[15px] leading-[1.5] text-foreground whitespace-pre-wrap">
              <SafeRichText text={content} className="whitespace-pre-wrap" showLinkPreview={true} />
            </div>
          </div>
        )}
        
        {/* Media - Full Width No Padding */}
        {media && (
          <div className="relative w-full">
            {media}
          </div>
        )}
        
        {/* Actions - Clean Facebook/Instagram Style */}
        {isClipCompletion ? (
          // Clip Completion Actions
          <div className="px-4 py-3 border-t border-border">
            <ClipActions
              clipId={clipId}
              onAction={onClipAction}
              variant="horizontal"
              compact={false}
            />
          </div>
        ) : (
          // Standard Post Actions
          <>
            <div className="border-t border-border">
              <div className="flex items-center px-2 py-1">
                <ActionButton
                  icon={Heart}
                  label="Like"
                  count={likesCount}
                  onClick={handleLikeButtonClick}
                  onKeyDown={handleLikeKeyDown}
                  isActive={isLiked || !!userReaction}
                  buttonRef={likeButtonRef}
                  reactionEmoji={activeReaction?.emoji ?? null}
                />
                <ActionButton
                  icon={MessageCircle}
                  label="Comment"
                  onClick={onComment}
                />
                <ActionButton
                  icon={Gift}
                  label="Gift"
                  onClick={onGift}
                  variant="gift"
                />
                <ActionButton
                  icon={Share2}
                  label="Share"
                  onClick={onShare}
                />
                {(coinCount > 0 || diamondCount > 0 || topGifters.length > 0) && (
                  <div className="flex items-center gap-2 px-2">
                    {/* Top Gifters Avatars */}
                    {topGifters.length > 0 && (
                      <div className="flex items-center -space-x-2">
                        {topGifters.slice(0, 3).map((gifter, idx) => {
                          const ringColor = idx === 0 ? 'ring-yellow-400' : idx === 1 ? 'ring-gray-300' : 'ring-amber-600';
                          return (
                            <div
                              key={gifter.id}
                              className={`w-7 h-7 rounded-full overflow-hidden ring-2 ${ringColor} bg-muted`}
                              style={{ zIndex: 3 - idx }}
                              title={`${gifter.username}: ${gifter.total_coins} coins`}
                            >
                              <img
                                src={gifter.avatar_url || '/no-profile-pic.png'}
                                alt={gifter.username}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.src = '/no-profile-pic.png'; }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Diamond Count */}
                    {diamondCount > 0 && (
                      <span className="text-sm font-semibold text-purple-500 flex items-center gap-1">
                        💎 {diamondCount.toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t border-border">
              {postId ? (
                <PostReactions postId={postId} totalCount={likesCount ?? 0} viewsCount={viewsCount} />
              ) : (
                <div className="flex items-center px-4 py-2">
                  <span className="font-medium text-sm text-muted-foreground">0 reactions</span>
                  {viewsCount !== undefined && (
                    <div className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Eye className="w-4 h-4" />
                      <span>{viewsCount.toLocaleString()} views</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {pickerAnchor !== null ? (
        <ReactionPicker
          anchorRect={pickerAnchor}
          selectedReaction={userReaction}
          onSelect={handleReactionSelect}
          onClose={closeReactionPicker}
        />
      ) : null}

      {showManagementModal && postId && (
        <PostManagementModal
          postId={postId}
          postType={postType}
          isAuthor={!!isAuthor}
          isModerator={isModerator}
          currentVisibility={visibility}
          isPinned={isPinned}
          onClose={() => setShowManagementModal(false)}
          onPostDeleted={onPostDeleted}
          onPostUpdated={onPostUpdated}
          onReport={onMore}
        />
      )}
    </>
  );
});

FeedPostCard.displayName = 'FeedPostCard';

export { FeedPostCard };

