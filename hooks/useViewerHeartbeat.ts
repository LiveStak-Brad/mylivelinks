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
}

export function useViewerHeartbeat({
  liveStreamId,
  isActive,
  isUnmuted,
  isVisible,
  isSubscribed,
  enabled = true,
}: UseViewerHeartbeatOptions) {
  const supabase = createClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const sendHeartbeat = useCallback(async () => {
    if (!enabled || !liveStreamId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.rpc('update_viewer_heartbeat', {
        p_viewer_id: user.id,
        p_live_stream_id: liveStreamId,
        p_is_active: isActive,
        p_is_unmuted: isUnmuted,
        p_is_visible: isVisible,
        p_is_subscribed: isSubscribed,
      });
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  }, [enabled, liveStreamId, isActive, isUnmuted, isVisible, isSubscribed, supabase]);

  const cleanup = useCallback(async () => {
    if (!liveStreamId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Remove from active_viewers
      await supabase
        .from('active_viewers')
        .delete()
        .eq('viewer_id', user.id)
        .eq('live_stream_id', liveStreamId);
    } catch (error) {
      console.error('Error cleaning up viewer:', error);
    }
  }, [liveStreamId, supabase]);

  useEffect(() => {
    if (!enabled || !liveStreamId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval (every 12 seconds - slightly faster than 15s for safety)
    intervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, 12000);

    // Cleanup on unmount or when disabled
    cleanupRef.current = cleanup;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Cleanup viewer record
      cleanup();
    };
  }, [enabled, liveStreamId, sendHeartbeat, cleanup]);

  // Cleanup on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanup();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [cleanup]);

  return { sendHeartbeat, cleanup };
}


