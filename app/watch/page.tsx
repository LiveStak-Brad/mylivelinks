'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WatchScreen } from '@/components/watch/WatchScreen';
import { CommentModal } from '@/components/CommentModal';
import { ShareModal } from '@/components/ShareModal';
import GiftModal from '@/components/GiftModal';
import { UploadModal } from '@/components/watch/UploadModal';
import { useWatchFeed, type WatchTab, type WatchMode } from '@/hooks/useWatchFeed';
import type { WatchSwipeMode } from '@/components/watch/WatchScreen';
import { createClient } from '@/lib/supabase';
import '@/styles/watch.css';

// Wake Lock hook to keep screen on during video watching
function useWakeLock() {
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('[WakeLock] Screen wake lock acquired');
        }
      } catch (err) {
        console.log('[WakeLock] Failed to acquire:', err);
      }
    };
    
    // Request wake lock on mount
    requestWakeLock();
    
    // Re-acquire wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().then(() => {
          console.log('[WakeLock] Screen wake lock released');
        });
      }
    };
  }, []);
}

/* =============================================================================
   WATCH PAGE
   
   TikTok-style full-viewport vertical scroll feed.
   Route: /watch
   
   Now wired to real data via rpc_get_watch_feed RPC.
   Actions (like, favorite, repost) persist to database.
   
   Layout Zones:
   ┌─────────────────────────────────────────┐
   │  TOP: Tab Selector + Mode Indicator     │
   │  (Trending | New | Nearby | Following | For You)
   │  (All | Live Only | Creator Only)       │
   ├────────────────────────────────┬────────┤
   │                                │ Avatar │
   │                                │ Follow │
   │                                │ Like   │
   │      CONTENT AREA              │ Comment│
   │      (Full Viewport)           │ Fave   │
   │      Scroll-snap vertical      │ Share  │
   │                                │ Repost │
   │                                │ Create │
   ├────────────────────────────────┴────────┤
   │  BOTTOM: Caption Overlay                │
   │  @username • Title • Caption • #tags    │
   │  📍 Location                            │
   └─────────────────────────────────────────┘
   
============================================================================= */

