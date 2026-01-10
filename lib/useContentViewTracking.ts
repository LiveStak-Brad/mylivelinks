/**
 * Content View Tracking Hook (Web)
 * 
 * Automatically tracks content views using IntersectionObserver
 * - Triggers when content is 50% visible for 2+ seconds
 * - Deduplicates per component mount (DB handles calendar day dedupe)
 * - Handles anonymous user fingerprinting
 */

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { getCachedViewFingerprint } from './viewFingerprint';

type ContentType = 'feed_post' | 'team_post' | 'music_track' | 'music_video' | 'clip';
type ViewSource = 'web' | 'mobile';
type ViewType = 'page_load' | 'viewport' | 'playback';

interface UseContentViewTrackingProps {
  contentType: ContentType;
  contentId: string | null | undefined;
  viewSource?: ViewSource;
  viewType?: ViewType;
  enabled?: boolean;
}

export function useContentViewTracking({
  contentType,
  contentId,
  viewSource = 'web',
  viewType = 'viewport',
  enabled = true
}: UseContentViewTrackingProps) {
  const hasTrackedRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Reset tracking state when contentId changes
    hasTrackedRef.current = false;
  }, [contentId]);

  useEffect(() => {
    if (!enabled || !contentId || hasTrackedRef.current) {
      return;
    }

    const trackView = async () => {
      if (hasTrackedRef.current) return;

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
          hasTrackedRef.current = true;
          console.log(`[ViewTracking] Tracked ${contentType} view:`, contentId);
        }
      } catch (err) {
        console.error('[ViewTracking] Exception tracking view:', err);
      }
    };

    // Set up IntersectionObserver
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          // 50%+ visible - start 2 second timer
          if (!timerRef.current && !hasTrackedRef.current) {
            timerRef.current = setTimeout(() => {
              trackView();
              timerRef.current = null;
            }, 2000);
          }
        } else {
          // Not visible enough - cancel timer
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }
      });
    };

    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold: [0, 0.5, 1.0],
      rootMargin: '0px'
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, contentId, contentType, viewSource, viewType]);

  // Return ref to attach to the element to observe
  return {
    ref: (element: HTMLElement | null) => {
      elementRef.current = element;
      if (observerRef.current && element) {
        observerRef.current.observe(element);
      }
    }
  };
}
