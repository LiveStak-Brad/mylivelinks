/**
 * Content View Tracking Hook (React Native)
 * 
 * Manual tracking hook for use with FlatList viewability callbacks
 * - Session-based deduplication (Set of tracked IDs)
 * - Handles anonymous user fingerprinting
 */

import { useRef, useCallback } from 'react';
import { supabase as createClient } from '../lib/supabase';
import { getCachedViewFingerprint } from '../lib/viewFingerprint';

type ContentType = 'feed_post' | 'team_post' | 'music_track' | 'music_video' | 'clip';
type ViewSource = 'web' | 'mobile';
type ViewType = 'page_load' | 'viewport' | 'playback';

export function useContentViewTracking() {
  const trackedIdsRef = useRef<Set<string>>(new Set());

  const trackView = useCallback(async (
    contentType: ContentType,
    contentId: string,
    viewSource: ViewSource = 'mobile',
    viewType: ViewType = 'viewport'
  ) => {
    // Deduplicate per session
    const trackingKey = `${contentType}:${contentId}`;
    if (trackedIdsRef.current.has(trackingKey)) {
      return;
    }

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let fingerprint: string | null = null;
      if (!user) {
        // Anonymous user - generate fingerprint
        fingerprint = await getCachedViewFingerprint();
      }

      // Call RPC to track view
      const { error } = await supabase.rpc('rpc_track_content_view', {
        p_content_type: contentType,
        p_content_id: contentId,
        p_view_source: viewSource,
        p_view_type: viewType,
        p_viewer_fingerprint: fingerprint
      });

      if (error) {
        console.error('[ViewTracking] Failed to track view:', error);
      } else {
        trackedIdsRef.current.add(trackingKey);
        console.log(`[ViewTracking] Tracked ${contentType} view:`, contentId);
      }
    } catch (err) {
      console.error('[ViewTracking] Exception tracking view:', err);
    }
  }, []);

  return { trackView };
}
