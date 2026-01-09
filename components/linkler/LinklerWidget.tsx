'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { MoreHorizontal, X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type WidgetSize = 'small' | 'large';
type WidgetEdge = 'left' | 'right' | 'top' | 'bottom';

type WidgetPlacement = {
  edge: WidgetEdge;
  offset: number;
};

type Position = {
  top: number;
  left: number;
};

type ViewportRect = {
  width: number;
  height: number;
};

export interface LinklerWidgetProps {
  onOpenPanel: () => void;
  defaultSize?: WidgetSize;
}

const STORAGE_KEYS = {
  PLACEMENT: 'linkler.widget.placement',
  SIZE: 'linkler.widget.size',
  VISIBLE: 'linkler.widget.visible',
  INTRO_SEEN: 'linkler_intro_seen',
};

const SIZE_MAP: Record<WidgetSize, number> = {
  small: 68,
  large: 92,
};

const SAFE_MARGIN = 12;
const DRAG_THRESHOLD_PX = 10;
const BOTTOM_NAV_HEIGHT_FALLBACK = 80;

const isBrowser = () => typeof window !== 'undefined';

function readPlacement(): WidgetPlacement | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.PLACEMENT);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WidgetPlacement;
    if (!parsed || typeof parsed.edge !== 'string' || typeof parsed.offset !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writePlacement(placement: WidgetPlacement) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.PLACEMENT, JSON.stringify(placement));
  } catch {
    // ignore quota errors
  }
}

function readSize(): WidgetSize | null {
  if (!isBrowser()) return null;
  const stored = window.localStorage.getItem(STORAGE_KEYS.SIZE);
  if (stored === 'small' || stored === 'large') {
    return stored;
  }
  return null;
}

function writeSize(size: WidgetSize) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEYS.SIZE, size);
}

function readVisibility(): boolean | null {
  if (!isBrowser()) return null;
  const stored = window.localStorage.getItem(STORAGE_KEYS.VISIBLE);
  if (stored === '0') return false;
  if (stored === '1') return true;
  return null;
}

function writeVisibility(visible: boolean) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEYS.VISIBLE, visible ? '1' : '0');
}

type SafeInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

function getBottomNavHeight(): number {
  if (!isBrowser()) return BOTTOM_NAV_HEIGHT_FALLBACK;
  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) {
    const rect = bottomNav.getBoundingClientRect();
    return rect.height;
  }
  return BOTTOM_NAV_HEIGHT_FALLBACK;
}

const defaultInsets: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

const getVisualViewportInsets = (): SafeInsets => {
  if (!isBrowser() || !window.visualViewport) {
    return defaultInsets;
  }

  const vv = window.visualViewport;
  const top = vv.offsetTop ?? 0;
  const left = vv.offsetLeft ?? 0;
  let bottom = Math.max(0, window.innerHeight - vv.height - top);
  const right = Math.max(0, window.innerWidth - vv.width - left);
  
  // Add bottom nav height + safe area inset to bottom margin
  const bottomNavHeight = getBottomNavHeight();
  const safeAreaBottom = isBrowser() ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0') : 0;
  bottom = Math.max(bottom, bottomNavHeight + safeAreaBottom);
  
  return { top, right, bottom, left };
};

function clampOffset(edge: WidgetEdge, offset: number, viewport: ViewportRect, insets: SafeInsets, sizePx: number) {
  const marginTop = insets.top + SAFE_MARGIN;
  const marginBottom = insets.bottom + SAFE_MARGIN;
  const marginLeft = insets.left + SAFE_MARGIN;
  const marginRight = insets.right + SAFE_MARGIN;

  if (edge === 'left' || edge === 'right') {
    const max = Math.max(0, viewport.height - marginTop - marginBottom - sizePx);
    return Math.min(Math.max(offset, 0), max);
  }

  const max = Math.max(0, viewport.width - marginLeft - marginRight - sizePx);
  return Math.min(Math.max(offset, 0), max);
}

function placementToPosition(
  placement: WidgetPlacement,
  viewport: ViewportRect,
  insets: SafeInsets,
  sizePx: number
): Position {
  const marginTop = insets.top + SAFE_MARGIN;
  const marginBottom = insets.bottom + SAFE_MARGIN;
  const marginLeft = insets.left + SAFE_MARGIN;
  const marginRight = insets.right + SAFE_MARGIN;
  const offset = clampOffset(placement.edge, placement.offset, viewport, insets, sizePx);

  switch (placement.edge) {
    case 'left':
      return { top: marginTop + offset, left: marginLeft };
    case 'right':
      return { top: marginTop + offset, left: viewport.width - marginRight - sizePx };
    case 'top':
      return { top: marginTop, left: marginLeft + offset };
    case 'bottom':
    default:
      return { top: viewport.height - marginBottom - sizePx, left: marginLeft + offset };
  }
}

