/**
 * Viewer Heartbeat Hook (mobile parity)
 * Mirrors components/hooks/useViewerHeartbeat.ts on web.
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getRuntimeEnv } from '../lib/env';

interface UseViewerHeartbeatOptions {
  liveStreamId: number;
  isActive: boolean;
  isUnmuted: boolean;
  isVisible: boolean;
  isSubscribed: boolean;
  enabled?: boolean;
  slotIndex?: number;
  watchSessionKey?: string;
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentWatchKeyRef = useRef<string | null>(null);
  const previousWatchKeyRef = useRef<string | null>(null);

  const liveStreamIdRef = useRef(liveStreamId);
  const enabledRef = useRef(enabled);
  const isActiveRef = useRef(isActive);
  const isUnmutedRef = useRef(isUnmuted);
  const isVisibleRef = useRef(isVisible);
  const isSubscribedRef = useRef(isSubscribed);

  useEffect(() => {
    liveStreamIdRef.current = liveStreamId;
    enabledRef.current = enabled;
    isActiveRef.current = isActive;
    isUnmutedRef.current = isUnmuted;
    isVisibleRef.current = isVisible;
    isSubscribedRef.current = isSubscribed;
  }, [liveStreamId, enabled, isActive, isUnmuted, isVisible, isSubscribed]);

  useEffect(() => {
    previousWatchKeyRef.current = currentWatchKeyRef.current;
    currentWatchKeyRef.current = watchSessionKey || null;
  }, [watchSessionKey]);

  const sendHeartbeat = useCallback(async () => {
    if (!enabledRef.current || !liveStreamIdRef.current) return;

    const DEBUG = getRuntimeEnv('EXPO_PUBLIC_DEBUG_LIVEKIT') === '1';

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (DEBUG) {
        console.log('[HEARTBEAT][MOBILE] Sending heartbeat', {
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
    } catch (error) {
      console.error('[HEARTBEAT][MOBILE] Error sending heartbeat:', error);
    }
  }, []);

  const cleanup = useCallback(async (reason: string) => {
    if (!liveStreamIdRef.current) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('active_viewers')
        .delete()
        .eq('viewer_id', user.id)
        .eq('live_stream_id', liveStreamIdRef.current);
    } catch (error) {
      console.warn('[HEARTBEAT][MOBILE] Error cleaning up viewer:', reason, error);
    }
  }, []);

  useEffect(() => {
    if (previousWatchKeyRef.current && previousWatchKeyRef.current !== currentWatchKeyRef.current) {
      cleanup('watch session changed').catch(console.error);
    }

    if (!enabledRef.current || !liveStreamIdRef.current || !currentWatchKeyRef.current) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if ((!enabled || !liveStreamId) && previousWatchKeyRef.current) {
        cleanup('disabled').catch(console.error);
      }
      return;
    }

    sendHeartbeat();

    intervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, 12_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (previousWatchKeyRef.current && previousWatchKeyRef.current !== currentWatchKeyRef.current) {
        return;
      }
      if (!enabledRef.current || !liveStreamIdRef.current || !currentWatchKeyRef.current) {
        cleanup('disabled').catch(console.error);
      }
    };
  }, [watchSessionKey, enabled, liveStreamId, sendHeartbeat, cleanup]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanup('app unload');
    };

    const subscription = () => {
      cleanup('app unload');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
      subscription();
    };
  }, [cleanup]);

  return { sendHeartbeat, cleanup };
}
