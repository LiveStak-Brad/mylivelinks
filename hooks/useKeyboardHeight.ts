'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect virtual keyboard height on mobile devices.
 * 
 * Uses the visualViewport API to detect when the keyboard opens/closes
 * by measuring the difference between window.innerHeight and visualViewport.height.
 * 
 * This is useful for:
 * - Adjusting input positions when keyboard opens
 * - Preventing layout jumps on iOS Safari
 * - Ensuring chat inputs remain visible above keyboard
 * 
 * @example
 * const keyboardHeight = useKeyboardHeight();
 * 
 * return (
 *   <div style={{ paddingBottom: keyboardHeight }}>
 *     <input placeholder="Type..." />
 *   </div>
 * );
 * 
 * @returns The current keyboard height in pixels (0 when closed)
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const viewport = window.visualViewport;
    if (!viewport) {
      // visualViewport not supported (older browsers)
      return;
    }

    let rafId: number | null = null;

    const handleResize = () => {
      // Cancel any pending RAF to avoid stale updates
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      
      rafId = requestAnimationFrame(() => {
        // Calculate height difference between window and visual viewport
        // This difference is approximately the keyboard height
        const heightDiff = window.innerHeight - viewport.height;
        
        // Only consider it a keyboard if it's a significant height (> 100px)
        // This avoids false positives from browser chrome changes
        const newHeight = heightDiff > 100 ? Math.round(heightDiff) : 0;
        
        setKeyboardHeight(newHeight);
      });
    };

    // Listen to visualViewport resize events
    viewport.addEventListener('resize', handleResize);
    
    // Also listen to scroll events (iOS Safari triggers these with keyboard)
    viewport.addEventListener('scroll', handleResize);
    
    // Initial check
    handleResize();

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return keyboardHeight;
}

/**
 * Hook to detect if the virtual keyboard is currently open.
 * 
 * @returns true if keyboard is open, false otherwise
 */
export function useIsKeyboardOpen(): boolean {
  const keyboardHeight = useKeyboardHeight();
  return keyboardHeight > 0;
}

export default useKeyboardHeight;
