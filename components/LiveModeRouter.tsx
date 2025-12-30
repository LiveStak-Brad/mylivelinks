/**
 * LiveModeRouter Component
 * 
 * Wrapper component that routes to appropriate layout based on mode and platform.
 * 
 * Usage:
 * ```tsx
 * <LiveModeRouter mode="solo" />
 * <LiveModeRouter mode="battle" />
 * <LiveModeRouter /> // Auto-detect from URL params
 * ```
 */

'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useIsMobileWeb } from '@/hooks/useIsMobileWeb';
import { 
  getCurrentLayoutConfig, 
  type LiveSessionMode,
  type LiveLayoutConfig 
} from '@/lib/live-mode-router';
import LiveRoom from './LiveRoom';
import MobileWebWatchLayout from './mobile/MobileWebWatchLayout';

interface LiveModeRouterProps {
  mode?: LiveSessionMode;
  sessionData?: { mode?: string };
  // Pass through any LiveRoom props that consumers need
  [key: string]: any;
}

/**
 * ModeRouter: Routes between solo and battle layouts based on mode and platform
 */
export default function LiveModeRouter({
  mode: modeProp,
  sessionData,
  ...passThroughProps
}: LiveModeRouterProps) {
  const searchParams = useSearchParams();
  const isMobileWeb = useIsMobileWeb();
  
  // Determine layout configuration
  const layoutConfig: LiveLayoutConfig = useMemo(() => {
    // If mode is explicitly provided, use it
    if (modeProp) {
      return getCurrentLayoutConfig(
        undefined,
        { mode: modeProp },
        isMobileWeb ? 'mobile' : 'web'
      );
    }
    
    // Otherwise detect from URL and environment
    return getCurrentLayoutConfig(
      searchParams ?? undefined,
      sessionData,
      isMobileWeb ? 'mobile' : 'web'
    );
  }, [modeProp, searchParams, sessionData, isMobileWeb]);
  
  // Route to appropriate layout
  switch (layoutConfig.layoutStyle) {
    case 'tiktok-viewer':
      // Mobile solo mode - use MobileWebWatchLayout
      // This component already handles portrait, fullscreen, swipeable UI
      return <LiveRoom mode="solo" layoutStyle="tiktok-viewer" {...passThroughProps} />;
      
    case 'twitch-viewer':
      // Web solo mode - use standard LiveRoom with sidebar
      return <LiveRoom mode="solo" layoutStyle="twitch-viewer" {...passThroughProps} />;
      
    case 'battle-cameras':
      // Battle mode - cameras-only layout on ALL platforms
      return <LiveRoom mode="battle" layoutStyle="battle-cameras" {...passThroughProps} />;
      
    default:
      // Fallback to standard LiveRoom
      return <LiveRoom mode="solo" layoutStyle="twitch-viewer" {...passThroughProps} />;
  }
}

