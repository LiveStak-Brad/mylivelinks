'use client';

import { Radio, Users } from 'lucide-react';

type WatchMode = 'default' | 'live-only' | 'creator-only';

interface WatchModeIndicatorProps {
  mode?: WatchMode;
  className?: string;
}

/**
 * Watch Mode Indicator
 * 
 * NON-INTERACTIVE label showing current swipe mode.
 * This is NOT a clickable control - modes are switched via horizontal swipe.
 * 
 * Swipe behavior (not implemented yet):
 * - Swipe LEFT → RIGHT = Live Only mode
 * - Swipe RIGHT → LEFT = Creator Only mode
 * 
 * Only displays when mode !== 'default'.
 * UI only - no swipe logic wired.
 */
export function WatchModeIndicator({
  mode = 'default',
  className = '',
}: WatchModeIndicatorProps) {
  // Don't show anything in default mode
  if (mode === 'default') return null;

  const label = mode === 'live-only' ? 'LIVE ONLY' : 'CREATOR ONLY';
  const Icon = mode === 'live-only' ? Radio : Users;

  return (
    <div className={`watch-mode-label ${className}`} aria-live="polite">
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export default WatchModeIndicator;
