'use client';

import {
  useState,
  useRef,
  useEffect,
  ReactNode,
  HTMLAttributes,
  createContext,
  useContext,
} from 'react';
import { createPortal } from 'react-dom';

/* =============================================================================
   TOOLTIP COMPONENT
   
   A lightweight tooltip for showing additional information on hover/focus.
   
   @example
   <Tooltip content="Delete this item">
     <IconButton aria-label="Delete">
       <Trash className="w-4 h-4" />
     </IconButton>
   </Tooltip>
============================================================================= */

type TooltipPosition = 'top' | 'right' | 'bottom' | 'left';

export interface TooltipProps {
  /** The content to show in the tooltip */
  content: ReactNode;
  /** Position of the tooltip relative to trigger */
  position?: TooltipPosition;
  /** Delay before showing tooltip (ms) */
  delayShow?: number;
  /** Delay before hiding tooltip (ms) */
  delayHide?: number;
  /** Whether the tooltip is disabled */
  disabled?: boolean;
  /** The trigger element */
  children: ReactNode;
}

interface TooltipState {
  isVisible: boolean;
  x: number;
  y: number;
}

function Tooltip({
  content,
  position = 'top',
  delayShow = 200,
  delayHide = 0,
  disabled = false,
  children,
}: TooltipProps) {
  const [state, setState] = useState<TooltipState>({
    isVisible: false,
    x: 0,
    y: 0,
  });
  const [isMounted, setIsMounted] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout>();
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setIsMounted(true);
    return () => {
      clearTimeout(showTimeoutRef.current);
      clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 8;

    let x = 0;
    let y = 0;

    switch (position) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - gap;
        break;
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.bottom + gap;
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - gap;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
      case 'right':
        x = triggerRect.right + gap;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
    }

    // Keep tooltip within viewport
    x = Math.max(8, Math.min(x, window.innerWidth - tooltipRect.width - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - tooltipRect.height - 8));

    setState((prev) => ({ ...prev, x, y }));
  };

  const show = () => {
    if (disabled) return;
    clearTimeout(hideTimeoutRef.current);
    showTimeoutRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, isVisible: true }));
    }, delayShow);
  };

  const hide = () => {
    clearTimeout(showTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, isVisible: false }));
    }, delayHide);
  };

  useEffect(() => {
    if (state.isVisible) {
      calculatePosition();
    }
  }, [state.isVisible]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline-flex"
      >
        {children}
      </span>
      {isMounted &&
        state.isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: 'fixed',
              left: state.x,
              top: state.y,
              zIndex: 'var(--z-tooltip, 1500)',
            }}
            className={`
              px-3 py-1.5 text-sm rounded-md
              bg-popover text-popover-foreground
              border border-border shadow-md
              animate-fade-in pointer-events-none
            `}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}

Tooltip.displayName = 'Tooltip';

export { Tooltip };
