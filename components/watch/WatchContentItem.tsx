'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { WatchLiveBadge } from './WatchLiveBadge';
import { WatchActionStack } from './WatchActionStack';
import { WatchCaptionOverlay } from './WatchCaptionOverlay';
import { LiveStreamPreview } from './LiveStreamPreview';
import { useViewTracking } from '@/hooks/useViewTracking';

export interface WatchItemData {
  id: string;
  type: 'video' | 'live';
  username: string;
  displayName?: string;
  avatarUrl?: string;
  authorId?: string; // Profile UUID for live stream room name
  isVerified?: boolean;
  isFollowing?: boolean;
  title?: string;
  caption?: string;
  hashtags?: string[];
  location?: string;
  likeCount?: number;
  commentCount?: number;
  favoriteCount?: number;
  shareCount?: number;
  repostCount?: number;
  isLiked?: boolean;
  isFavorited?: boolean;
  viewerCount?: number;
  viewCount?: number; // Total views for videos
  thumbnailUrl?: string;
  mediaUrl?: string;
  gradientFrom?: string;
  gradientTo?: string;
  postId?: string; // For video posts, the actual post ID for actions
}

interface WatchContentItemProps {
  item: WatchItemData;
  globalMuted?: boolean;
  onMuteToggle?: () => void;
  onAvatarClick?: () => void;
  onFollowClick?: () => void;
  onLikeClick?: () => void;
  onCommentClick?: () => void;
  onGiftClick?: () => void;
  onFavoriteClick?: () => void;
  onShareClick?: () => void;
  onRepostClick?: () => void;
  onCreateClick?: () => void;
  onUsernameClick?: () => void;
  onHashtagClick?: (hashtag: string) => void;
  onLocationClick?: () => void;
  className?: string;
}

/**
 * Watch Content Item
 * 
 * Single full-viewport content item for the Watch feed.
 * Displays video placeholder or live stream with all overlays.
 * Uses scroll-snap-align: start for vertical snap scrolling.
 */
export function WatchContentItem({
  item,
  globalMuted = true,
  onMuteToggle,
  onAvatarClick,
  onFollowClick,
  onLikeClick,
  onCommentClick,
  onGiftClick,
  onFavoriteClick,
  onShareClick,
  onRepostClick,
  onCreateClick,
  onUsernameClick,
  onHashtagClick,
  onLocationClick,
  className = '',
}: WatchContentItemProps) {
  const {
    type,
    username,
    displayName,
    avatarUrl,
    isFollowing = false,
    title,
    caption,
    hashtags = [],
    location,
    likeCount = 0,
    commentCount = 0,
    favoriteCount = 0,
    shareCount = 0,
    repostCount = 0,
    isLiked = false,
    isFavorited = false,
    viewerCount = 0,
    viewCount = 0,
    thumbnailUrl,
    gradientFrom = '#1a1a2e',
    gradientTo = '#16213e',
  } = item;

  const isLive = type === 'live';
  const mediaUrl = (item as any).mediaUrl;
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // Detect if media is video based on URL (same logic as feed)
  const isVideo = !!mediaUrl && /(\.mp4|\.webm|\.mov|\.m4v)(\?|$)/i.test(mediaUrl);

  // Track visibility with intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting && entry.intersectionRatio > 0.5);
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Play/pause video based on visibility - stops audio when scrolling away
  useEffect(() => {
    if (!videoRef.current || !isVideo) return;
    
    if (isVisible) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isVisible, isVideo]);

  // Track view when visible
  const postId = (item as any).postId || item.id;
  const itemType = isVideo ? 'video' : isLive ? 'live' : 'photo';
  useViewTracking(postId, itemType, isVisible);

  return (
    <div ref={containerRef} className={`watch-content-item ${className}`}>
      {/* Media Player or Background */}
      {!isLive && mediaUrl ? (
        <>
          {isVideo ? (
            <>
              <video
                ref={videoRef}
                src={mediaUrl}
                className="w-full h-full object-cover"
                loop
                playsInline
                muted={globalMuted}
                autoPlay={false}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <div className="watch-content-gradient-overlay" style={{ pointerEvents: 'none' }} />
              
              {/* Volume Toggle Button - Top Right */}
              <button
                type="button"
                onClick={onMuteToggle}
                className="absolute top-16 right-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 transition"
                aria-label={globalMuted ? 'Unmute' : 'Mute'}
              >
                {globalMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
            </>
          ) : (
            <>
              <img
                src={mediaUrl}
                alt=""
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  backgroundColor: '#000',
                }}
              />
              <div className="watch-content-gradient-overlay" />
            </>
          )}
        </>
      ) : (
        <>
          {/* Background thumbnail as fallback */}
          <div
            className="watch-content-background"
            style={{
              background: thumbnailUrl
                ? `url(${thumbnailUrl}) center/cover no-repeat`
                : `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
            }}
          >
            {/* Gentle edge gradients for live streams */}
            {isLive && (
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to right, rgba(0,0,0,0.3) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.3) 100%), linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.4) 100%)'
                }}
              />
            )}
            {!isLive && <div className="watch-content-gradient-overlay" />}
          </div>
          
          {/* LiveKit video preview for live streams */}
          {isLive && item.authorId && (
            <LiveStreamPreview
              streamerProfileId={item.authorId}
              streamerUsername={username}
              displayName={displayName || username}
            />
          )}
        </>
      )}

      {/* LIVE Badge (top-left) */}
      {isLive && (
        <WatchLiveBadge
          viewerCount={viewerCount}
          className="watch-content-live-badge"
        />
      )}

      {/* Right Action Stack */}
      <WatchActionStack
        avatarUrl={avatarUrl}
        username={username}
        isFollowing={isFollowing}
        isLive={isLive}
        likeCount={likeCount}
        commentCount={commentCount}
        favoriteCount={favoriteCount}
        shareCount={shareCount}
        repostCount={repostCount}
        isLiked={isLiked}
        isFavorited={isFavorited}
        onAvatarClick={onAvatarClick}
        onFollowClick={onFollowClick}
        onLikeClick={onLikeClick}
        onCommentClick={onCommentClick}
        onGiftClick={onGiftClick}
        onFavoriteClick={onFavoriteClick}
        onShareClick={onShareClick}
        onRepostClick={onRepostClick}
        onCreateClick={onCreateClick}
        className="watch-content-actions"
      />

      {/* Bottom Caption Overlay */}
      <WatchCaptionOverlay
        username={username}
        displayName={displayName}
        title={title}
        caption={caption}
        hashtags={hashtags}
        location={location}
        viewCount={isLive ? viewerCount : viewCount}
        isLive={isLive}
        onUsernameClick={onUsernameClick}
        onHashtagClick={onHashtagClick}
        onLocationClick={onLocationClick}
        className="watch-content-caption"
      />
    </div>
  );
}

export default WatchContentItem;
