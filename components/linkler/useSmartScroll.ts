import { useCallback, useEffect, useRef, useState } from 'react';

type SmartScrollOptions = {
  threshold?: number;
};

type ScrollBehaviorOption = ScrollBehavior | 'auto';

export function useSmartScroll({ threshold = 80 }: SmartScrollOptions = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const endAnchorRef = useRef<HTMLDivElement | null>(null);
  const [distanceFromBottom, setDistanceFromBottom] = useState(0);
  const [hasPendingIndicator, setHasPendingIndicator] = useState(false);

  const computeDistance = useCallback(() => {
    const el = containerRef.current;
    if (!el) return 0;
    return Math.max(0, el.scrollHeight - el.scrollTop - el.clientHeight);
  }, []);

  const updateDistance = useCallback(() => {
    const distance = computeDistance();
    setDistanceFromBottom(distance);
    if (distance <= threshold) {
      setHasPendingIndicator(false);
    }
  }, [computeDistance, threshold]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehaviorOption = 'smooth') => {
      requestAnimationFrame(() => {
        endAnchorRef.current?.scrollIntoView({ behavior, block: 'end' });
        setHasPendingIndicator(false);
        updateDistance();
      });
    },
    [updateDistance]
  );

  const notifyContentChange = useCallback(() => {
    const distance = computeDistance();
    if (distance <= threshold) {
      scrollToBottom('smooth');
    } else {
      setHasPendingIndicator(true);
    }
  }, [computeDistance, scrollToBottom, threshold]);

  useEffect(() => {
    scrollToBottom('auto');
  }, [scrollToBottom]);

  return {
    containerRef,
    endAnchorRef,
    onScroll: updateDistance,
    scrollToBottom,
    notifyContentChange,
    showNewMessages: hasPendingIndicator && distanceFromBottom > threshold,
  };
}

