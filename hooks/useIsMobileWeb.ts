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
  const [isMobileWeb, setIsMobileWeb] = useState(false);

  useEffect(() => {
    const checkIsMobileWeb = () => {
      // Guard for SSR
      if (typeof window === 'undefined') {
        return false;
      }

      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Width check: phone-sized viewport
      const isPhoneWidth = width <= 900;
      
      // Pointer check: touch device (coarse pointer = finger/stylus)
      const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
      
      // User agent checks
      const ua = navigator.userAgent.toLowerCase();
      
      // Mobile phone indicators
      const isMobileUA = /mobile|iphone|ipod|android(?!.*tablet)|blackberry|opera mini|iemobile|wpdesktop/i.test(ua);
      
      // Tablet exclusion indicators
      const isTabletUA = /ipad|tablet|playbook|silk/i.test(ua);
      
      // iPad detection (newer iPads report as Mac in Safari)
      const isIPad = 
        /ipad/i.test(ua) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
        (/macintosh/i.test(ua) && 'ontouchend' in document);
      
      // Android tablet detection (typically > 600px width and "android" but no "mobile")
      const isAndroidTablet = /android/i.test(ua) && !/mobile/i.test(ua);
      
      // Exclude tablets
      if (isTabletUA || isIPad || isAndroidTablet) {
        return false;
      }
      
      // Must have phone-sized viewport
      if (!isPhoneWidth) {
        return false;
      }
      
      // Must have either coarse pointer OR mobile user agent
      return hasCoarsePointer || isMobileUA;
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

