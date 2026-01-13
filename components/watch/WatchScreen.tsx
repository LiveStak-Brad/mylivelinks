'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { WatchTabSelector } from './WatchTabSelector';
import { WatchModeIndicator } from './WatchModeIndicator';
import { WatchContentItem, type WatchItemData } from './WatchContentItem';

interface WatchScreenProps {
  items?: WatchItemData[];
  loading?: boolean;
  className?: string;
  onTabChange?: (tab: string) => void;
  currentTab?: string;
  onLike?: (postId: string) => void;
  onLiveLike?: (profileId: string) => void;
  onFavorite?: (postId: string) => void;
  onRepost?: (postId: string) => void;
  onShare?: (item: WatchItemData) => void;
  onProfileClick?: (username: string) => void;
  onFollow?: (profileId: string) => void;
  onComment?: (postId: string) => void;
  onGift?: (item: WatchItemData) => void;
  onCreate?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

/**
 * Watch Screen
 * 
 * Full-screen TikTok-style vertical scroll feed.
 * Features:
 * - Scroll-snap vertical navigation (one item per viewport)
 * - Top tab selector (Trending | New | Nearby | Following | For You)
 * - Mode indicator (All | Live Only | Creator Only)
 * - Keyboard support (Up/Down arrows)
 * 
 * UI only - no data fetching or mode switching logic.
 */
export function WatchScreen({ 
  items = [], 
  loading = false,
  className = '',
  onTabChange,
  currentTab,
  onLike,
  onLiveLike,
  onFavorite,
  onRepost,
  onShare,
  onProfileClick,
  onFollow,
  onComment,
  onGift,
  onCreate,
  onLoadMore,
  hasMore = false,
}: WatchScreenProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentIndexRef = useRef(0);
  // Global mute state - persists across all videos in the feed
  const [globalMuted, setGlobalMuted] = useState(true);

  // Watch renders INSIDE the app shell - header and bottom nav remain visible
  // Content area accounts for header (top) and bottom nav (bottom) spacing

  // Keyboard navigation (Up/Down arrows)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!scrollContainerRef.current || items.length === 0) return;

      const container = scrollContainerRef.current;
      const itemHeight = container.clientHeight;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const nextIndex = Math.min(currentIndexRef.current + 1, items.length - 1);
        container.scrollTo({
          top: nextIndex * itemHeight,
          behavior: 'smooth',
        });
        currentIndexRef.current = nextIndex;
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const prevIndex = Math.max(currentIndexRef.current - 1, 0);
        container.scrollTo({
          top: prevIndex * itemHeight,
          behavior: 'smooth',
        });
        currentIndexRef.current = prevIndex;
      }
    },
    [items.length]
  );

  // Track scroll position to update current index and trigger infinite scroll
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const itemHeight = container.clientHeight;
    const scrollTop = container.scrollTop;
    currentIndexRef.current = Math.round(scrollTop / itemHeight);

    // Infinite scroll: load more when near bottom (within 2 items)
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;
    
    if (scrollBottom < itemHeight * 2 && onLoadMore && hasMore && !loading) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, loading]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className={`watch-screen ${className}`}>
      {/* Top UI Layer */}
      <div className="watch-screen-top-ui">
        <WatchTabSelector 
          activeTab={currentTab as any}
          onTabChange={onTabChange}
        />
        {/* Mode indicator is non-interactive; only shows when in live-only or creator-only mode */}
        {/* Modes are switched via horizontal swipe (not implemented yet) */}
        <WatchModeIndicator mode="default" />
      </div>

      {/* Scrollable Content */}
      <div
        ref={scrollContainerRef}
        className="watch-screen-scroll"
        onScroll={handleScroll}
      >
        {loading ? (
          <div className="watch-screen-empty">
            <div className="watch-screen-empty-content">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
              <p className="text-white/60 text-sm">Loading</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="watch-screen-empty">
            <div className="watch-screen-empty-content">
              <div className="watch-screen-empty-icon">📺</div>
              <h3>No content yet</h3>
              <p>Use the + button on the right to upload your first video</p>
            </div>
          </div>
        ) : (
          items.map((item) => (
            <WatchContentItem
              key={item.id}
              item={item}
              globalMuted={globalMuted}
              onMuteToggle={() => setGlobalMuted(!globalMuted)}
              onAvatarClick={() => onProfileClick?.(item.username)}
              onFollowClick={() => onFollow?.(item.id)}
              onLikeClick={() => {
                if (item.type === 'live') {
                  // For live streams, use live like handler (counts towards trending)
                  onLiveLike?.((item as any).authorId || item.id);
                } else {
                  onLike?.((item as any).postId || item.id);
                }
              }}
              onCommentClick={() => {
                if (item.type === 'live') {
                  // For live streams, navigate to live room to comment
                  window.location.href = `/live/${item.username}`;
                } else {
                  onComment?.((item as any).postId || item.id);
                }
              }}
              onGiftClick={() => onGift?.(item)}
              onFavoriteClick={() => onFavorite?.((item as any).postId || item.id)}
              onShareClick={() => onShare?.(item)}
              onRepostClick={() => onRepost?.((item as any).postId || item.id)}
              onCreateClick={onCreate}
              onUsernameClick={() => onProfileClick?.(item.username)}
            />
          ))
        )}
      </div>

      {/* Keyboard hint (desktop only) */}
      <div className="watch-screen-keyboard-hint">
        <span>↑↓</span> to navigate
      </div>
    </div>
  );
}

export default WatchScreen;
