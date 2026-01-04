'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

type PullToRefreshProps = {
  thresholdPx?: number;
  maxPullPx?: number;
};

function isScrollableY(el: Element) {
  const style = window.getComputedStyle(el);
  const overflowY = style.overflowY;
  const scrollable = overflowY === 'auto' || overflowY === 'scroll';
  if (!scrollable) return false;
  const node = el as HTMLElement;
  return node.scrollHeight > node.clientHeight;
}

function findScrollableAncestorY(target: EventTarget | null) {
  let el = (target as Element | null) ?? null;
  while (el && el !== document.body && el !== document.documentElement) {
    if (isScrollableY(el)) {
      return el as HTMLElement;
    }
    el = el.parentElement;
  }
  return null;
}

export default function PullToRefresh({
  thresholdPx = 72,
  maxPullPx = 120,
}: PullToRefreshProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '';

  const disabled = useMemo(() => {
    if (!pathname) return false;
    if (pathname === '/live/host') return true;
    if (pathname.startsWith('/room/')) return true;
    if (pathname === '/login' || pathname === '/signup' || pathname === '/onboarding') return true;
    return false;
  }, [pathname]);

  const [pullPx, setPullPx] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTouchLikeDevice, setIsTouchLikeDevice] = useState(false);

  const pullPxRef = useRef(0);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const canPullRef = useRef(false);
  const lastTouchIdRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    pullingRef.current = false;
    canPullRef.current = false;
    startYRef.current = null;
    lastTouchIdRef.current = null;
    pullPxRef.current = 0;
    setPullPx(0);
  }, []);

  const triggerRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      router.refresh();
      window.dispatchEvent(new Event('mll:refresh'));
    } finally {
      window.setTimeout(() => {
        setIsRefreshing(false);
        setPullPx(0);
      }, 450);
    }
  }, [isRefreshing, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const nextIsTouchLikeDevice =
      (typeof navigator !== 'undefined' && (navigator.maxTouchPoints ?? 0) > 0) ||
      (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches);

    setIsTouchLikeDevice(nextIsTouchLikeDevice);
  }, []);

  useEffect(() => {
    if (disabled) return;
    if (typeof window === 'undefined') return;

    if (!isTouchLikeDevice) return;

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return;
      if (document.body.style.overflow === 'hidden') return;
      if (window.scrollY > 0) return;

      const scrollableAncestor = findScrollableAncestorY(e.target);
      if (scrollableAncestor) return;

      const touch = e.touches[0];
      if (!touch) return;

      startYRef.current = touch.clientY;
      lastTouchIdRef.current = touch.identifier;
      canPullRef.current = true;
      pullingRef.current = false;
      pullPxRef.current = 0;
      setPullPx(0);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isRefreshing) return;
      if (!canPullRef.current) return;
      if (document.body.style.overflow === 'hidden') return;
      if (window.scrollY > 0) {
        reset();
        return;
      }

      const startY = startYRef.current;
      if (startY == null) return;

      const touchId = lastTouchIdRef.current;
      const touch = touchId == null
        ? e.touches[0]
        : Array.from(e.touches).find((t) => t.identifier === touchId) ?? e.touches[0];
      if (!touch) return;

      const delta = touch.clientY - startY;
      if (delta <= 0) {
        reset();
        return;
      }

      pullingRef.current = true;
      const next = Math.min(maxPullPx, Math.round(delta * 0.55));
      pullPxRef.current = next;
      setPullPx(next);

      if (next > 4) {
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (isRefreshing) {
        reset();
        return;
      }

      const didPull = pullingRef.current;
      const reached = pullPxRef.current >= thresholdPx;

      reset();

      if (didPull && reached) {
        void triggerRefresh();
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [disabled, isRefreshing, isTouchLikeDevice, maxPullPx, reset, thresholdPx, triggerRefresh]);

  if (disabled || !isTouchLikeDevice) {
    return null;
  }

  const progress = Math.min(1, pullPx / thresholdPx);
  const show = pullPx > 0 || isRefreshing;
  const translateY = show ? pullPx : 0;

  if (!show) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="fixed left-0 right-0 top-0 pointer-events-none"
      style={{
        zIndex: 65,
        transform: `translateY(${translateY}px)`,
        transition: isRefreshing ? 'transform 200ms ease' : pullPx === 0 ? 'transform 180ms ease' : 'none',
      }}
    >
      <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-2 shadow-sm">
        <RefreshCw
          className="h-4 w-4 text-muted-foreground"
          style={{
            transform: isRefreshing
              ? 'rotate(360deg)'
              : `rotate(${Math.round(progress * 180)}deg)`,
            transition: isRefreshing ? 'transform 650ms linear' : 'transform 40ms linear',
          }}
        />
        <div className="text-xs font-semibold text-muted-foreground">
          {isRefreshing ? 'Refreshing…' : progress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      </div>
    </div>
  );
}
