'use client';

import { useState, useEffect } from 'react';

/**
 * Detect if the current browser is a mobile web browser (not tablet, not native app).
 * Uses a combination of screen width, pointer type, and user agent.
 * 
 * Detection rules:
 * - Window width <= 900px (sensible phone breakpoint)
 * - AND (pointer is coarse OR userAgent indicates mobile phone)
 * - Excludes tablets (iPad, larger Android tablets) via userAgent check
 */
export function useIsMobileWeb(): boolean {
  const getIsMobileWeb = () => {
    if (typeof window === 'undefined') return false;
    const width = window.innerWidth;
    const hasCoarsePointer =
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isMobileUA = /Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua);
    const isTabletUA = /iPad|Tablet|Nexus 7|Nexus 9|SM-T|Kindle|Silk/i.test(ua);

    return width <= 900 && (hasCoarsePointer || isMobileUA) && !isTabletUA;
  };

  const [isMobileWeb, setIsMobileWeb] = useState(getIsMobileWeb);

  useEffect(() => {
    const checkIsMobileWeb = () => {
      // Guard for SSR
      if (typeof window === 'undefined') {
        return false;
      }

      const width = window.innerWidth;
      const hasCoarsePointer =
        typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
      const isMobileUA = /Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua);
      const isTabletUA = /iPad|Tablet|Nexus 7|Nexus 9|SM-T|Kindle|Silk/i.test(ua);

      return width <= 900 && (hasCoarsePointer || isMobileUA) && !isTabletUA;
    };

    // Initial check
    setIsMobileWeb(checkIsMobileWeb());

    // Re-check on resize (handles orientation changes and browser resize)
    const handleResize = () => {
      setIsMobileWeb(checkIsMobileWeb());
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return isMobileWeb;
}

export default useIsMobileWeb;