function computeSnapPlacement(position: Position, viewport: ViewportRect, insets: SafeInsets, sizePx: number): WidgetPlacement {
  const marginTop = insets.top + SAFE_MARGIN;
  const marginBottom = insets.bottom + SAFE_MARGIN;
  const marginLeft = insets.left + SAFE_MARGIN;
  const marginRight = insets.right + SAFE_MARGIN;

  const clampedTop = Math.min(Math.max(position.top, marginTop), viewport.height - marginBottom - sizePx);
  const clampedLeft = Math.min(Math.max(position.left, marginLeft), viewport.width - marginRight - sizePx);

  const centerX = clampedLeft + sizePx / 2;
  const centerY = clampedTop + sizePx / 2;

  const targets: { edge: WidgetEdge; center: number; offsetAxis: number }[] = [
    { edge: 'left', center: marginLeft + sizePx / 2, offsetAxis: clampedTop - marginTop },
    { edge: 'right', center: viewport.width - marginRight - sizePx / 2, offsetAxis: clampedTop - marginTop },
    { edge: 'top', center: marginTop + sizePx / 2, offsetAxis: clampedLeft - marginLeft },
    { edge: 'bottom', center: viewport.height - marginBottom - sizePx / 2, offsetAxis: clampedLeft - marginLeft },
  ];

  let best: WidgetPlacement = { edge: 'right', offset: clampOffset('right', targets[1].offsetAxis, viewport, insets, sizePx) };
  let bestDistance = Number.POSITIVE_INFINITY;

  targets.forEach((target) => {
    const distance = Math.abs((target.edge === 'top' || target.edge === 'bottom' ? centerY : centerX) - target.center);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = {
        edge: target.edge,
        offset: clampOffset(target.edge, target.offsetAxis, viewport, insets, sizePx),
      };
    }
  });

  return best;
}

function clampPosition(position: Position, viewport: ViewportRect, insets: SafeInsets, sizePx: number): Position {
  const marginTop = insets.top + SAFE_MARGIN;
  const marginBottom = insets.bottom + SAFE_MARGIN;
  const marginLeft = insets.left + SAFE_MARGIN;
  const marginRight = insets.right + SAFE_MARGIN;
  const maxTop = Math.max(marginTop, viewport.height - marginBottom - sizePx);
  const maxLeft = Math.max(marginLeft, viewport.width - marginRight - sizePx);

  return {
    top: Math.min(Math.max(position.top, marginTop), maxTop),
    left: Math.min(Math.max(position.left, marginLeft), maxLeft),
  };
}

