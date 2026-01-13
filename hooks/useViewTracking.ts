'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { getCachedViewFingerprint } from '@/lib/viewFingerprint';

/**
 * Hook to track views for posts and live streams
 * Uses the same RPC-based system as the feed
 */
export function useViewTracking(
  itemId: string | null,
  itemType: 'video' | 'live' | 'photo',
  isVisible: boolean
) {
  const viewedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!itemId || !isVisible || viewedRef.current) {
      return;
    }

    // Track view after 2 seconds of visibility
    timerRef.current = setTimeout(async () => {
      if (viewedRef.current) return;
      viewedRef.current = true;

      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let fingerprint: string | null = null;
        if (!user) {
          fingerprint = await getCachedViewFingerprint();
        }

        // Use the same RPC as feed for posts
        const contentType = itemType === 'live' ? 'live_stream' : 'feed_post';
        
        const { error } = await supabase.rpc('rpc_track_content_view', {
          p_content_type: contentType,
          p_content_id: itemId,
          p_view_source: 'web',
          p_view_type: 'viewport',
          p_viewer_fingerprint: fingerprint
        });

        if (error) {
          console.error('Error tracking view:', error);
        }
      } catch (err) {
        console.error('Error tracking view:', err);
      }
    }, 2000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [itemId, itemType, isVisible]);

  // Reset viewed flag when item changes
  useEffect(() => {
    viewedRef.current = false;
  }, [itemId]);
}
