'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WatchTabSelector } from './WatchTabSelector';
import { WatchModeIndicator } from './WatchModeIndicator';
import { WatchContentItem, type WatchItemData } from './WatchContentItem';

export type WatchSwipeMode = 'default' | 'live-only' | 'creator-only';

interface WatchScreenProps {
  items?: WatchItemData[];
  loading?: boolean;
  className?: string;
  onTabChange?: (tab: string) => void;
  currentTab?: string;
  currentMode?: WatchSwipeMode;
  onModeChange?: (mode: WatchSwipeMode, creatorProfileId?: string | null) => void;
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
  currentMode = 'default',
  onModeChange,
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
  
  // Mode change toast state
  const [modeToast, setModeToast] = useState<string | null>(null);
  const modeToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Horizontal swipe detection state
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  // Watch renders INSIDE the app shell - header and bottom nav remain visible
  // Content area accounts for header (top) and bottom nav (bottom) spacing

  // Keyboard navigation (Up/Down arrows, j/k for vim-style)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!scrollContainerRef.current || items.length === 0) return;

      // Skip keyboard navigation when user is typing in an input field
      const activeElement = document.activeElement;
      const isTyping = activeElement instanceof HTMLInputElement ||
                       activeElement instanceof HTMLTextAreaElement ||
                       activeElement?.getAttribute('contenteditable') === 'true';

      // For j/k keys, only handle if not typing
      if ((e.key === 'j' || e.key === 'k') && isTyping) {
        return; // Let the input handle the key
      }

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

  // Get currently visible item based on scroll position
  const getCurrentVisibleItem = useCallback((): WatchItemData | null => {
    if (items.length === 0) return null;
    const index = Math.max(0, Math.min(currentIndexRef.current, items.length - 1));
    return items[index] || null;
  }, [items]);

  // Show mode toast briefly
  const showModeToast = useCallback((message: string) => {
    if (modeToastTimeoutRef.current) {
      clearTimeout(modeToastTimeoutRef.current);
    }
    setModeToast(message);
    modeToastTimeoutRef.current = setTimeout(() => {
      setModeToast(null);
    }, 800);
  }, []);

  // Handle arrow click for desktop mode switching
  // Left = "back" direction, Right = "forward" direction
  // From All: Left → Live Only, Right → Creator Only
  // From Live Only: Right → back to All
  // From Creator Only: Left → back to All
  const handleArrowClick = useCallback((direction: 'left' | 'right') => {
    if (!onModeChange) return;
    
    if (direction === 'left') {
      if (currentMode === 'creator-only') {
        // In Creator Only, left goes back to All
        onModeChange('default');
        showModeToast('ALL');
      } else if (currentMode === 'default') {
        // In All, left goes to Live Only
        onModeChange('live-only');
        showModeToast('LIVE ONLY');
      }
      // If already in live-only, left does nothing (can't go further left)
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // direction === 'right'
      if (currentMode === 'live-only') {
        // In Live Only, right goes back to All
        onModeChange('default');
        showModeToast('ALL');
      } else if (currentMode === 'default') {
        // In All, right goes to Creator Only
        const currentItem = getCurrentVisibleItem();
        if (currentItem) {
          const creatorId = (currentItem as any).authorId || currentItem.id;
          onModeChange('creator-only', creatorId);
          showModeToast(`${currentItem.displayName || currentItem.username}'s CONTENT`);
        }
      }
      // If already in creator-only, right does nothing (can't go further right)
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentMode, onModeChange, getCurrentVisibleItem, showModeToast]);

  // Horizontal swipe handlers
  // Thresholds: dx >= 60px, dx > dy * 1.5 (to distinguish from vertical scroll)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!swipeStartRef.current || !onModeChange) {
      swipeStartRef.current = null;
      return;
    }

    const dx = e.clientX - swipeStartRef.current.x;
    const dy = e.clientY - swipeStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Check if this is a horizontal swipe (threshold: 60px, angle ratio: 1.5)
    // Swipe LEFT (finger moves right to left, dx < 0) = Live Only
    // Swipe RIGHT (finger moves left to right, dx > 0) = Creator Only
    // Opposite swipe goes back to All
    if (absDx >= 60 && absDx > absDy * 1.5) {
      if (dx < 0) {
        // Swipe LEFT (finger right to left) = Live Only
        if (currentMode === 'creator-only') {
          // In Creator Only, swipe left goes back to All
          onModeChange('default');
          showModeToast('ALL');
        } else if (currentMode === 'default') {
          // In All, swipe left goes to Live Only
          onModeChange('live-only');
          showModeToast('LIVE ONLY');
        }
        // If in live-only, can't go further left
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Swipe RIGHT (finger left to right) = Creator Only
        if (currentMode === 'live-only') {
          // In Live Only, swipe right goes back to All
          onModeChange('default');
          showModeToast('ALL');
        } else if (currentMode === 'default') {
          // In All, swipe right goes to Creator Only
          const currentItem = getCurrentVisibleItem();
          if (currentItem) {
            const creatorId = (currentItem as any).authorId || currentItem.id;
            onModeChange('creator-only', creatorId);
            showModeToast(`${currentItem.displayName || currentItem.username}'s CONTENT`);
          }
        }
        // If in creator-only, can't go further right
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    swipeStartRef.current = null;
  }, [currentMode, onModeChange, getCurrentVisibleItem, showModeToast]);

  const handlePointerCancel = useCallback(() => {
    swipeStartRef.current = null;
  }, []);

  return (
    <div className={`watch-screen ${className}`}>
      {/* Top UI Layer */}
      <div className="watch-screen-top-ui">
        <WatchTabSelector 
          activeTab={currentTab as any}
          onTabChange={onTabChange}
        />
        {/* Mode indicator is non-interactive; only shows when in live-only or creator-only mode */}
        <WatchModeIndicator mode={currentMode} />
      </div>

      {/* Mode change toast */}
      {modeToast && (
        <div className="watch-mode-toast" aria-live="polite">
          {modeToast}
        </div>
      )}

      {/* Desktop mode arrows (hidden on touch devices) */}
      <button
        className="watch-mode-arrow watch-mode-arrow-left"
        onClick={() => handleArrowClick('left')}
        aria-label="Live Only mode"
        title="Live Only"
      >
        <ChevronLeft className="w-8 h-8" />
      </button>
      <button
        className="watch-mode-arrow watch-mode-arrow-right"
        onClick={() => handleArrowClick('right')}
        aria-label="Creator Only mode"
        title="Creator Only"
      >
        <ChevronRight className="w-8 h-8" />
      </button>

      {/* Scrollable Content */}
      <div
        ref={scrollContainerRef}
        className="watch-screen-scroll"
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
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