export function LinklerWidget({ onOpenPanel, defaultSize = 'large' }: LinklerWidgetProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pointerOffset = useRef({ x: 0, y: 0 });
  const pointerId = useRef<number | null>(null);
  const pointerStart = useRef({ x: 0, y: 0 });
  const initialPosition = useRef<Position | null>(null);
  const dragExceededThreshold = useRef(false);
  const suppressClickRef = useRef(false);
  const [size, setSize] = useState<WidgetSize>(readSize() ?? defaultSize);
  const [isVisible, setIsVisible] = useState(readVisibility() ?? true);
  const [placement, setPlacement] = useState<WidgetPlacement | null>(null);
  const [livePosition, setLivePosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showIntro, setShowIntro] = useState(() => {
    if (!isBrowser()) return false;
    return window.localStorage.getItem(STORAGE_KEYS.INTRO_SEEN) !== '1';
  });
  const [introExpanded, setIntroExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewportRect, setViewportRect] = useState<ViewportRect>({ width: 0, height: 0 });
  const [safeInsets, setSafeInsets] = useState<SafeInsets>(() => getVisualViewportInsets());
  const [bottomNavHeight, setBottomNavHeight] = useState(BOTTOM_NAV_HEIGHT_FALLBACK);

  const sizePx = SIZE_MAP[size];

  useEffect(() => {
    if (!isBrowser()) return;
    const updateViewport = () => {
      setViewportRect({ width: window.innerWidth, height: window.innerHeight });
      setSafeInsets(getVisualViewportInsets());
      setBottomNavHeight(getBottomNavHeight());
    };

    updateViewport();
    // Initial delay to ensure DOM is ready
    const timer = setTimeout(updateViewport, 100);
    
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
    }
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
        window.visualViewport.removeEventListener('scroll', updateViewport);
      }
    };
  }, []);

  useEffect(() => {
    if (placement) return;
    if (!viewportRect.width || !viewportRect.height) return;
    const stored = readPlacement();
    if (stored) {
      setPlacement(stored);
      return;
    }

    const marginTop = safeInsets.top + SAFE_MARGIN;
    const marginBottom = safeInsets.bottom + SAFE_MARGIN;
    const availableY = Math.max(0, viewportRect.height - marginTop - marginBottom - sizePx);
    setPlacement({
      edge: 'right',
      offset: Math.max(0, availableY - 24),
    });
  }, [placement, viewportRect, safeInsets, sizePx]);

  useEffect(() => {
    if (!placement || !viewportRect.width || !viewportRect.height) return;
    const normalizedOffset = clampOffset(placement.edge, placement.offset, viewportRect, safeInsets, sizePx);
    if (normalizedOffset !== placement.offset) {
      const nextPlacement: WidgetPlacement = { edge: placement.edge, offset: normalizedOffset };
      setPlacement(nextPlacement);
      writePlacement(nextPlacement);
    }
  }, [placement, viewportRect, safeInsets, sizePx]);

  useEffect(() => {
    writeSize(size);
  }, [size]);

  useEffect(() => {
    writeVisibility(isVisible);
  }, [isVisible]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (event: PointerEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [menuOpen]);

  const currentPosition = useMemo(() => {
    if (isDragging && livePosition) return livePosition;
    if (!placement || !viewportRect.width || !viewportRect.height) return null;
    return placementToPosition(placement, viewportRect, safeInsets, sizePx);
  }, [isDragging, livePosition, placement, viewportRect, safeInsets, sizePx]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    if (!currentPosition) return;
    pointerId.current = event.pointerId;
    pointerOffset.current = {
      x: event.clientX - currentPosition.left,
      y: event.clientY - currentPosition.top,
    };
    pointerStart.current = { x: event.clientX, y: event.clientY };
    initialPosition.current = currentPosition;
    dragExceededThreshold.current = false;
    suppressClickRef.current = false;
    setMenuOpen(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (pointerId.current !== event.pointerId) return;
    
    // Prevent page scroll during drag
    event.preventDefault();
    
    const rawPosition = {
      left: event.clientX - pointerOffset.current.x,
      top: event.clientY - pointerOffset.current.y,
    };
    const deltaX = event.clientX - pointerStart.current.x;
    const deltaY = event.clientY - pointerStart.current.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (!dragExceededThreshold.current && distance > DRAG_THRESHOLD_PX) {
      dragExceededThreshold.current = true;
      setIsDragging(true);
      setLivePosition(initialPosition.current ?? rawPosition);
      // Disable page scroll when dragging starts
      if (isBrowser()) {
        document.body.classList.add('dragging-linkler');
      }
    }

    if (!dragExceededThreshold.current) {
      return;
    }

    if (!viewportRect.width || !viewportRect.height) return;
    const clamped = clampPosition(rawPosition, viewportRect, safeInsets, sizePx);
    setLivePosition(clamped);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (pointerId.current !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    pointerId.current = null;
    const didDrag = dragExceededThreshold.current;
    dragExceededThreshold.current = false;
    setIsDragging(false);
    suppressClickRef.current = didDrag;
    
    // Re-enable page scroll
    if (isBrowser()) {
      document.body.classList.remove('dragging-linkler');
    }
    
    if (!didDrag) {
      setLivePosition(null);
      initialPosition.current = null;
      return;
    }
    if (livePosition && viewportRect.width && viewportRect.height) {
      const snapped = computeSnapPlacement(livePosition, viewportRect, safeInsets, sizePx);
      setPlacement(snapped);
      writePlacement(snapped);
    }
    setLivePosition(null);
    initialPosition.current = null;
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (pointerId.current !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    pointerId.current = null;
    setIsDragging(false);
    dragExceededThreshold.current = false;
    suppressClickRef.current = false;
    
    // Re-enable page scroll
    if (isBrowser()) {
      document.body.classList.remove('dragging-linkler');
    }
    
    setLivePosition(null);
    initialPosition.current = null;
  };

  if (!isVisible) {
    const reopenBottom = bottomNavHeight + (isBrowser() ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0') : 0) + 16;
    return (
      <div
        className="fixed left-4 z-50"
        style={{
          bottom: `${reopenBottom}px`,
          paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 4px)',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setIsVisible(true);
            setShowIntro(false);
            if (isBrowser()) {
              window.localStorage.setItem(STORAGE_KEYS.INTRO_SEEN, '1');
            }
          }}
          className="rounded-full border border-border bg-background/90 px-4 py-2 text-sm font-medium shadow-lg shadow-black/10 backdrop-blur-md transition hover:bg-background"
        >
          Bring back Linkler
        </button>
      </div>
    );
  }

  if (!currentPosition) {
    return null;
  }

  const bubblePlacement = placement?.edge ?? 'right';
  const bubbleVertical = bubblePlacement === 'top' ? 'below' : 'above';
  const bubbleHorizontal =
    bubblePlacement === 'left' ? 'left' : bubblePlacement === 'right' ? 'right' : 'center';

  const showBubble = showIntro;

  const widgetSizeClass = size === 'large' ? 'w-24 h-24 sm:w-28 sm:h-28' : 'w-20 h-20 sm:w-24 sm:h-24';
  const imageSizeClass = size === 'large' ? 'w-20 h-20 sm:w-24 sm:h-24' : 'w-16 h-16 sm:w-20 sm:h-20';

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <div
        className={cn('absolute pointer-events-auto select-none', isDragging && 'cursor-grabbing')}
        style={{
          top: currentPosition.top,
          left: currentPosition.left,
          transition: isDragging ? 'none' : 'transform 0.2s ease, top 0.2s ease, left 0.2s ease',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {showBubble && (
          <div
            className={cn(
              'absolute w-64 max-w-[70vw] rounded-2xl bg-background/95 p-4 text-sm text-foreground shadow-2xl ring-1 ring-border backdrop-blur-xl',
              bubbleVertical === 'above' ? 'bottom-full mb-3' : 'top-full mt-3',
              bubbleHorizontal === 'left'
                ? 'origin-bottom-left'
                : bubbleHorizontal === 'right'
                  ? 'right-0 origin-bottom-right'
                  : 'left-1/2 -translate-x-1/2'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">Hi, I’m Linkler 👋 Need help or just want to chat?</p>
              <button
                type="button"
                aria-label="Dismiss Linkler intro"
                className="rounded-full p-1 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
                onClick={() => {
                  setShowIntro(false);
                  if (isBrowser()) {
                    window.localStorage.setItem(STORAGE_KEYS.INTRO_SEEN, '1');
                  }
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {!introExpanded && (
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-primary hover:underline"
                onClick={() => setIntroExpanded(true)}
              >
                Read more
              </button>
            )}
            {introExpanded && (
              <p className="mt-2 text-xs text-muted-foreground">
                Drag me anywhere. Close me anytime. Open me for Support or Chat.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          <div className="relative">
            <button
              type="button"
              className={cn(
                'rounded-full bg-transparent shadow-xl shadow-primary/40 transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                widgetSizeClass
              )}
              style={{ touchAction: 'none' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onClick={() => {
                if (suppressClickRef.current) {
                  suppressClickRef.current = false;
                  return;
                }
                setShowIntro(false);
                if (isBrowser()) {
                  window.localStorage.setItem(STORAGE_KEYS.INTRO_SEEN, '1');
                }
                onOpenPanel();
              }}
              aria-label="Open Linkler support panel"
            >
              <Image
                src="/images/linkler.png"
                alt="Linkler mascot"
                width={80}
                height={80}
                className={cn('mx-auto object-contain drop-shadow-lg transition', imageSizeClass)}
                draggable={false}
                priority={false}
              />
            </button>

            <div className="absolute -top-2 -right-2">
              <button
                type="button"
                aria-label="Hide Linkler"
                className="rounded-full bg-background/90 p-1 text-muted-foreground shadow-md ring-1 ring-border backdrop-blur"
                onClick={() => {
                  setIsVisible(false);
                  setMenuOpen(false);
                  setShowIntro(false);
                  if (isBrowser()) {
                    window.localStorage.setItem(STORAGE_KEYS.INTRO_SEEN, '1');
                  }
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Linkler options"
              className="rounded-full bg-background/90 p-2 text-muted-foreground shadow-md ring-1 ring-border backdrop-blur transition hover:text-foreground"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div
                ref={menuRef}
                role="menu"
                className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-background/95 p-2 text-sm shadow-2xl backdrop-blur"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/60"
                  onClick={() => {
                    onOpenPanel();
                    setMenuOpen(false);
                  }}
                >
                  Open Linkler
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/60"
                  onClick={() => {
                    const nextSize: WidgetSize = size === 'large' ? 'small' : 'large';
                    setSize(nextSize);
                    setMenuOpen(false);
                  }}
                >
                  {size === 'large' ? (
                    <>
                      <Minimize2 className="h-4 w-4" /> Use small size
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-4 w-4" /> Use large size
                    </>
                  )}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setIsVisible(false);
                    setMenuOpen(false);
                    setShowIntro(false);
                    if (isBrowser()) {
                      window.localStorage.setItem(STORAGE_KEYS.INTRO_SEEN, '1');
                    }
                  }}
                >
                  Hide Linkler
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

