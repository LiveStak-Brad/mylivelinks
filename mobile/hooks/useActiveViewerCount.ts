import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://www.mylivelinks.com').replace(/\/+$/, '');

type UseActiveViewerCountOptions = {
  liveStreamId?: number | null;
  fallbackCount?: number;
  pollIntervalMs?: number;
};

export function useActiveViewerCount({
  liveStreamId,
  fallbackCount = 0,
  pollIntervalMs = 12_000,
}: UseActiveViewerCountOptions) {
  const [viewerCount, setViewerCount] = useState(fallbackCount);
  const [trackingDisabled, setTrackingDisabled] = useState(false);

  useEffect(() => {
    if (!liveStreamId) {
      setTrackingDisabled(false);
    }
  }, [liveStreamId]);

  useEffect(() => {
    if (!liveStreamId || trackingDisabled) {
      setViewerCount(fallbackCount);
    }
  }, [fallbackCount, liveStreamId, trackingDisabled]);

  const refresh = useCallback(async () => {
    if (!liveStreamId || trackingDisabled) {
      setViewerCount(fallbackCount);
      return;
    }

    try {
      const url = `${API_BASE_URL}/api/active-viewers?live_stream_id=${encodeURIComponent(String(liveStreamId))}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load viewer count (${response.status})`);
      }
      const data = await response.json();
      const nextCount =
        typeof data?.viewer_count === 'number'
          ? data.viewer_count
          : Number(data?.viewer_count) || 0;
      setViewerCount(nextCount);
    } catch (error) {
      console.warn('[useActiveViewerCount] falling back to LiveKit count', error);
      setTrackingDisabled(true);
      setViewerCount(fallbackCount);
    }
  }, [fallbackCount, liveStreamId, trackingDisabled]);

  useEffect(() => {
    if (!liveStreamId || trackingDisabled) return;
    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, pollIntervalMs);
    return () => clearInterval(interval);
  }, [liveStreamId, pollIntervalMs, refresh, trackingDisabled]);

  useEffect(() => {
    if (!liveStreamId || trackingDisabled) return;
    const channel = supabase
      .channel(`active-viewers-host-${liveStreamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_viewers',
          filter: `live_stream_id=eq.${liveStreamId}`,
        },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveStreamId, refresh, trackingDisabled]);

  return {
    viewerCount,
    trackingDisabled,
    refresh,
  };
}