export default function WatchPage() {
  // Keep screen on while watching videos
  useWakeLock();
  
  const router = useRouter();
  const supabase = createClient();
  const [commentModalPostId, setCommentModalPostId] = useState<string | null>(null);
  const [shareModalItem, setShareModalItem] = useState<any | null>(null);
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [giftTarget, setGiftTarget] = useState<any>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  
  const { 
    items, 
    loading, 
    setTab,
    currentTab,
    setMode,
    currentMode,
    loadMore,
    hasMore,
    optimisticLike,
    optimisticFavorite,
    optimisticRepost,
  } = useWatchFeed();

  // Map WatchSwipeMode (UI) to WatchMode (hook)
  const mapSwipeModeToHookMode = (swipeMode: WatchSwipeMode): WatchMode => {
    if (swipeMode === 'live-only') return 'live_only';
    if (swipeMode === 'creator-only') return 'creator_only';
    return 'all';
  };

  // Map WatchMode (hook) to WatchSwipeMode (UI)
  const mapHookModeToSwipeMode = (hookMode: WatchMode): WatchSwipeMode => {
    if (hookMode === 'live_only') return 'live-only';
    if (hookMode === 'creator_only') return 'creator-only';
    return 'default';
  };

  // Handle tab change from WatchTabSelector
  const handleTabChange = useCallback((tab: string) => {
    setTab(tab as WatchTab);
  }, [setTab]);

  // Handle mode change from horizontal swipe
  const handleModeChange = useCallback((swipeMode: WatchSwipeMode, creatorProfileId?: string | null) => {
    const hookMode = mapSwipeModeToHookMode(swipeMode);
    setMode(hookMode, creatorProfileId);
  }, [setMode]);

  // Handle like action - toggle like/unlike for posts
  const handleLike = useCallback(async (postId: string) => {
    if (!postId) return;
    
    // Optimistic update - show change immediately
    optimisticLike(postId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if already liked
      const { data: existing } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('post_id', postId)
        .eq('profile_id', user.id)
        .maybeSingle();

      if (existing) {
        // Unlike - remove the like
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('profile_id', user.id);
      } else {
        // Like - add the like
        await supabase
          .from('post_likes')
          .insert({ post_id: postId, profile_id: user.id });
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      // Revert optimistic update on error
      optimisticLike(postId);
    }
  }, [supabase, router, optimisticLike]);

  // Handle like action for live streams - uses rpc_live_like_toggle
  const handleLiveLike = useCallback(async (profileId: string) => {
    if (!profileId) return;
    
    // Optimistic update - show change immediately (use profileId as item id for live streams)
    optimisticLike(profileId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Get the active live stream for this profile
      const { data: liveStream } = await supabase
        .from('live_streams')
        .select('id')
        .eq('profile_id', profileId)
        .is('ended_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!liveStream) {
        console.error('No active live stream found for profile:', profileId);
        // Revert optimistic update
        optimisticLike(profileId);
        return;
      }

      // Toggle like using the trending system RPC
      const { data, error } = await supabase.rpc('rpc_live_like_toggle', {
        p_stream_id: liveStream.id,
        p_profile_id: user.id,
      });

      if (error) {
        console.error('Error toggling live like:', error);
        // Revert optimistic update on error
        optimisticLike(profileId);
      }
    } catch (err) {
      console.error('Error toggling live like:', err);
      // Revert optimistic update on error
      optimisticLike(profileId);
    }
  }, [supabase, router, optimisticLike]);

  // Handle favorite action
  const handleFavorite = useCallback(async (postId: string) => {
    if (!postId) return;
    
    // Optimistic update - show change immediately
    optimisticFavorite(postId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase.rpc('rpc_toggle_favorite', {
        p_post_id: postId,
      });

      if (error) {
        console.error('Error toggling favorite:', error);
        // Revert optimistic update on error
        optimisticFavorite(postId);
      }
      
      return data?.favorited;
    } catch (err) {
      console.error('Error favoriting post:', err);
      // Revert optimistic update on error
      optimisticFavorite(postId);
    }
  }, [supabase, router, optimisticFavorite]);

  // Handle repost action
  const handleRepost = useCallback(async (postId: string) => {
    if (!postId) return;
    
    // Optimistic update - show change immediately
    optimisticRepost(postId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase.rpc('rpc_toggle_repost', {
        p_post_id: postId,
      });

      if (error) {
        console.error('Error toggling repost:', error);
      }
      
      return data?.reposted;
    } catch (err) {
      console.error('Error reposting:', err);
    }
  }, [supabase, router, optimisticRepost]);

  // Handle share action - open ShareModal
  const handleShare = useCallback((item: any) => {
    setShareModalItem(item);
  }, []);

  // Handle avatar/profile click
  const handleProfileClick = useCallback((username: string) => {
    router.push(`/${username}`);
  }, [router]);

  // Handle follow action
  const handleFollow = useCallback(async (profileId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Use follows table
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, followee_id: profileId });

      if (error && error.code !== '23505') { // Ignore duplicate key error
        console.error('Error following:', error);
      }
    } catch (err) {
      console.error('Error following:', err);
    }
  }, [supabase, router]);

  // Handle comment click - open modal
  const handleComment = useCallback((postId: string) => {
    setCommentModalPostId(postId);
  }, []);

  // Handle gift click - open gift modal directly
  const handleGift = useCallback((item: any) => {
    setGiftTarget(item);
    setGiftModalOpen(true);
  }, []);

  // Handle comment gift - open gift modal directly
  const handleCommentGift = useCallback((comment: any) => {
    setGiftTarget(comment);
    setGiftModalOpen(true);
  }, []);

  // Handle create click (+) - open upload modal
  const handleCreate = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUploadModalOpen(true);
  }, [supabase, router]);

  return (
    <>
      <WatchScreen
        items={items}
        loading={loading}
        currentTab={currentTab}
        currentMode={mapHookModeToSwipeMode(currentMode)}
        onTabChange={handleTabChange}
        onModeChange={handleModeChange}
        onLike={handleLike}
        onLiveLike={handleLiveLike}
        onFavorite={handleFavorite}
        onRepost={handleRepost}
        onShare={handleShare}
        onProfileClick={handleProfileClick}
        onFollow={handleFollow}
        onComment={handleComment}
        onGift={handleGift}
        onCreate={handleCreate}
        onLoadMore={loadMore}
        hasMore={hasMore}
      />
      
      <CommentModal
        postId={commentModalPostId || ''}
        isOpen={!!commentModalPostId}
        onClose={() => setCommentModalPostId(null)}
        onGift={handleCommentGift}
      />

      {shareModalItem && (
        <ShareModal
          isOpen={!!shareModalItem}
          onClose={() => setShareModalItem(null)}
          item={shareModalItem}
        />
      )}

      {giftModalOpen && giftTarget && (
        <GiftModal
          recipientId={giftTarget.author?.id || giftTarget.id}
          recipientUsername={giftTarget.author?.username || giftTarget.username}
          postId={giftTarget.postId}
          commentId={giftTarget.text_content ? giftTarget.id : undefined}
          onGiftSent={() => {
            setGiftModalOpen(false);
            setGiftTarget(null);
          }}
          onClose={() => {
            setGiftModalOpen(false);
            setGiftTarget(null);
          }}
        />
      )}

      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </>
  );
}
