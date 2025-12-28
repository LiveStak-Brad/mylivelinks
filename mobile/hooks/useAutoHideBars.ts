import { useRef, useState, useCallback } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

interface UseAutoHideBarsOptions {
  threshold?: number; // Minimum scroll distance to trigger hide/show
  showDelay?: number; // Delay before showing bars after scroll stops (ms)
}

export function useAutoHideBars(options: UseAutoHideBarsOptions = {}) {
  const { threshold = 5, showDelay = 150 } = options;
  
  const [barsVisible, setBarsVisible] = useState(true);
  const scrollY = useRef(0);
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down' | null>(null);
  const showTimer = useRef<NodeJS.Timeout | null>(null);
  const isScrolling = useRef(false);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const delta = currentScrollY - lastScrollY.current;

    // Don't hide if at top of page
    if (currentScrollY <= 0) {
      setBarsVisible(true);
      scrollY.current = currentScrollY;
      lastScrollY.current = currentScrollY;
      return;
    }

    // Determine scroll direction
    if (Math.abs(delta) > threshold) {
      const newDirection = delta > 0 ? 'down' : 'up';
      
      // Only update if direction changed or significant scroll
      if (newDirection !== scrollDirection.current) {
        scrollDirection.current = newDirection;
        
        if (newDirection === 'down') {
          // Scrolling down - hide bars
          setBarsVisible(false);
        } else {
          // Scrolling up - show bars
          setBarsVisible(true);
        }
      }
      
      lastScrollY.current = currentScrollY;
    }

    scrollY.current = currentScrollY;
    isScrolling.current = true;

    // Clear existing timer
    if (showTimer.current) {
      clearTimeout(showTimer.current);
    }

    // Show bars after scrolling stops
    showTimer.current = setTimeout(() => {
      isScrolling.current = false;
      setBarsVisible(true);
    }, showDelay);
  }, [threshold, showDelay]);

  const handleScrollBeginDrag = useCallback(() => {
    if (showTimer.current) {
      clearTimeout(showTimer.current);
    }
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    // Show bars shortly after user lifts finger
    if (showTimer.current) {
      clearTimeout(showTimer.current);
    }
    showTimer.current = setTimeout(() => {
      setBarsVisible(true);
    }, showDelay);
  }, [showDelay]);

  return {
    barsVisible,
    scrollHandlers: {
      onScroll: handleScroll,
      onScrollBeginDrag: handleScrollBeginDrag,
      onScrollEndDrag: handleScrollEndDrag,
      scrollEventThrottle: 16, // ~60fps
    },
  };
}




