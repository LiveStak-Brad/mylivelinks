/**
 * Viewer Heartbeat Hook
 * Manages active viewer state with proper cleanup
 */

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

interface UseViewerHeartbeatOptions {
  liveStreamId: number;
  isActive: boolean;
  isUnmuted: boolean;
  isVisible: boolean;
  isSubscribed: boolean;
  enabled?: boolean;
  slotIndex?: number; // CRITICAL: For stable watch session key
  watchSessionKey?: string; // CRITICAL: Stable key (viewer_id + slot_index + live_stream_id)
}

export function useViewerHeartbeat({
  liveStreamId,
  isActive,
  isUnmuted,
  isVisible,
  isSubscribed,
  enabled = true,
  slotIndex,
  watchSessionKey,
}: UseViewerHeartbeatOptions) {
  const supabase = createClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  
  // CRITICAL: Stable watch session key - only changes when slot actually changes streamer
  // Format: viewer_id:slot_index:live_stream_id
  // This prevents cleanup when tile rerenders with same streamer
  const currentWatchKeyRef = useRef<string | null>(null);
  const previousWatchKeyRef = useRef<string | null>(null);
  
  // CRITICAL: Use refs to track values and prevent cleanup on rerender
  // This prevents heartbeat from being removed when tile rerenders with same liveStreamId
  const liveStreamIdRef = useRef(liveStreamId);
  const enabledRef = useRef(enabled);
  const isActiveRef = useRef(isActive);
  const isUnmutedRef = useRef(isUnmuted);
  const isVisibleRef = useRef(isVisible);
  const isSubscribedRef = useRef(isSubscribed);
  
  // Update refs when values change (but don't trigger effect rerun)
  useEffect(() => {
    liveStreamIdRef.current = liveStreamId;
    enabledRef.current = enabled;
    isActiveRef.current = isActive;
    isUnmutedRef.current = isUnmuted;
    isVisibleRef.current = isVisible;
    isSubscribedRef.current = isSubscribed;
  }, [liveStreamId, enabled, isActive, isUnmuted, isVisible, isSubscribed]);
  
  // CRITICAL: Track watch session key changes - only cleanup when key actually changes
  useEffect(() => {
    previousWatchKeyRef.current = currentWatchKeyRef.current;
    currentWatchKeyRef.current = watchSessionKey || null;
  }, [watchSessionKey]);

  const sendHeartbeat = useCallback(async () => {
    // Use refs to get current values
    if (!enabledRef.current || !liveStreamIdRef.current) return;

    const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (DEBUG_LIVEKIT) {
        console.log('[HEARTBEAT] Sending heartbeat', {
          liveStreamId: liveStreamIdRef.current,
          isActive: isActiveRef.current,
          isUnmuted: isUnmutedRef.current,
          isVisible: isVisibleRef.current,
          isSubscribed: isSubscribedRef.current,
        });
      }

      await supabase.rpc('update_viewer_heartbeat', {
        p_viewer_id: user.id,
        p_live_stream_id: liveStreamIdRef.current,
        p_is_active: isActiveRef.current,
        p_is_unmuted: isUnmutedRef.current,
        p_is_visible: isVisibleRef.current,
        p_is_subscribed: isSubscribedRef.current,
      });
      
      if (DEBUG_LIVEKIT) {
        console.log('[HEARTBEAT] upsert', {
          slotIndex,
          liveStreamId: liveStreamIdRef.current,
          watchSessionKey: currentWatchKeyRef.current,
          isVisible: isVisibleRef.current,
        });
      }
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  }, [supabase]); // Only depend on supabase, not the changing values

  const cleanup = useCallback(async (reason: string) => {
    // Use ref to get current value
    if (!liveStreamIdRef.current) return;

    const DEBUG_LIVEKIT = process.env.NEXT_PUBLIC_DEBUG_LIVEKIT === '1';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (DEBUG_LIVEKIT) {
        console.log('[HEARTBEAT] remove', {
          slotIndex,
          liveStreamId: liveStreamIdRef.current,
          watchSessionKey: currentWatchKeyRef.current,
          reason,
        });
      }

      // Remove from active_viewers
      await supabase
        .from('active_viewers')
        .delete()
        .eq('viewer_id', user.id)
        .eq('live_stream_id', liveStreamIdRef.current);
    } catch (error) {
      console.error('Error cleaning up viewer:', error);
    }
  }, [supabase, slotIndex]); // Only depend on supabase and slotIndex

  // CRITICAL: Use watch session key to determine when to cleanup
  // Only cleanup when watchSessionKey changes (slot changed streamer) or component unmounts
  useEffect(() => {
    // CRITICAL: Only cleanup previous watch session if key actually changed
    // This prevents cleanup on rerender when watching the same streamer
    if (previousWatchKeyRef.current && previousWatchKeyRef.current !== currentWatchKeyRef.current) {
      // Watch session changed - cleanup old session
      cleanup('watch session changed').catch(console.error);
    }
    
    // Check if we should start heartbeat
    if (!enabledRef.current || !liveStreamIdRef.current || !currentWatchKeyRef.current) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Only cleanup if we're actually disabling (not just rerendering)
      if ((!enabled || !liveStreamId) && previousWatchKeyRef.current) {
        cleanup('disabled').catch(console.error);
      }
      return;
    }

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval (every 12 seconds - slightly faster than 15s for safety)
    intervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, 12000);

    // Cleanup on unmount or when watchSessionKey changes
    cleanupRef.current = () => cleanup('component unmount');

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // CRITICAL: Only cleanup if watch session key changed or component unmounting
      // Check if key actually changed (not just rerender)
      if (previousWatchKeyRef.current && previousWatchKeyRef.current !== currentWatchKeyRef.current) {
        // Key changed - cleanup old session (already done above)
      } else if (!enabledRef.current || !liveStreamIdRef.current || !currentWatchKeyRef.current) {
        // Actually disabling - cleanup
        cleanup('disabled').catch(console.error);
      }
      // Otherwise: just rerender with same watch session - DO NOT cleanup
    };
  }, [watchSessionKey, enabled, liveStreamId, sendHeartbeat, cleanup]); // Depend on watchSessionKey, not liveStreamId directly

  // Cleanup on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanup('page unload');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [cleanup]);

  return { sendHeartbeat, cleanup };
}


