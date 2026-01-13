'use client';

import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Repeat2,
  Plus,
  UserPlus,
  Gift,
} from 'lucide-react';

interface WatchActionStackProps {
  avatarUrl?: string;
  username?: string;
  isFollowing?: boolean;
  isLive?: boolean;
  likeCount?: number;
  commentCount?: number;
  favoriteCount?: number;
  shareCount?: number;
  repostCount?: number;
  giftCount?: number;
  isLiked?: boolean;
  isFavorited?: boolean;
  onAvatarClick?: () => void;
  onFollowClick?: () => void;
  onLikeClick?: () => void;
  onCommentClick?: () => void;
  onGiftClick?: () => void;
  onFavoriteClick?: () => void;
  onShareClick?: () => void;
  onRepostClick?: () => void;
  onCreateClick?: () => void;
  className?: string;
}

/**
 * Watch Action Stack
 * 
 * Right-side vertical action buttons matching TikTok layout.
 * All buttons have 44px minimum touch targets.
 * 
 * Stack (top to bottom):
 * - Avatar + Follow badge
 * - Like (heart)
 * - Comment
 * - Favorite (bookmark)
 * - Share
 * - Repost
 * - Create (+)
 */
export function WatchActionStack({
  avatarUrl,
  username = 'user',
  isFollowing = false,
  isLive = false,
  likeCount = 0,
  commentCount = 0,
  favoriteCount = 0,
  shareCount = 0,
  repostCount = 0,
  giftCount = 0,
  isLiked = false,
  isFavorited = false,
  onAvatarClick,
  onFollowClick,
  onLikeClick,
  onCommentClick,
  onGiftClick,
  onFavoriteClick,
  onShareClick,
  onRepostClick,
  onCreateClick,
  className = '',
}: WatchActionStackProps) {
  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    if (count === 0) return '';
    return count.toString();
  };

  const fallbackAvatar = username.charAt(0).toUpperCase();

  return (
    <div className={`watch-action-stack ${className}`}>
      {/* Avatar + Follow */}
      <div className="watch-action-avatar-wrap">
        <button
          type="button"
          onClick={onAvatarClick}
          className="watch-action-avatar"
          aria-label={`View ${username}'s profile`}
          style={isLive ? {
            border: '3px solid #ff3b5c',
            animation: 'pulse-ring 2s ease-in-out infinite'
          } : undefined}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={username}
              className="watch-action-avatar-img"
            />
          ) : (
            <span className="watch-action-avatar-fallback">{fallbackAvatar}</span>
          )}
        </button>
        {!isFollowing && (
          <button
            type="button"
            onClick={onFollowClick}
            className="watch-action-follow-badge"
            aria-label={`Follow ${username}`}
          >
            <UserPlus className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Like */}
      <button
        type="button"
        onClick={onLikeClick}
        className={`watch-action-btn ${isLiked ? 'watch-action-liked' : ''}`}
        aria-label="Like"
        aria-pressed={isLiked}
      >
        <Heart className={`w-7 h-7 ${isLiked ? 'fill-current' : ''}`} />
        {likeCount > 0 && <span className="watch-action-count">{formatCount(likeCount)}</span>}
      </button>

      {/* Comment */}
      <button
        type="button"
        onClick={onCommentClick}
        className="watch-action-btn"
        aria-label="Comment"
      >
        <MessageCircle className="w-7 h-7" />
        <span className="watch-action-count">{formatCount(commentCount) || '0'}</span>
      </button>

      {/* Gift */}
      <button
        type="button"
        onClick={onGiftClick}
        className="watch-action-btn watch-action-gift"
        aria-label="Send Gift"
      >
        <Gift className="w-7 h-7" />
        {giftCount > 0 && <span className="watch-action-count">{formatCount(giftCount)}</span>}
      </button>

      {/* Favorite */}
      <button
        type="button"
        onClick={onFavoriteClick}
        className={`watch-action-btn ${isFavorited ? 'watch-action-favorited' : ''}`}
        aria-label="Favorite"
        aria-pressed={isFavorited}
      >
        <Bookmark className={`w-7 h-7 ${isFavorited ? 'fill-current' : ''}`} />
        {favoriteCount > 0 && <span className="watch-action-count">{formatCount(favoriteCount)}</span>}
      </button>

      {/* Share */}
      <button
        type="button"
        onClick={onShareClick}
        className="watch-action-btn"
        aria-label="Share"
      >
        <Share2 className="w-7 h-7" />
        {shareCount > 0 && <span className="watch-action-count">{formatCount(shareCount)}</span>}
      </button>

      {/* Repost */}
      <button
        type="button"
        onClick={onRepostClick}
        className="watch-action-btn"
        aria-label="Repost"
      >
        <Repeat2 className="w-7 h-7" />
        {repostCount > 0 && <span className="watch-action-count">{formatCount(repostCount)}</span>}
      </button>

      {/* Create */}
      <button
        type="button"
        onClick={onCreateClick}
        className="watch-action-btn watch-action-create"
        aria-label="Create"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}

export default WatchActionStack;
