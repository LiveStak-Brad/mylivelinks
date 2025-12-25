'use client';

import { useState, useEffect } from 'react';

interface OrientationState {
  isLandscape: boolean;
  isPortrait: boolean;
  angle: number;
}

/**
 * Detect device orientation and listen for changes.
 * Works on iOS Safari and Android Chrome.
 * 
 * Returns:
 * - isLandscape: true when device is in landscape mode
 * - isPortrait: true when device is in portrait mode
 * - angle: orientation angle in degrees (0, 90, 180, 270, or -90)
 */
export function useOrientation(): OrientationState {
  const [orientation, setOrientation] = useState<OrientationState>(() => ({
    isLandscape: false,
    isPortrait: true,
    angle: 0,
  }));

  useEffect(() => {
    // Guard for SSR
    if (typeof window === 'undefined') {
      return;
    }

    const getOrientation = (): OrientationState => {
      // Method 1: Use Screen Orientation API (modern browsers)
      if (screen?.orientation?.type) {
        const type = screen.orientation.type;
        const angle = screen.orientation.angle || 0;
        const isLandscape = type.includes('landscape');
        return {
          isLandscape,
          isPortrait: !isLandscape,
          angle,
        };
      }

      // Method 2: Use window.orientation (deprecated but works on older iOS)
      if (typeof window.orientation !== 'undefined') {
        const angle = window.orientation as number;
        const isLandscape = Math.abs(angle) === 90;
        return {
          isLandscape,
          isPortrait: !isLandscape,
          angle,
        };
      }

      // Method 3: Compare window dimensions
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isLandscape = width > height;
      
      return {
        isLandscape,
        isPortrait: !isLandscape,
        angle: isLandscape ? 90 : 0,
      };
    };

    // Set initial orientation
    setOrientation(getOrientation());

    // Handler for orientation changes
    const handleOrientationChange = () => {
      // Small delay to ensure dimensions have updated
      setTimeout(() => {
        setOrientation(getOrientation());
      }, 100);
    };

    // Handler for resize (fallback for browsers without orientation events)
    const handleResize = () => {
      setOrientation(getOrientation());
    };

    // Listen for Screen Orientation API changes
    if (screen?.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    }

    // Listen for deprecated orientationchange event (iOS Safari)
    window.addEventListener('orientationchange', handleOrientationChange);

    // Listen for resize as fallback
    window.addEventListener('resize', handleResize);

    return () => {
      if (screen?.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      }
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return orientation;
}

export default useOrientation;

